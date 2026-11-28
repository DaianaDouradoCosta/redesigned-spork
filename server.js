const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const ADDRESS = process.env.TON_WALLET_ADDRESS || 'UQDbKXApnlM2kbvWEYrVecDq3LY8hXfrALM4Zdc5QReILmH7';
const SOLANA_ADDRESS = process.env.SOLANA_WALLET_ADDRESS || '8pU2czPZHQ4cyvEKrvDzXAYaCpttRVrRekMPqFGCv7nL';
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Dourado Crypto AI' }));
let lastTonFetch = 0;
let cachedTonData = null;
app.get('/api/ton', async (_req, res) => {
  if (cachedTonData && Date.now() - lastTonFetch < 15000) return res.json(cachedTonData);
  try {
    const base = 'https://tonapi.io/v2/accounts/' + encodeURIComponent(ADDRESS);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const [accountResponse, tokensResponse] = await Promise.all([
      fetch(base, { signal: controller.signal }),
      fetch(base + '/jettons', { signal: controller.signal })
    ]);
    clearTimeout(timeout);
    if (!accountResponse.ok || !tokensResponse.ok) return res.status(502).json({ error: 'A TONAPI não respondeu corretamente. Tente novamente mais tarde.' });
    const [account, jettons] = await Promise.all([accountResponse.json(), tokensResponse.json()]);
    const tokens = (jettons.balances || []).map(item => {
      const meta = item.jetton || {};
      const decimals = Math.max(0, Math.min(30, Number(meta.decimals ?? 9)));
      return { name: meta.name || meta.symbol || 'Token', symbol: meta.symbol || '', amount: Number(item.balance || 0) / (10 ** decimals) };
    });
    cachedTonData = { address: ADDRESS, ton: Number(account.balance || 0) / 1e9, tokens, updatedAt: new Date().toISOString() };
    lastTonFetch = Date.now();
    res.set('Cache-Control', 'no-store');
    res.json(cachedTonData);
  } catch (_error) {
    res.status(502).json({ error: 'Falha de conexão ao consultar a carteira TON.' });
  }
});
let lastSolanaFetch = 0;
let cachedSolanaData = null;
app.get('/api/solana', async (_req, res) => {
  if (cachedSolanaData && Date.now() - lastSolanaFetch < 20000) return res.json(cachedSolanaData);
  const rpc = async (method, params) => {
    const response = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'dourado-crypto-ai', method, params }),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error('RPC Solana indisponível');
    const payload = await response.json();
    if (payload.error) throw new Error('Erro retornado pela RPC Solana');
    return payload.result;
  };
  try {
    const [balance, legacy, token2022] = await Promise.all([
      rpc('getBalance', [SOLANA_ADDRESS, { commitment: 'confirmed' }]),
      rpc('getTokenAccountsByOwner', [SOLANA_ADDRESS, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed', commitment: 'confirmed' }]),
      rpc('getTokenAccountsByOwner', [SOLANA_ADDRESS, { programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' }, { encoding: 'jsonParsed', commitment: 'confirmed' }])
    ]);
    const accounts = [...(legacy.value || []), ...(token2022.value || [])];
    const tokens = accounts.map(entry => {
      const info = entry.account?.data?.parsed?.info;
      const amount = info?.tokenAmount || {};
      return { mint: info?.mint || '', amount: amount.uiAmountString ?? '0', decimals: amount.decimals ?? 0 };
    }).filter(token => token.mint && token.amount !== '0');
    cachedSolanaData = {
      address: SOLANA_ADDRESS,
      sol: balance.value / 1e9,
      tokens,
      tokenAccounts: accounts.length,
      updatedAt: new Date().toISOString()
    };
    lastSolanaFetch = Date.now();
    res.set('Cache-Control', 'no-store');
    res.json(cachedSolanaData);
  } catch (_error) {
    res.status(502).json({ error: 'Não foi possível consultar a carteira Solana agora. Tente novamente mais tarde.' });
  }
});
app.listen(PORT, () => console.log('Dourado Crypto AI na porta ' + PORT));
