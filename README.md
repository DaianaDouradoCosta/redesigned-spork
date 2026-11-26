# Dourado Crypto AI

Painel inicial de acompanhamento cripto, em português, com consulta pública somente leitura da carteira TON.

## Implantação no Render

1. Entre em https://render.com e escolha **New +** > **Blueprint**.
2. Conecte sua conta GitHub, se solicitado.
3. Escolha o repositório `DaianaDouradoCosta/redesigned-spork`.
4. O Render lerá `render.yaml`. Revise o serviço `dourado-crypto-ai` e clique em **Apply**.
5. Aguarde o deploy e abra o endereço HTTPS criado pelo Render.

## Desenvolvimento local

Requer Node.js 18 ou superior:

```bash
npm install
npm start
```

Abra http://localhost:3000.

## Segurança e limites

- Consulta pública somente leitura via TONAPI.
- Não pede seed phrase, chave privada, senha ou códigos.
- Não assina transações e não executa negociação, transferências ou saques.
- Binance, OKX, Bybit, Coinbase, Mercado Bitcoin e 1WIN ainda não estão integrados.
- Antes de integrar corretoras, usar chaves de API restritas a leitura, sem permissão de saque ou negociação, armazenadas apenas como variáveis secretas no servidor.
- A publicação neste repositório público torna o código visível. Não adicionar credenciais, arquivos .env ou dados privados.
