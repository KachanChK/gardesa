# Guia de Acoes Externas — Sistema de Creditos e AbacatePay

Este guia lista tudo o que **voce (America)** precisa fazer fora do codigo para o sistema funcionar. O codigo ja esta implementado; estes passos sao configuracao de banco, contas e ambiente.

## 1. Aplicar a migracao no banco (Neon)

Arquivo: `database/migrations/20260624_create_credits_subscriptions.sql`.

Ele cria as tabelas `subscription_plans`, `user_subscriptions`, `user_credit_balances`, `credit_transactions`, `payment_customers`, `payment_events` e ja insere os 4 planos (Free, Basico, Pro, Studio).

Aplique no Neon (via plugin Neon / console SQL / `psql`). Como uso o padrao do projeto (arquivos `.sql`), nao apliquei automaticamente — rode o conteudo do arquivo no seu banco.

> A migracao usa `INSERT ... ON CONFLICT DO NOTHING`, entao e seguro rodar mais de uma vez.

## 2. Criar conta e chaves na AbacatePay

No painel da AbacatePay voce precisa de **3 valores**:

| Variavel | O que e | Onde pegar |
| --- | --- | --- |
| `ABACATEPAY_API_KEY` | Chave de API (Bearer) | Painel AbacatePay > Integracao > API |
| `ABACATEPAY_PUBLIC_KEY` | Chave publica fixa usada para validar a assinatura HMAC do webhook | **Nao e gerada no painel.** E uma constante publicada na doc de webhooks (https://docs.abacatepay.com/pages/webhooks) — copie o valor da constante `ABACATEPAY_PUBLIC_KEY` mostrada no exemplo de codigo. Confirme se vale para devMode e producao. |
| `ABACATEPAY_WEBHOOK_SECRET` | Segredo que **voce escolhe** e coloca na URL do webhook (`?webhookSecret=...`) | Voce define (use um valor longo e aleatorio) |

> A assinatura HMAC e calculada em **base64** (nao hex) sobre o corpo cru, com a `ABACATEPAY_PUBLIC_KEY` — ja implementado assim em `src/services/abacatepay-webhook.ts`.

## 3. Definir variaveis de ambiente

Adicione em **`.env` (local)** e nas **Environment Variables da Vercel**:

```env
ABACATEPAY_API_KEY=...            # chave de API
ABACATEPAY_PUBLIC_KEY=...         # chave publica (HMAC do webhook)
ABACATEPAY_WEBHOOK_SECRET=...     # segredo que voce escolheu para a URL
ABACATEPAY_API_BASE_URL=https://api.abacatepay.com/v2   # opcional; confirme o host/versao na doc
CRON_SECRET=...                   # segredo aleatorio para proteger o cron
```

`APP_URL` e `DATABASE_URL` ja existem no projeto.

> **Importante na Vercel:** ao definir `CRON_SECRET`, a Vercel passa a enviar automaticamente o header `Authorization: Bearer <CRON_SECRET>` nas chamadas do cron. O endpoint so aceita a chamada com esse header.

## 4. Criar os produtos pagos na AbacatePay

Rode o script de setup **uma vez** (depois de configurar `ABACATEPAY_API_KEY` e `DATABASE_URL`):

```bash
npx ts-node-dev --transpile-only src/scripts/setup-abacatepay-products.ts
```

Ele cria os produtos `gardesa-basic-monthly`, `gardesa-pro-monthly`, `gardesa-studio-monthly` (ciclo MONTHLY) e grava o `provider_product_id` de cada plano em `subscription_plans`. E idempotente: planos que ja tem produto sao pulados.

> O plano Free **nao** tem produto no gateway (correto).

## 5. Registrar o webhook na AbacatePay

Cadastre um webhook apontando para:

```
https://SEU_APP_URL/webhooks/abacatepay?webhookSecret=ABACATEPAY_WEBHOOK_SECRET
```

- **secret** do webhook (no painel) = o mesmo valor da `ABACATEPAY_PUBLIC_KEY`? **Nao.** O `secret` da URL e o `ABACATEPAY_WEBHOOK_SECRET`. A assinatura HMAC do header `X-Webhook-Signature` e validada com a `ABACATEPAY_PUBLIC_KEY`. Garanta que os dois valores estao corretos no `.env`.
- **eventos** a assinar:
  - `subscription.completed`
  - `subscription.renewed`
  - `subscription.cancelled`
  - `checkout.completed` (para o fluxo Pix avulso)

## 6. Cron de reconciliacao (Vercel)

Ja adicionei em `vercel.json`:

```json
"crons": [{ "path": "/internal/cron/reconcile-credits", "schedule": "0 6 * * *" }]
```

Roda 1x por dia (funciona no plano free/Hobby da Vercel). Ele rebaixa para Free quem teve o ciclo vencido sem pagamento (Pix expirado, renovacao de cartao que falhou, ou cancelamento que chegou ao fim do periodo). So precisa do `CRON_SECRET` configurado na Vercel.

## 7. Ligar o sistema

O sistema interno (rotas `/member`) so fica ativo com `SYSTEM_ACCESS_ENABLED=true` (em producao o padrao e desligado/waitlist). Defina conforme sua estrategia de lancamento.

## 8. Pontos a confirmar com payloads reais (importante)

A documentacao resumida da AbacatePay nao detalha 100% os campos de cada evento e o formato exato de alguns endpoints. O codigo foi escrito de forma defensiva, mas **confirme estes pontos** no primeiro teste real (use o devMode/sandbox da AbacatePay):

1. **Formato dos `items`** no `POST /subscriptions/create` e `POST /checkouts/create`:
   - Cartao (assinatura): hoje envio `items: [{ id: provider_product_id, quantity: 1 }]`.
   - Pix (avulso): hoje envio item inline `{ externalId, name, price, quantity }`.
   - Se a API esperar outro formato, ajuste em `src/services/billing-service.ts`.
2. **Campo de fim de periodo** no payload de `subscription.completed/renewed` — o codigo procura `nextBilling` ou `current_period_end` (`src/services/abacatepay-webhook.ts`, funcao `handlePaidCycle`). Ajuste o nome se for diferente.
3. **Metadata** — confirmo `userId`/`planSlug` em `data.metadata` (com fallback para `externalId` no formato `userId:planSlug:timestamp`). Se a AbacatePay aninhar diferente, ajuste `extractMetadata`.
4. **`POST /subscriptions/cancel`** — envio `{ id }`. Confirme o corpo esperado.
5. **Resposta de checkout/assinatura** — leio `data.id` e `data.url`. Confirme os nomes.

Esses ajustes, se necessarios, ficam todos concentrados em `src/services/abacatepay.ts`, `billing-service.ts` e `abacatepay-webhook.ts`.

## Resumo do fluxo (para conferencia)

- **Usuario novo:** ao entrar em `/member`, recebe Free + 4 creditos (uma vez).
- **Render:** valida qualidade pelo plano, reserva creditos, gera; se a geracao falhar, **estorna** automaticamente.
- **Assinar (cartao):** assinatura recorrente; `subscription.completed`/`renewed` resetam os creditos do plano.
- **Assinar (Pix):** pagamento avulso; `checkout.completed` libera 1 mes; nao renova sozinho.
- **Upgrade:** cancela a assinatura atual e cria a nova; creditos e data de renovacao resetam na confirmacao.
- **Falha/cancelamento/expiracao:** nao renova creditos; cron rebaixa para Free ao fim do periodo.
