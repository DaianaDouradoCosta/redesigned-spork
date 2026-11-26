const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const ADDRESS = process.env.TON_WALLET_ADDRESS || 'UQDbKXApnlM2kbvWEYrVecDq3LY8hXfrALM4Zdc5QReILmH7';
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Dourado Crypto AI' }));
let lastFetch = 0;
let cachedData = null;
app.get('/api/ton', async (_req, res) => {
  if (cachedData && Date.now() - lastFetch < 15000) return res.json(cachedData);
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
    cachedData = { address: ADDRESS, ton: Number(account.balance || 0) / 1e9, tokens, updatedAt: new Date().toISOString() };
    lastFetch = Date.now();
    res.set('Cache-Control', 'no-store');
    res.json(cachedData);
  } catch (_error) {
    res.status(502).json({ error: 'Falha de conexão ao consultar a carteira TON.' });
  }
});
app.listen(PORT, () => console.log('Dourado Crypto AI na porta ' + PORT));
