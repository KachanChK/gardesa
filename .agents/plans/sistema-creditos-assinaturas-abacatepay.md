# Plano de Implementacao: Sistema de Creditos e Assinaturas com AbacatePay

## Resumo

Implementar um sistema de creditos em que o banco de dados Neon/Postgres seja a unica fonte da verdade. Os creditos serao consumidos ao gerar renders e renovados mensalmente para usuarios com assinatura paga ativa.

O fluxo sera dividido em tres etapas:

1. Construir a logica interna de creditos e planos na plataforma.
2. Integrar os planos pagos com o gateway AbacatePay.
3. Implementar renovacao mensal com webhooks e cron job de reconciliacao.

O frontend deve apenas exibir saldo, restricoes de qualidade e mensagens de upgrade. Toda validacao de saldo, plano, qualidade e consumo precisa acontecer no servidor.

## Etapa 1: Logica de Creditos na Plataforma

### Planos internos

Criar os planos no banco como registros locais em `subscription_plans`:

| Plano | Preco | Creditos | Renovacao | Qualidades |
| --- | ---: | ---: | --- | --- |
| Free | R$0 | 4 | Nao renova | HD |
| Basico | R$47/mes | 60 | Mensal | HD |
| Pro | R$89/mes | 160 | Mensal | HD, Full HD, 4K |
| Studio | R$147/mes | 320 | Mensal | HD, Full HD, 4K |

> **Mapeamento de qualidade (labels de UI x enum do codigo):** o enum atual em `src/services/render-config.ts` e `AI_RENDER_QUALITIES = ['1K', '2K', '4K']`. Os labels do plano mapeiam para: **HD = `1K`**, **Full HD = `2K`**, **4K = `4K`**. Toda validacao server-side usa o enum (`1K`/`2K`/`4K`); os labels HD/Full HD/4K servem apenas para exibicao.

Regras:

- Todo usuario sem assinatura paga deve estar no modo Free.
- O plano Free concede 4 creditos uma unica vez por usuario.
- O plano Free nao renova.
- Ao acabar os 4 creditos Free, o usuario nao pode gerar novos renders ate assinar um plano pago.
- O usuario nao deve passar por checkout nem selecao de plano ao se cadastrar; deve ir direto para a tela de gerar render com os 4 creditos disponiveis.
- Se uma assinatura paga for cancelada ou terminar, o usuario volta a ser Free, mas sem receber novo bonus de 4 creditos.

### Tabelas sugeridas

Criar uma migracao SQL com as tabelas:

- `subscription_plans`
  - Planos disponiveis, creditos concedidos, preco, qualidade permitida e identificadores do provedor (`provider_product_id`).
- `user_subscriptions`
  - Vinculo do usuario com o plano atual e a assinatura/ciclo no provedor. Deve guardar `payment_method` (`CARD`/`PIX`), `provider_subscription_id` (nulo para PIX avulso), `status` e `current_period_end` (necessario para expirar ciclos PIX).
- `user_credit_balances`
  - Saldo atual de creditos por usuario.
- `credit_transactions`
  - Historico completo de concessoes, consumos, estornos, resets e eventuais ajustes. Tipos: `free_grant`, `subscription_grant`, `consume`, `refund`, `adjustment`.
- `payment_customers`
  - Vinculo `user_id` -> `provider_customer_id`. Unico por `user_id`. **Nao** unico por CPF/CNPJ: dois usuarios com o mesmo CPF podem apontar para o mesmo `provider_customer_id`.
- `payment_events`
  - Registro idempotente dos eventos recebidos por webhook.

Constraints importantes:

- `user_credit_balances.balance >= 0`.
- `user_credit_balances` unico por `user_id` (upsert com `ON CONFLICT (user_id) DO NOTHING` na criacao automatica do Free, para evitar corrida).
- `credit_transactions.balance_after >= 0`.
- `credit_transactions.balance_after = balance_before + amount`.
- `credit_transactions.idempotency_key` unica.
- `payment_events(provider, event_id)` unico.
- `payment_customers.user_id` unico.
- Apenas uma assinatura/ciclo local **ativo** por usuario (indice unico parcial em `user_id WHERE status = 'active'`).

### Criacao automatica do Free

Ao primeiro acesso autenticado em `/member` ou `/member/render`:

1. Verificar se o usuario ja tem registro de saldo/plano.
2. Se nao tiver, criar assinatura local Free.
3. Criar saldo com 4 creditos.
4. Registrar transacao `free_grant` com idempotency key `free_grant:<user_id>`.

Esse fluxo tambem deve atender usuarios antigos que ja existem no Neon Auth, mas ainda nao possuem registros de creditos.

### Custo dos renders

Hoje **nao existe regra de custo no servidor** — o custo so esta escrito no frontend. Esta tabela formaliza no servidor a mesma regra que ja aparece na interface (1K = 2 creditos, 2K = 3 creditos, 4K = 5 creditos):

| Qualidade (enum) | Label UI | Custo |
| --- | --- | ---: |
| `1K` | HD | 2 creditos |
| `2K` | Full HD | 3 creditos |
| `4K` | 4K | 5 creditos |

O custo deve ser calculado sempre no servidor (constante/tabela em codigo, idealmente junto de `render-config.ts`). O frontend pode mostrar o custo, mas nao pode ser fonte de verdade. Se o valor do frontend divergir desta tabela, o servidor prevalece.

### Consumo atomico (reserva + estorno)

Regra de produto: **o credito so e efetivamente consumido quando o render conclui com sucesso.** Para garantir isso sem permitir gasto acima do saldo em geracoes concorrentes, usar o modelo **reserva-no-inicio + estorno-na-falha**, com guarda de duplicidade por render.

Fluxo no `POST /member/render/generate`, antes de chamar a Replicate:

1. Validar usuario autenticado.
2. Validar plano atual.
3. Validar se a qualidade escolhida e permitida pelo plano (server-side, ignorando o que o frontend enviou).
4. Calcular custo server-side a partir da tabela de custo.
5. **Guarda de duplicidade:** transicionar o render de `pending` para `processing` de forma atomica e condicional. Se o render ja estiver em `processing` ou `completed`, rejeitar a chamada (a geracao ja esta em andamento ou concluida) — isso bloqueia clicks/requests duplicados no backend, independente do botao do frontend.
6. **Reservar (debitar) os creditos** atomicamente, com `idempotency_key = consume:<renderId>`. Se a chave ja existir, nao debitar de novo (retry seguro). Registrar a transacao de consumo.
7. Somente depois executar a geracao do render.
8. **Em caso de falha** da Replicate, **estornar** os creditos atomicamente com `idempotency_key = refund:<renderId>` (transacao de credito positiva) e marcar o render como `failed`. Resultado liquido: o usuario so perde creditos quando o render sai com sucesso.

A reserva atomica (passo 6) e o que impede gasto acima do saldo em duas geracoes simultaneas; o estorno (passo 8) e o que entrega "so cobra no sucesso". As chaves `consume:<renderId>` e `refund:<renderId>` tornam ambos idempotentes mesmo com webhooks/retries.

Debito (reserva) protegido contra corrida:

```sql
UPDATE user_credit_balances
SET balance = balance - $2,
    updated_at = now()
WHERE user_id = $1
  AND balance >= $2
RETURNING balance;
```

Se nenhuma linha retornar, o saldo e insuficiente (responder `402`, ver abaixo). O frontend tambem deve desabilitar o botao de gerar enquanto a requisicao estiver em andamento, mas isso e apenas UX — a fonte da verdade contra duplicidade e a guarda de status do passo 5 + a idempotency key do passo 6.

### Respostas de bloqueio

Quando faltar credito, retornar `402` com payload estruturado:

```json
{
  "code": "INSUFFICIENT_CREDITS",
  "message": "Voce nao tem creditos suficientes para gerar este render.",
  "balance": 0,
  "requiredCredits": 2,
  "upgradeUrl": "/member/billing"
}
```

Quando o plano nao permitir a qualidade escolhida, retornar `403` com payload estruturado:

```json
{
  "code": "QUALITY_NOT_ALLOWED",
  "message": "Seu plano atual permite apenas renders em HD.",
  "allowedQualities": ["HD"],
  "upgradeUrl": "/member/billing"
}
```

## Etapa 2: UX e Integracao com AbacatePay

### Saldo no dashboard

Atualizar `src/views/partials/dashboard-header.ejs` para exibir o saldo de creditos a esquerda do nome/email do usuario.

Regras:

- Usar Tailwind.
- Nao criar CSS novo, salvo se realmente necessario.
- O saldo deve estar presente em todas as telas internas que usam o header.
- O valor deve vir do servidor, via `res.locals` ou dados passados no `render`.

### Seletor de qualidade

Na tela de render:

- Free e Basico:
  - qualidade travada em HD (`1K`);
  - seletor visualmente bloqueado;
  - usuario nao consegue alterar;
  - custo mostrado como 2 creditos;
  - servidor rejeita qualquer tentativa manual de enviar Full HD (`2K`) ou 4K (`4K`).
- Pro e Studio:
  - seletor desbloqueado;
  - usuario pode escolher HD (`1K`), Full HD (`2K`) ou 4K (`4K`);
  - custo do botao deve acompanhar a qualidade selecionada.

Botao de gerar:

- desabilitar o botao enquanto a requisicao estiver em andamento (evita duplo clique);
- isso e apenas UX — o backend continua sendo a fonte da verdade contra duplicidade (guarda de status `pending -> processing` + idempotency key `consume:<renderId>`, ver "Consumo atomico").

Quando os creditos acabarem (Free ou plano pago):

- exibir mensagem amigavel;
- informar saldo atual e custo da acao;
- mostrar CTA para `/member/billing`;
- nunca falhar silenciosamente nem mostrar erro tecnico.

### Rotas de billing

Criar rotas internas em `src/routes/member.ts`, como subrotas de `/member`:

- `GET /member/billing`
  - lista Basico, Pro e Studio;
  - mostra preco, creditos e qualidades;
  - destaca plano atual se houver.
- `POST /member/billing/checkout`
  - recebe `planSlug` e `paymentMethod` (`CARD` ou `PIX`) e o `taxId` (CPF/CNPJ) do usuario;
  - valida se e um plano pago ativo;
  - **bloqueia se o usuario ja tem assinatura paga ativa** (excecao: fluxo de upgrade, ver secao "Upgrade de plano"); nao pode existir mais de uma assinatura ativa por usuario;
  - cria ou reutiliza cliente AbacatePay (enviando `taxId`);
  - escolhe o fluxo conforme `paymentMethod`:
    - **`CARD` -> assinatura recorrente** via `POST /subscriptions/create`;
    - **`PIX` -> pagamento avulso mensal** via `POST /checkouts/create` (PIX nao e aceito em assinatura recorrente pela AbacatePay);
  - salva o registro local como pendente (assinatura para cartao; "ciclo avulso" para PIX);
  - redireciona para a URL de checkout retornada pela AbacatePay.

#### Dois fluxos de pagamento (importante)

A AbacatePay **so aceita cartao em assinatura recorrente**; PIX so existe em checkout avulso. Por isso ha dois caminhos:

| Metodo | Endpoint | Renovacao | Eventos de webhook |
| --- | --- | --- | --- |
| Cartao | `POST /subscriptions/create` | Automatica mensal | `subscription.completed`, `subscription.renewed`, `subscription.cancelled` |
| PIX | `POST /checkouts/create` | **Nao renova sozinho** | `checkout.completed` (1 ciclo) |

- **Cartao (assinatura real):** renova automaticamente; o webhook `subscription.renewed` reseta os creditos a cada ciclo pago.
- **PIX (avulso mensal):** cada pagamento PIX libera **1 mes** de creditos do plano. Ao fim do periodo, a "assinatura" simplesmente **nao renova**; o usuario volta a Free ate pagar um novo PIX. Para pagar de novo, ele passa por um novo checkout PIX (que pode inclusive ser de outro plano).
- O modelo local (`user_subscriptions`) deve guardar `provider` + `payment_method` + `current_period_end` para saber quando o ciclo PIX expira. O cron de reconciliacao (Etapa 3) e responsavel por rebaixar para Free quando um ciclo PIX vence sem novo pagamento.

### Configuracoes

Adicionar variaveis de ambiente:

```env
ABACATEPAY_API_KEY=
ABACATEPAY_API_BASE_URL=
ABACATEPAY_WEBHOOK_SECRET=
ABACATEPAY_PUBLIC_KEY=
APP_URL=
CRON_SECRET=
```

`ABACATEPAY_API_BASE_URL` mantem o host/versao da API configuravel (v2) em vez de hardcode.

### Client AbacatePay

Criar um client simples para a API v2 da AbacatePay:

- base URL da API **v2** (confirmar o host exato na doc oficial antes de codar; tratar como configuravel via env, nao hardcode espalhado);
- autenticacao por Bearer Token (`ABACATEPAY_API_KEY`);
- respostas tratadas pelo envelope da API;
- erros convertidos para mensagens internas seguras.

Endpoints usados:

- `POST /customers/create` (cliente; dedup do provedor e por CPF/CNPJ — ver nota abaixo);
- `POST /products/create` (setup idempotente dos produtos pagos);
- `POST /subscriptions/create` (assinatura recorrente, cartao);
- `POST /subscriptions/cancel` (cancelamento; tambem usado no upgrade);
- `POST /checkouts/create` (pagamento avulso PIX);
- `POST /webhooks/create` (registro do webhook com `secret`, se feito via API e nao pelo painel).

Nao usar `any` nos tipos TypeScript.

> **Nota sobre cliente x CPF/CNPJ:** na AbacatePay, `customers` sao unicos por CPF/CNPJ — criar um cliente com `taxId` ja existente **retorna o existente**. Isso e do provedor e nao podemos mudar. No nosso modelo, **a assinatura nao e unica por CPF/CNPJ**: duas contas locais diferentes com o mesmo CPF podem ter duas assinaturas. Consequencia pratica: a tabela `payment_customers` deve mapear **`user_id` -> `provider_customer_id`** (unico por `user_id`), e dois usuarios locais com o mesmo CPF podem apontar para o **mesmo** `provider_customer_id`. A unicidade de assinatura ativa e controlada por `user_id` no nosso banco, nao pelo cliente do provedor.

### Produtos pagos

Criar script ou rotina idempotente de setup dos produtos pagos na AbacatePay:

| Plano | externalId | Preco em centavos | Ciclo |
| --- | --- | ---: | --- |
| Basico | `gardesa-basic-monthly` | 4700 | MONTHLY |
| Pro | `gardesa-pro-monthly` | 8900 | MONTHLY |
| Studio | `gardesa-studio-monthly` | 14700 | MONTHLY |

Regras:

- O Free nao deve ter produto na AbacatePay.
- Antes de criar produto, tentar localizar por `externalId`.
- Se existir, reutilizar.
- Se nao existir, criar.
- Salvar o identificador do produto em `subscription_plans.provider_product_id`.

### Checkout de assinatura (cartao) e checkout avulso (PIX)

Em ambos os fluxos:

- associar exatamente **um** produto pago (a AbacatePay aceita apenas 1 item por checkout/assinatura);
- enviar o customer AbacatePay (com `taxId`);
- enviar `externalId` local;
- enviar metadata com `userId` e `planSlug` (e `paymentMethod`);
- definir URLs de retorno (`returnUrl`/`completionUrl`) com base em `APP_URL`.

Especifico por fluxo:

- **Cartao (`/subscriptions/create`):** `methods: ["CARD"]`. A assinatura recorrente nao aceita PIX.
- **PIX (`/checkouts/create`):** `methods: ["PIX"]`. Pagamento unico que vale 1 ciclo.

A primeira concessao de creditos pagos **nunca** acontece na criacao do checkout. Ela so acontece quando a AbacatePay confirmar o pagamento via webhook (`subscription.completed` para cartao, `checkout.completed` para PIX).

### Upgrade de plano (mid-cycle)

Politica do v1: **upgrade imediato com reset de ciclo** (a AbacatePay nao tem endpoint de upgrade nem proration, entao fazemos cancelar + recriar).

Fluxo quando um usuario com assinatura paga ativa escolhe um plano maior:

1. Confirmar que ha exatamente uma assinatura ativa e que o novo plano e diferente/maior.
2. **Cancelar** a assinatura atual no provedor (`POST /subscriptions/cancel`) e marca-la como cancelada localmente.
3. Criar a **nova** assinatura (cartao) ou checkout (PIX) do plano escolhido — cobranca cheia do novo plano agora.
4. Quando o pagamento do novo plano for confirmado via webhook: trocar o plano local, **resetar** o saldo para os creditos do novo plano (sem somar) e definir a **nova data de renovacao a partir da data do upgrade**.

Consequencias explicitas (decisao de produto):

- Nao ha proration: o usuario **perde os dias restantes ja pagos** do plano antigo.
- O ciclo de cobranca reinicia: a proxima renovacao conta a partir do upgrade, nao da data original.
- Os creditos do plano antigo sao descartados no reset (regra de nao acumulacao).

Downgrade e troca para plano menor ficam fora do v1 (o usuario cancela e assina o menor quando quiser).

## Etapa 3: Renovacao, Webhooks e Cron

### Webhook AbacatePay

Criar endpoint de webhook com raw body antes do `express.json()` (necessario para validar o HMAC sobre o corpo exato recebido).

A AbacatePay usa **duas camadas** de seguranca no webhook (confirmado na doc oficial). Aplicar ambas:

1. **Segredo na URL:** o endpoint e registrado como `.../webhook?webhookSecret=SEU_SECRET`. Validar que o `webhookSecret` recebido bate com `ABACATEPAY_WEBHOOK_SECRET`.
2. **Assinatura HMAC no header:** header `X-Webhook-Signature` = HMAC-SHA256 sobre o **raw body**. **Atencao:** a chave do HMAC e a `ABACATEPAY_PUBLIC_KEY` (chave publica fornecida pela AbacatePay), **nao** o `webhookSecret`. Comparar com `crypto.timingSafeEqual`.

```js
const expected = crypto.createHmac('sha256', process.env.ABACATEPAY_PUBLIC_KEY).update(rawBody).digest('hex')
// comparar com o header X-Webhook-Signature usando timingSafeEqual
```

Rejeitar com `401` se qualquer uma das duas camadas falhar.

Formato base de todo evento recebido (confirmado na doc):

```json
{ "id": "log_abc123xyz", "event": "checkout.completed", "apiVersion": 2, "devMode": false, "data": { } }
```

- `id` (`log_...`) = identificador unico da entrega -> usar como `event_id` em `payment_events`.
- `event` = nome do evento; `data` = payload especifico do evento.

Eventos relevantes (dois fluxos):

- Assinatura (cartao): `subscription.completed`, `subscription.renewed`, `subscription.cancelled`.
- PIX avulso: `checkout.completed` (libera 1 ciclo do plano).
- Falha de pagamento: tratar o evento correspondente da v2 (ex.: pagamento recusado / assinatura nao renovada) **sem** conceder creditos — ver secao "Falha de pagamento". Confirmar o nome exato do evento na secao "Eventos" da doc.

### Idempotencia

Todo webhook deve ser idempotente:

1. Extrair `event_id` = `id` do topo do payload (`log_...`).
2. Inserir em `payment_events(provider, event_id)`.
3. Se o evento ja existir, responder `200` sem repetir efeito (cobre redelivery da mesma entrega).
4. Processar o evento dentro de transacao.
5. Atualizar `payment_events.status` para `processed` ou `failed`.

> O dedup por `event_id` cobre **redelivery da mesma entrega**. Para evitar conceder o mesmo ciclo duas vezes por **caminhos diferentes** (webhook x cron), a concessao de creditos usa uma chave de negocio adicional, derivada do ciclo da assinatura (ver `subscription.renewed`).

### `subscription.completed`

Quando a assinatura for confirmada:

1. Localizar usuario por metadata ou external ID.
2. Localizar plano pelo produto/metadata.
3. Marcar assinatura local como ativa.
4. Trocar usuario para o plano pago.
5. Resetar saldo para os creditos mensais do plano.
6. Registrar transacao `subscription_grant`.

Regra de nao acumulacao:

- se o usuario tinha 2 creditos Free e assinou Basico, o saldo vira 60, nao 62;
- se assinou Pro, vira 160;
- se assinou Studio, vira 320.

### `checkout.completed` (PIX avulso)

Quando um pagamento PIX avulso for confirmado:

1. Localizar usuario por metadata (`userId`) ou `externalId`.
2. Localizar plano pelo `planSlug`/produto.
3. Marcar o ciclo PIX local como ativo e definir `current_period_end` = agora + 1 mes.
4. Trocar o usuario para o plano pago.
5. Resetar saldo para os creditos mensais do plano (mesma regra de nao acumulacao do `subscription.completed`).
6. Registrar transacao `subscription_grant` (ou `pix_cycle_grant`) com idempotency key baseada no id do checkout/cobranca do provedor (ver abaixo).

Importante: PIX **nao gera** `subscription.renewed`. A reconciliacao/expiracao do ciclo PIX e feita pelo cron.

### `subscription.renewed` (cartao)

Quando a renovacao mensal (cartao) for paga:

1. Confirmar assinatura ativa.
2. Derivar a `idempotency_key` combinando o **id da assinatura** com o **fim do periodo daquele ciclo** (`current_period_end`). Os dois vem do objeto de assinatura do provedor, entao tanto o webhook quanto o cron derivam a **mesma** chave.
3. Resetar saldo para o total mensal do plano.
4. Registrar transacao idempotente.

Exemplos:

- Plano Pro, saldo 40: saldo final 160.
- Plano Pro, saldo 160: saldo final 160.
- Plano Pro, saldo 180 por ajuste manual anterior: saldo final 160.

Chave idempotente:

```text
abacatepay:<subscription_id>:<current_period_end>
```

Por que combinar os dois: o `subscription_id` sozinho e **o mesmo todos os meses**, entao usa-lo isolado bloquearia a renovacao do mes seguinte. O `current_period_end` muda a cada ciclo, garantindo uma chave unica por mes que **nao depende** de qual caminho processou (webhook ou cron). **Confirmar na secao "Eventos" da doc o nome exato do campo** que carrega o fim do periodo no `data` do evento/assinatura (ex.: `current_period_end`, `nextBilling`, ou similar); se houver um id de cobranca/fatura por ciclo, ele tambem serve e e ainda mais explicito.

### `subscription.cancelled`

Quando assinatura for cancelada:

1. Marcar assinatura local como cancelada.
2. Ao fim do periodo pago, usuario volta para Free.
3. Nao conceder novamente os 4 creditos Free.
4. Bloquear renovacoes futuras.

Se a AbacatePay informar cancelamento imediato, aplicar o retorno para Free imediatamente. Se informar fim de ciclo, manter acesso pago ate `current_period_end`.

### Falha de pagamento (sem renovar creditos)

Regra: **creditos so sao renovados quando o pagamento e confirmado com sucesso.** Se uma renovacao de cartao falhar (cobranca recusada) ou um ciclo PIX vencer sem novo pagamento:

- **nao** resetar/renovar os creditos do usuario;
- manter o acesso pago apenas ate `current_period_end`;
- ao expirar o periodo sem novo pagamento confirmado, **rebaixar o usuario para Free** (sem reconceder o bonus de 4 creditos Free) e parar de tratar a assinatura como ativa.

O rebaixamento pode acontecer via evento de falha/cancelamento (cartao) ou via cron (PIX e casos em que o provedor nao emite evento). Em nenhum caso a falha de pagamento concede creditos.

### Cron de reconciliacao

Adicionar cron diario no `vercel.json`, por exemplo:

```json
{
  "path": "/internal/cron/reconcile-credits",
  "schedule": "0 6 * * *"
}
```

> **Vercel free tier (Hobby):** cron jobs estao disponiveis no plano gratuito — ate 100 por projeto, porem **no maximo 1 execucao por dia** e com precisao de hora (uma expressao `0 6 * * *` dispara entre 06:00 e 06:59). Isso atende a reconciliacao diaria. Se no futuro for preciso rodar com mais frequencia ou horario exato, sera necessario o plano Pro.

O endpoint deve:

- validar `Authorization: Bearer ${CRON_SECRET}`;
- buscar assinaturas/ciclos pagos locais ativos;
- consultar a AbacatePay para confirmar status e ciclo atual;
- detectar ciclos pagos (cartao) que ainda nao receberam creditos e aplicar a mesma funcao idempotente do webhook (cobre `subscription.renewed` perdido);
- detectar **ciclos PIX vencidos** (`current_period_end` no passado, sem novo pagamento) e **rebaixar para Free**;
- detectar assinaturas de cartao que o provedor reporta como canceladas/inadimplentes e rebaixar para Free ao fim do periodo.

O cron nao deve ter uma segunda implementacao de renovacao nem de rebaixamento. Ele deve chamar as mesmas funcoes de dominio usadas pelos webhooks (renovar e rebaixar), apenas reconciliando o estado.

## Testes e Validacoes

### Banco e dominio

- Migrações criam todas as tabelas e constraints.
- Saldo negativo e bloqueado pelo banco.
- `idempotency_key` duplicada nao duplica transacoes.
- Free e criado automaticamente no primeiro acesso autenticado.
- Free concede exatamente 4 creditos uma unica vez.
- Cancelar assinatura paga nao reconcede os 4 creditos Free.

### Consumo de creditos

- Render HD (`1K`) custa 2 creditos.
- Full HD (`2K`) custa 3 creditos.
- 4K (`4K`) custa 5 creditos.
- Dois renders simultaneos com saldo para apenas um permitem somente um debito.
- Saldo insuficiente retorna `402` com saldo, custo e `upgradeUrl`.
- Plano Free rejeita Full HD e 4K no servidor.
- Plano Basico rejeita Full HD e 4K no servidor.
- Pro e Studio aceitam HD, Full HD e 4K.
- Render que falha na Replicate **estorna** os creditos (saldo final = saldo inicial).
- Chamar `generate` duas vezes para o mesmo `renderId` debita no maximo uma vez (guarda de status + `consume:<renderId>`).

### UX

- Header mostra saldo em todas as telas internas.
- Usuario novo cai em `/member/render` com 4 creditos visiveis.
- Free e Basico mostram qualidade travada em HD.
- Pro e Studio mostram seletor desbloqueado.
- Quando acabam os creditos, a tela mostra CTA para assinar.

### AbacatePay

- Produtos pagos sao criados ou reutilizados por `externalId`.
- Free nao cria produto no gateway.
- Cartao usa `POST /subscriptions/create` com `methods: ["CARD"]`.
- PIX usa `POST /checkouts/create` com `methods: ["PIX"]`.
- Checkout envia `taxId` (CPF/CNPJ) ao criar/reutilizar o cliente.
- Dois usuarios locais com o mesmo CPF podem ter assinaturas independentes.
- Usuario com assinatura ativa nao consegue iniciar outro checkout (exceto upgrade).
- Checkout redireciona para a URL retornada pela AbacatePay.
- Assinatura/ciclo pendente local nao concede creditos antes do webhook.

### Webhooks e renovacao

- Webhook com assinatura HMAC invalida retorna `401`.
- Webhook duplicado retorna `200` e nao duplica creditos.
- `subscription.completed` (cartao) ativa assinatura e reseta saldo para o plano pago.
- `checkout.completed` (PIX) libera 1 ciclo e define `current_period_end`.
- `subscription.renewed` reseta saldo mensal sem acumular, com chave idempotente do id de cobranca do provedor.
- `subscription.cancelled` cancela assinatura sem novo bonus Free.
- Falha de pagamento (cartao recusado ou PIX vencido) nao renova creditos.
- Ciclo PIX vencido sem novo pagamento rebaixa o usuario para Free (via cron).
- Upgrade imediato: cancela a assinatura antiga, reseta saldo para o novo plano e a renovacao passa a contar da data do upgrade.
- Cron corrige renovacao perdida e expira ciclos PIX vencidos.
- Cron e webhook compartilham a mesma logica idempotente (renovar e rebaixar).

### Build

- Rodar `npm run build`.
- Corrigir erros TypeScript sem usar `any`.
- Garantir que os bundles client sejam gerados.

## Assumptions

- O bonus Free e unico por usuario.
- Usuarios sem assinatura paga sao sempre tratados como Free.
- Qualidade: HD = `1K`, Full HD = `2K`, 4K = `4K`. Free e Basico so HD; Pro e Studio HD/Full HD/4K.
- Creditos pagos nunca acumulam: a renovacao/upgrade reseta o saldo para o total do plano (nao soma o que sobrou).
- Creditos so sao consumidos quando o render conclui com sucesso; falha na Replicate estorna automaticamente (reserva + estorno idempotente).
- Creditos so sao renovados quando o pagamento e confirmado; falha de pagamento nao concede creditos.
- Cartao = assinatura recorrente; PIX = pagamento avulso mensal que nao renova sozinho.
- A assinatura nao e unica por CPF/CNPJ; a unicidade de assinatura ativa e por `user_id`.
- Upgrade no v1 = imediato com reset de ciclo (sem proration). Downgrade fica fora do v1.
- Todas as rotas novas ficam em `src/routes/`.
- Estilos novos devem usar Tailwind.
- Migrations/DDL durante o desenvolvimento podem usar o MCP/Neon Plugin; o **runtime** da aplicacao (debito, webhooks, cron, leituras) usa o `pg` Pool ja existente em `src/config/database.ts`, nao o MCP.
- Webhook (confirmado na doc): seguranca em duas camadas — `?webhookSecret=` na URL (= `ABACATEPAY_WEBHOOK_SECRET`) + header `X-Webhook-Signature` (HMAC-SHA256 do raw body com `ABACATEPAY_PUBLIC_KEY`); `event_id` = campo `id` do topo (`log_...`).
- Itens ainda a confirmar na secao "Eventos" da doc v2 antes de codar: host/versao exatos da API e o nome exato do campo de fim de periodo (`current_period_end`/`nextBilling`/etc.) no `data` dos eventos de assinatura.
