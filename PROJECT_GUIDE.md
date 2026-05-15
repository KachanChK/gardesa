# PROJECT_GUIDE.md

Guia tecnico do projeto Gardesa. Este documento descreve o funcionamento atual do sistema e deve ser consultado antes de novas alteracoes.

## 1. Visao geral do projeto

A Gardesa e uma aplicacao web para paisagistas. O projeto combina uma landing page publica com lista de espera e um dashboard administrativo ainda sem autenticacao, focado em:

- cadastro e manutencao local de clientes;
- cadastro dos dados da empresa/prestador;
- criacao, edicao, preview e exportacao de orcamentos em PDF;
- pagina inicial de dashboard com metricas e dados demonstrativos;
- captura de emails para waitlist via PostgreSQL e envio de email de confirmacao via Resend.

O fluxo de dashboard usa dados seedados no servidor e persistencia no navegador via `localStorage`. O banco de dados, no codigo atual, e usado apenas para a waitlist da landing page.

## 2. Stack utilizada

Principais tecnologias identificadas:

- Node.js com TypeScript.
- Express 5 para servidor HTTP, middlewares e rotas.
- EJS para renderizacao server-side de paginas e partials.
- JavaScript vanilla no frontend, sem framework SPA.
- Tailwind CSS 4 via CLI, com tema definido em `public/css/styles.css` e saida gerada em `public/css/output.css`.
- PostgreSQL via pacote `pg`.
- Resend para contatos/email da waitlist.
- Puppeteer para gerar PDF de orcamentos a partir de HTML.
- Helmet para headers de seguranca, com CSP desabilitada.
- express-rate-limit para limitar submissao da waitlist.
- validator para validacao de email e dados da empresa.
- dotenv para carregar variaveis de ambiente.
- cookie-parser registrado no servidor, embora cookies nao sejam usados em fluxos de autenticacao no codigo atual.

Ferramentas de desenvolvimento:

- `typescript`
- `ts-node-dev`
- tipos `@types/*`
- `@tailwindcss/cli`

## 3. Estrutura de pastas

Estrutura principal:

```text
.
+-- .env
+-- .env.example
+-- .gitignore
+-- package.json
+-- package-lock.json
+-- tsconfig.json
+-- dist/
+-- public/
|   +-- css/
|   |   +-- styles.css
|   |   +-- output.css
|   +-- fonts/
|   +-- img/
|   |   +-- icons/
|   +-- js/
+-- src/
|   +-- config/
|   +-- middlewares/
|   +-- mock/
|   +-- routes/
|   +-- services/
|   +-- views/
|       +-- partials/
+-- tmp/
```

Funcao das principais partes:

- `src/server.ts`: ponto de entrada do servidor Express. Configura middlewares globais, arquivos estaticos, EJS, rotas principais e listener HTTP.
- `src/config/database.ts`: cria o pool PostgreSQL usando `DATABASE_URL`.
- `src/config/resend.ts`: instancia o cliente Resend usando `RESEND_API_KEY`.
- `src/middlewares/rateLimit.ts`: define rate limit especifico da waitlist.
- `src/routes/`: concentra os handlers HTTP. Nao ha camada separada de controllers.
- `src/services/`: contem servicos reutilizaveis de banco/validacao/regra de negocio.
- `src/mock/orcamentos.ts`: tipos TypeScript e dados seedados para clientes, empresa, orcamentos e opcoes de formulario.
- `src/views/`: templates EJS de paginas.
- `src/views/partials/`: partials EJS compartilhados e template do PDF de orcamento.
- `public/js/`: scripts de frontend carregados diretamente pelas paginas EJS.
- `public/css/styles.css`: entrada do Tailwind, fontes e tokens do tema.
- `public/css/output.css`: CSS compilado pelo Tailwind.
- `public/fonts/`: familia de fontes `NeulisAlt`.
- `public/img/`: imagens, favicon e icones SVG usados nas paginas.
- `dist/`: saida compilada do TypeScript. E gerada por `npm run build` e esta no `.gitignore`.
- `tmp/`: artefatos temporarios de validacao, capturas e PDFs. Esta no `.gitignore`.

Arquivos/pastas de banco, migrations ou ORM nao foram identificados no projeto.

## 4. Arquitetura do sistema

A arquitetura atual e uma aplicacao Express server-rendered com JavaScript progressivo no navegador.

Camadas existentes:

- Servidor HTTP: `src/server.ts`.
- Rotas/handlers: arquivos em `src/routes/*.ts`.
- Servicos de dominio/infra: arquivos em `src/services/*.ts` e `src/config/*.ts`.
- Views server-side: arquivos EJS em `src/views`.
- Frontend interativo: arquivos em `public/js`, manipulando DOM e `localStorage`.
- Assets estaticos: `public/css`, `public/img`, `public/fonts`.

Organizacao das responsabilidades:

- `server.ts` registra middlewares, rotas e configuracoes globais.
- Cada arquivo de rota expoe um `Router` do Express e mistura handler HTTP com funcoes auxiliares locais quando a regra e especifica daquela rota.
- Regras reutilizadas ficam em `services`, como waitlist e perfil da empresa.
- Dados estruturais de orcamento, cliente e empresa ficam tipados em `src/mock/orcamentos.ts`.
- As paginas EJS montam a estrutura HTML e injetam seeds serializados em variaveis globais (`window.__ORCAMENTOS_SEED__`, `window.__CLIENTES_SEED__`, `window.__EMPRESA_SEED__`).
- O frontend usa seletores `data-*` para encontrar elementos e renderizar listas, modais, formularios e estados.

Nao ha, no estado atual:

- framework frontend como React/Vue/Svelte;
- API REST completa para CRUD persistido em banco;
- ORM;
- camada formal de controllers;
- camada formal de models persistentes;
- schemas/migrations versionados;
- middleware de autenticacao;
- sistema de permissoes.

## 5. Fluxo da aplicacao

### Landing page e waitlist

1. Usuario acessa `GET /`.
2. O servidor chama `getWaitlistCount()` em `src/services/waitlist.ts`.
3. A view `src/views/landing.ejs` e renderizada com `waitlistCount`, `waitlistSucesso` e `waitlistErro`.
4. Usuario envia email pelo formulario `POST /waitlist`.
5. A rota aplica `waitlistRateLimit`, normaliza e valida o email com `validator`.
6. O email e inserido na tabela `waitlist`.
7. Se `RESEND_AUDIENCE_ID` existir, o contato e adicionado a uma audience do Resend.
8. Um email de confirmacao e enviado via Resend.
9. A landing e renderizada novamente com sucesso ou erro.

### Dashboard

O dashboard e acessado por rotas publicas:

- `GET /inicio`
- `GET /orcamentos`
- `GET /clientes`
- `GET /empresa`

O layout de dashboard usa:

- `src/views/partials/dashboard-sidebar.ejs`
- `src/views/partials/dashboard-header.ejs`
- `public/js/dashboard-shell.js`

### Clientes

1. `GET /clientes` renderiza `src/views/clientes.ejs`.
2. O servidor injeta clientes seedados de `budgetSeedPayload.clients`.
3. `public/js/clientes-store.js` carrega/salva clientes em `localStorage` na chave `gardesa:orcamentos:clients:v1`.
4. `public/js/clientes.js` renderiza tabela/lista mobile, busca, paginacao, modal de cadastro/edicao e modal de exclusao.
5. O cadastro/edicao/exclusao de clientes nao chama backend; fica no navegador.

### Empresa

1. `GET /empresa` renderiza `src/views/empresa.ejs`.
2. O servidor injeta `defaultCompanyProfile` e limites (`COMPANY_PROFILE_LIMITS`).
3. `public/js/empresa-store.js` carrega/salva o perfil em `localStorage` na chave `gardesa:empresa:profile:v1`.
4. Existe migracao local da chave antiga `gardesa:orcamentos:profile:v1`.
5. `public/js/empresa.js` valida no frontend, envia `POST /empresa/validate` para validacao server-side e salva o resultado normalizado no navegador.
6. Logo pode ser uma URL local em `/img/` ou data URL PNG/JPEG validada e limitada a 1 MB.

### Orcamentos

1. `GET /orcamentos` renderiza `src/views/orcamentos.ejs`.
2. O servidor injeta `budgetSeedPayload` serializado.
3. `public/js/orcamentos.js` carrega perfil, clientes e orcamentos do `localStorage` ou dos seeds.
4. O usuario cria, edita, remove, reordena itens, altera status, define validade, formas de pagamento, observacoes e total manual.
5. Alteracoes sao salvas com debounce no `localStorage`.
6. Preview chama `POST /orcamentos/preview`, enviando `profile`, `client` e `budget` em JSON.
7. O servidor normaliza/sanitiza os dados, renderiza `src/views/partials/orcamentos-pdf.ejs` e devolve HTML para um `iframe`.
8. Exportacao chama `POST /orcamentos/export`, que renderiza o mesmo HTML, abre Puppeteer headless, gera PDF A4 e retorna o arquivo para download.

## 6. Banco de dados

Banco utilizado:

- PostgreSQL via pacote `pg`.
- Pool definido em `src/config/database.ts`.
- Connection string lida de `DATABASE_URL`.

Uso identificado:

- `src/services/waitlist.ts`
  - `SELECT public.get_waitlist_count() AS count`
  - `INSERT INTO waitlist (email) VALUES ($1)`

Objetos de banco esperados pelo codigo:

- tabela `waitlist`, com pelo menos a coluna `email`;
- constraint unica em `waitlist.email` ou equivalente, pois o codigo trata erro PostgreSQL `23505`;
- funcao `public.get_waitlist_count()` retornando a contagem da waitlist.

Nao identificado no projeto:

- migrations SQL;
- schema formal do banco;
- seeds de banco;
- ORM;
- models persistentes;
- repositorios separados;
- queries alem da waitlist;
- configuracao de SSL do PostgreSQL;
- scripts para criar tabela `waitlist` ou funcao `public.get_waitlist_count()`.

Dados de clientes, empresa e orcamentos no dashboard nao sao persistidos no PostgreSQL no estado atual. Eles ficam no `localStorage` do navegador.

## 7. Autenticacao e autorizacao

Autenticacao nao foi identificada no projeto atual.

Observacoes:

- As rotas `/inicio`, `/orcamentos`, `/clientes` e `/empresa` estao publicas.
- A landing exibe botoes "Acessar" e "Criar conta", mas eles apontam para `/` e usam estilo de cursor desabilitado.
- `cookie-parser` esta registrado, mas nao ha login, sessao, JWT ou cookies de autenticacao implementados.
- `bcryptjs` e `jsonwebtoken` estao instalados, mas nao ha uso identificado no codigo.
- Nao foram identificadas roles, permissoes ou autorizacao por usuario.

Ao implementar autenticacao futuramente, sera necessario proteger as rotas de dashboard e revisar o armazenamento atual em `localStorage`, pois hoje qualquer visitante pode acessar o dashboard e manipular os dados locais.

## 8. Padroes de codigo

### Nomeacao de arquivos

- Backend TypeScript usa arquivos em kebab-case quando o nome tem mais de uma palavra, por exemplo `company-profile.ts` e `rateLimit.ts` como excecao camelCase existente.
- Rotas usam nomes por dominio: `waitlist.ts`, `orcamentos.ts`, `clientes.ts`, `empresa.ts`.
- Scripts publicos usam dominio ou responsabilidade: `orcamentos.js`, `clientes-store.js`, `dashboard-shell.js`.
- Views EJS usam nomes das paginas: `landing.ejs`, `inicio.ejs`, `orcamentos.ejs`, `clientes.ejs`, `empresa.ejs`.

### Organizacao de funcoes

- Handlers principais aparecem no topo dos arquivos de rota.
- Funcoes auxiliares ficam abaixo dos handlers no mesmo arquivo quando sao especificas daquele fluxo.
- Validacoes e normalizacoes reutilizadas ficam em `services`, como `company-profile.ts`.
- No frontend, cada arquivo registra `DOMContentLoaded`, coleta elementos em um objeto `elements`, mantem estado em `state`, chama `bindEvents()` e renderiza a tela.

### Separacao de responsabilidades

- EJS monta a estrutura inicial e injeta seeds.
- JavaScript publico controla interacao, estado local e chamadas pontuais ao backend.
- Backend valida dados enviados para waitlist, empresa e PDF.
- PDF tem template proprio em `src/views/partials/orcamentos-pdf.ejs`.

### Padroes de componentes/views

- O dashboard compartilha sidebar e header via partials.
- A navegacao recebe `navItems` definidos dentro de cada view.
- Elementos interativos sao marcados com atributos `data-*`.
- Modais ficam no final das views e sao controlados por classes Tailwind.
- O estilo privilegia cards com `rounded-[8px]`, bordas `#e2e2e2`, fundo branco, fonte `NeulisAlt`, tokens `verde`, `azul`, `laranja`, `preto` e `branco`.

### Padroes de rotas

- Cada rota exporta `default router`.
- `server.ts` importa e registra os routers sem prefixo global.
- Rotas HTML usam `res.render`.
- Endpoints auxiliares usam JSON ou HTML conforme necessidade:
  - `/empresa/validate` retorna JSON.
  - `/orcamentos/preview` retorna HTML.
  - `/orcamentos/export` retorna PDF.

### Padroes de validacao

- Waitlist: normalizacao e validacao com `validator.normalizeEmail` e `validator.isEmail`.
- Empresa: validacao duplicada de forma intencional no frontend (`empresa-store.js`) e no backend (`company-profile.ts`).
- Orcamentos: frontend e backend aplicam limites de tamanho, valores maximos e normalizacao de moeda/quantidade.
- Logo da empresa: somente PNG/JPEG, validacao por MIME/extensao/assinatura base64 e limite de 1 MB.

### Padroes de tratamento de erros

- Waitlist diferencia email duplicado (`23505`) de erro generico.
- Erros de banco e email sao logados no servidor.
- Falha ao adicionar contato no Resend nao impede sucesso da waitlist.
- Preview/exportacao de orcamento retornam 500 em falhas.
- Frontend usa mensagens inline em formularios principais e `window.alert` em alguns fluxos de orcamento.

### Padroes de comunicacao com banco/APIs

- Banco: queries parametrizadas via `db.query`.
- Resend: chamado diretamente dentro da rota de waitlist.
- Frontend/backend:
  - forms tradicionais para waitlist;
  - `fetch` com JSON para empresa e orcamentos.

## 9. Como criar novas funcionalidades

Para manter a arquitetura atual:

1. Identifique o dominio da feature (`clientes`, `empresa`, `orcamentos`, `waitlist` ou novo dominio).
2. Se precisar de nova pagina, crie uma view EJS em `src/views` e registre uma rota em `src/routes`.
3. Se a pagina fizer parte do dashboard, reutilize `dashboard-sidebar.ejs`, `dashboard-header.ejs`, `dashboard-shell.js` e o padrao de `navItems`.
4. Para interacao no navegador, crie ou estenda um arquivo em `public/js` usando seletores `data-*`, objeto `elements`, objeto `state`, `bindEvents` e funcoes de renderizacao.
5. Para regras reutilizaveis ou validacoes server-side, coloque em `src/services`.
6. Para endpoints, mantenha validacao server-side mesmo quando ja houver validacao no frontend.
7. Para dados persistidos em banco, crie uma estrategia de schema/migration antes de adicionar queries. Hoje essa estrutura nao existe.
8. Para novas variaveis de ambiente, atualize `.env.example` com valores seguros e documente neste guia.
9. Para novas dependencias, confirme se realmente sao necessarias e remova dependencias antigas nao usadas em uma tarefa separada.
10. Se a feature exigir autenticacao/permissoes, implemente isso antes de expor dados sensiveis no dashboard.

Evite:

- misturar segredos no frontend;
- confiar apenas em `localStorage` para dados que precisam ser compartilhados entre usuarios/dispositivos;
- adicionar queries de banco sem migrations documentadas;
- alterar `public/css/output.css` manualmente; edite `public/css/styles.css` e rode o build do Tailwind;
- duplicar grandes blocos de layout quando um partial resolver.

## 10. Como rodar o projeto

### Instalar dependencias

```bash
npm install
```

### Configurar ambiente

Crie `.env` a partir de `.env.example` e preencha os valores reais:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Importante: `DATABASE_URL` e `RESEND_API_KEY` sao obrigatorias no startup atual, porque seus modulos sao importados quando o servidor inicia.

### Desenvolvimento

Em um terminal, rode o servidor:

```bash
npm run dev
```

Em outro terminal, rode o watcher do Tailwind se for alterar estilos:

```bash
npm run tailwind
```

Servidor padrao:

```text
http://localhost:3000
```

ou a porta configurada em `PORT`.

### Build

```bash
npm run build
```

Esse comando:

- compila TypeScript de `src` para `dist`;
- gera `public/css/output.css` a partir de `public/css/styles.css`.

### Producao

Depois do build:

```bash
npm start
```

Atencoes para producao:

- `npm start` executa `node dist/server.js`.
- O servidor compilado ainda referencia `../public` e `../src/views`, portanto `public/` e `src/views/` precisam estar disponiveis no ambiente de execucao.
- Puppeteer pode exigir dependencias de sistema ou configuracao especifica conforme o provedor de hospedagem.
- Garanta que `DATABASE_URL` e `RESEND_API_KEY` existam no ambiente.

### Testes

Nao foram identificados scripts de teste no `package.json`.

## 11. Variaveis de ambiente

Variaveis encontradas em `.env.example`:

```env
PORT=3000
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
RESEND_API_KEY=re_xxxx
RESEND_FROM=Gardesa <oi@gardesa.com.br>
APP_URL=https://gardesa.com.br
```

Variaveis referenciadas no codigo:

- `PORT`: porta HTTP do Express. Se ausente, usa `3000`.
- `DATABASE_URL`: connection string PostgreSQL. Obrigatoria no startup.
- `RESEND_API_KEY`: chave da API Resend. Obrigatoria no startup.
- `RESEND_AUDIENCE_ID`: opcional no codigo; se existir, adiciona o email da waitlist a uma audience do Resend. Nao esta em `.env.example`.

Variaveis presentes no exemplo, mas sem uso identificado no codigo atual:

- `RESEND_FROM`: o envio atual usa remetente hardcoded `Gardesa <waitlist@gardesa.com.br>`.
- `APP_URL`: nao foi identificado uso no codigo.

Nunca exponha valores reais de `.env` em documentacao, frontend, logs publicos ou commits.

## 12. Pontos de atencao

- Autenticacao ausente: dashboard esta publico.
- Persistencia do dashboard em `localStorage`: dados nao sincronizam entre dispositivos, usuarios ou navegadores.
- Banco sem migrations versionadas: a tabela `waitlist` e a funcao `public.get_waitlist_count()` sao dependencias implicitas.
- Startup depende de `DATABASE_URL` e `RESEND_API_KEY`, mesmo para acessar telas que nao usam diretamente banco ou email.
- Resend tem `RESEND_AUDIENCE_ID` opcional referenciado, mas nao documentado no `.env.example`.
- Envio da waitlist usa remetente hardcoded e nao `RESEND_FROM`.
- `helmet` esta ativo, mas `contentSecurityPolicy` esta desabilitada.
- Nao ha protecao CSRF identificada para formularios/endpoints.
- `POST /orcamentos/export` usa Puppeteer e pode consumir memoria/CPU; os limites de payload e de itens ajudam, mas o endpoint segue publico.
- Logos em base64 sao salvas no `localStorage`; manter o limite de 1 MB.
- O template de 404 e renderizado em `server.ts`, mas `src/views/404.ejs` nao foi encontrado.
- Dependencias nao usadas podem indicar funcionalidades planejadas, mas tambem aumentam superficie de manutencao.
- A fonte e os tokens do tema estao centralizados em `public/css/styles.css`; nao editar `output.css` manualmente.

## 13. Recomendacoes futuras

- Criar migrations SQL para a waitlist, incluindo tabela, constraint unica e funcao `public.get_waitlist_count()`.
- Adicionar `RESEND_AUDIENCE_ID` ao `.env.example` como opcional, ou remover o trecho se nao for usado.
- Usar `RESEND_FROM` no envio de email, ou remover a variavel do exemplo.
- Criar `src/views/404.ejs` ou alterar o handler 404 para uma resposta existente.
- Implementar autenticacao antes de transformar dashboard em area real de usuario.
- Se clientes/orcamentos/empresa precisarem persistir de verdade, mover CRUD para backend e PostgreSQL com validacao e autorizacao.
- Adicionar testes para validacoes criticas: waitlist, perfil da empresa, normalizacao de orcamento e geracao de PDF.
- Considerar CSP adequada quando os scripts/estilos estiverem prontos para isso.
- Revisar dependencias nao usadas em uma tarefa dedicada para reduzir peso e manutencao.
