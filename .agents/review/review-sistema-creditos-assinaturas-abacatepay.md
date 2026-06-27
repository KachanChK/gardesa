# Review da implementacao: creditos, assinaturas e AbacatePay

Branch revisada: `feature/creditos-gateway`
Plano base: `.agents/plans/sistema-creditos-assinaturas-abacatepay.md`

## Resumo

Encontrei algumas inconsistencias que podem comprometer o funcionamento esperado do sistema de creditos e assinaturas. A checagem TypeScript passou com `npx tsc --noEmit`, e o `git diff --check` nao apontou erro alem dos avisos de LF/CRLF ja existentes no working tree.

Tambem conferi as docs oficiais da AbacatePay para os pontos sensiveis de webhook e checkout:

- Webhook: `X-Webhook-Signature` e HMAC-SHA256 do raw body em base64.
- Checkout: `items` deve referenciar produto existente por `id` e `quantity`.
- Produtos: produtos precisam existir antes de criar checkouts/assinaturas.

Usei o Neon MCP em modo leitura e o schema publico atual ainda tem apenas `ai_renders` e `waitlist`, entao as tabelas de creditos dependem integralmente da nova migracao.

## Achados

### P0 - Webhooks validos da AbacatePay devem ser rejeitados por formato de assinatura incorreto

Arquivo: `src/services/abacatepay-webhook.ts:29-38`
Arquivo: `src/routes/abacatepay.ts:11-20`

A implementacao calcula a assinatura esperada com `.digest('hex')`, mas a documentacao oficial da AbacatePay mostra `X-Webhook-Signature` como assinatura em base64. Com isso, um webhook real e valido tende a retornar `401`, impedindo `subscription.completed`, `checkout.completed` e `subscription.renewed` de ativarem assinaturas ou liberarem creditos.

Impacto esperado: usuarios pagam, mas a aplicacao nao recebe/aceita a confirmacao do pagamento; creditos pagos nao sao liberados.

Referencia: https://docs.abacatepay.com/pages/webhooks/security

### P0 - Checkout PIX envia item em formato incompativel com a API de checkout

Arquivo: `src/services/billing-service.ts:129-140`

No fluxo PIX, o `createCheckout` recebe `items` com `externalId`, `name`, `price` e `quantity`. A documentacao da AbacatePay para `/checkouts/create` exige itens com `id` do produto e `quantity`; o proprio fluxo de cartao ja usa `plan.provider_product_id` em `src/services/billing-service.ts:112-116`.

Impacto esperado: checkout PIX pode falhar na criacao ou nao associar corretamente o produto/plano, bloqueando pagamentos via PIX.

Referencia: https://docs.abacatepay.com/pages/payment/create

### P1 - Evento de webhook pode ficar perdido para sempre depois de falha ou queda entre registro e processamento

Arquivo: `src/services/abacatepay-webhook.ts:48-64`
Arquivo: `src/services/credits-repository.ts:438-458`

O evento e inserido em `payment_events` antes do processamento. Se o processo cair depois do insert e antes do `dispatchEvent`, ou se o processamento marcar o evento como `failed`, qualquer retry com o mesmo `event_id` cai em `!isNew` e retorna sem tentar processar novamente.

Impacto esperado: um pagamento confirmado pode nunca liberar creditos se houver falha transiente no processamento do webhook. A idempotencia protege contra duplicidade, mas tambem bloqueia a recuperacao de eventos `received`/`failed`.

O comportamento mais seguro seria ignorar apenas eventos ja `processed`, e permitir reprocessamento controlado de eventos `received` ou `failed`, idealmente dentro de uma transacao/lock.

### P2 - `generate` nao garante criacao do plano Free antes de reservar creditos

Arquivo: `src/routes/member.ts:211-240`
Arquivo: `src/services/credits-service.ts:50-90`
Arquivo: `src/services/credits-repository.ts:112-144`

`ensureUserCreditSetup` so e chamado por `getCreditSummary`, usado nas paginas GET com header. O endpoint `POST /member/render/generate` chama `ensureRenderQualityAllowed` e depois `reserveCreditsForRender`, mas esse caminho nao cria o bonus Free. Em acesso normal pela tela, o GET de `/member/render` deve criar o Free antes. Em chamada direta/edge case, um usuario novo pode terminar com saldo 0 e receber `402`, em vez dos 4 creditos iniciais.

Impacto esperado: inconsistencia na regra "usuario sem assinatura paga recebe Free com 4 creditos uma unica vez", dependendo do caminho pelo qual o endpoint e chamado.

### P2 - Variaveis de ambiente novas nao foram adicionadas ao `.env.example`

Arquivo: `.env.example`
Arquivos que dependem delas: `src/services/abacatepay.ts`, `src/services/abacatepay-webhook.ts`, `src/routes/abacatepay.ts`, `src/services/billing-service.ts`

O plano pede `ABACATEPAY_API_KEY`, `ABACATEPAY_API_BASE_URL`, `ABACATEPAY_WEBHOOK_SECRET`, `ABACATEPAY_PUBLIC_KEY`, `APP_URL` e `CRON_SECRET`. O `.env.example` atual nao lista as variaveis novas da AbacatePay nem `CRON_SECRET`.

Impacto esperado: deploy/configuracao incompleta quebra checkout, validacao de webhook ou cron sem ficar obvio para quem configurar o ambiente.

## Pontos que parecem OK

- O raw body do webhook foi montado antes de `express.json()`, em `src/createApp.ts:19-23`, o que e necessario para validar HMAC.
- A reserva de creditos usa `UPDATE ... WHERE balance >= amount RETURNING`, evitando saldo negativo em concorrencia.
- O TypeScript passou com `npx tsc --noEmit`.
- `git diff --check` nao retornou erros de whitespace, apenas avisos de conversao LF/CRLF.

## Conclusao

Eu nao aprovaria a branch para producao antes de corrigir pelo menos os dois P0. Do jeito atual, o fluxo de pagamento pode falhar tanto na entrada do PIX quanto na confirmacao por webhook, que sao justamente os caminhos que liberam creditos pagos.
