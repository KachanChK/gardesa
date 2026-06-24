# DESIGN.md

Guia visual e de branding da Gardesa. Este documento resume os padroes observados na landing page, nos assets da marca e no shell do dashboard, para orientar novas paginas e componentes.

## Essencia da marca

Gardesa e uma plataforma para arquitetos, paisagistas e designers de interiores. O visual deve parecer simples, profissional e vivo: tecnologia util, sem frieza corporativa. A marca fala com quem quer gerar renders mais realistas em menos tempo, mesmo não tendo um computador extremamente pontente.

Direcao visual:

- Limpa, clara e objetiva.
- Verde vivo como assinatura de marca e acao.
- Muito espaco em branco, texto direto e elementos bem separados.
- Fotos reais de paisagismo e screenshots do produto sempre que ajudarem a explicar valor.
- Interface interna mais densa e operacional, mantendo a mesma fonte, cores e bordas discretas.

## Tailwind

O projeto usa Tailwind CSS v4 via `@import "tailwindcss"` em `public/css/styles.css`. Nao existe `tailwind.config.*`; tokens customizados ficam no bloco `@theme` do proprio CSS.

Configuracao atual:

- Cores customizadas: apenas os tokens listados em "Cores".
- Fontes customizadas: `--font-sans` e `--font-marca`.
- Escalas de `fontSize`, `fontWeight`, `lineHeight`, `spacing`, `borderRadius`, `boxShadow` e `screens`: defaults do Tailwind.
- Breakpoints em uso: defaults `sm`, `md`, `lg`, `xl` e `2xl`.
- Plugins ativos: nenhum plugin Tailwind adicional; nao ha `@plugin` ou pacote como `@tailwindcss/forms`/`typography`.
- CSS extra em `@layer components`: apenas `.quality-range`, usado para estilizar o input range da qualidade do render.

## Fontes

A familia principal e `DM Sans`, carregada nas views via Google Fonts CDN e referenciada por `--font-sans` em `public/css/styles.css`. A familia `NeulisAlt` e carregada localmente por `@font-face` e usada como `--font-marca`.

Use:

- `font-sans` para texto geral.
- `font-marca` para a wordmark `gardesa`.
- `font-semibold` para titulos e CTAs.
- `font-medium` para navegacao, labels e itens de lista.
- `font-normal` para textos internos neutros e descricoes operacionais.
- `font-light` para textos de apoio e descricoes.

Padroes de escala:

- Hero: `text-4xl sm:text-5xl font-semibold leading-[1.1]`.
- Titulo de secao: `text-3xl sm:text-4xl font-semibold leading-tight`.
- Subtitulo hero: `text-lg sm:text-2xl font-light leading-relaxed text-preto/70`.
- Texto de apoio: `text-sm font-light leading-relaxed text-preto/60` ou `text-preto/70`.
- Labels pequenas: `text-xs font-medium` ou `text-xs font-light`.

Use italico com moderacao para enfase de marca, principalmente em palavras-chave verdes, como `text-verde italic`.

## Cores

Tokens oficiais definidos em `public/css/styles.css`:

| Token | Hex | Uso principal |
| --- | --- | --- |
| `verde` | `#5ADB40` | Marca, CTAs primarios, enfase positiva |
| `verde-2` | `#48AF33` | Hover de botoes verdes, sombras e estados secundarios |
| `verde-3` | `#368326` | Foco, bordas ativas e verde mais forte |
| `azul` | `#479AF6` | Estado informativo, foco e acentos pontuais |
| `laranja` | `#EF7D00` | Alertas ou acentos de atencao |
| `azul-escuro` | `#261F31` | Acento escuro alternativo, uso raro |
| `preto` | `#141414` | Texto principal, fundos escuros e botoes secundarios fortes |
| `branco` | `#FFFFFF` | Fundo branco base e secoes claras |

Cores auxiliares recorrentes:

- `#BABABA`: bordas da landing, badges e cards publicos.
- `#e2e2e2`: bordas do dashboard.
- `#dddddd`: hover de links/pills na landing.
- `#f3f3f3`: hover de itens internos e superficie clara.
- `#fafafa`: fundo das paginas internas do dashboard.
- `#f8f8f8`: superficies de upload e preview.
- `#f6f6f6`: fundo de inputs publicos.
- `#656565`: texto secundario dos cards internos da Home.
- `#d9d9d9`: bordas de abas inativas e placeholder visual.
- `#d1fac8`: item ativo da sidebar.
- `#2ED218`: verde usado em padrao de bolinhas e estado ativo legado.
- `#f0fdf0`: fundo de mensagem de sucesso.
- `#fff5f5` e `#f1b8b8`: fundos e bordas de erro.
- `#c62828`, `#b42318`, `#e30000` e `#c90000`: acoes destrutivas e botoes de remocao.

Se uma cor auxiliar virar recorrente em novas telas, promova para token em `public/css/styles.css`. Nao crie CSS de pagina para cores novas.

## Logo e marca verbal

A marca aparece como texto `gardesa`, sempre em minusculas, com `font-marca` e `text-verde`.

Padrao de wordmark:

```html
<span class="text-3xl font-marca text-verde font-semibold">gardesa</span>
```

O icone esta em `public/img/icons/logo_gardesa.svg` e usa stroke `#5ADB40`. Use o icone em contextos compactos, como sidebar colapsada ou favicon-like UI. Em headers publicos, prefira a wordmark textual.

## Layout

Padroes da landing:

- Container: `max-w-6xl mx-auto px-6`.
- Header publico: altura `h-20`, fundo `bg-branco`, borda inferior `border-[#BABABA]`, sombra leve.
- Hero: grid responsivo `grid grid-cols-1 lg:grid-cols-2 gap-12 items-center`.
- Secoes comuns: `py-12`, `py-20` ou `py-24`, conforme densidade.
- Grids de recursos: `grid grid-cols-1 lg:grid-cols-4 gap-4`.
- Imagens grandes: `rounded-2xl overflow-hidden shadow-md` com aspect ratio explicito.

Padroes do dashboard:

- Layout com sidebar fixa de `w-[240px]`, podendo colapsar para `w-[84px]`.
- Header interno com `h-[68px]`, fundo `bg-white/95`, `backdrop-blur` e borda `#e2e2e2`.
- Navegacao interna com itens de `h-11`, `rounded-[8px]`, icone + label.
- Superficies internas usam `bg-white`, bordas `#e2e2e2` e radius `rounded-[8px]`.
- Fundo geral das paginas internas usa `bg-[#fafafa]`.
- A Home usa largura maxima `max-w-[971px]`, cards de acao `h-[174px] lg:w-[311px]` e grid recente com cards de `236px`.
- A Galeria usa largura maxima `max-w-[1292px]`, abas `rounded-full` e grid `repeat(auto-fill,minmax(min(100%,236px),236px))`.
- A tela de Render usa painel lateral `xl:w-[360px]`, workspace com preview fluido e controles internos compactos.

## Componentes

### Botoes

Primario:

```html
<a class="inline-flex items-center gap-2 rounded-full bg-verde px-5 py-2 font-semibold text-white shadow-md shadow-verde/40 transition-colors hover:bg-verde-2">
  Comecar agora
</a>
```

Secundario leve:

```html
<a class="rounded-full px-4 py-2.5 text-sm font-medium text-preto hover:bg-[#dddddd]">
  Explorar recursos
</a>
```

Secundario forte:

```html
<button class="inline-flex h-11 items-center justify-center rounded-full bg-preto px-5 text-sm font-semibold text-white transition-colors hover:bg-preto/80">
  Confirmar
</button>
```

Regras:

- CTAs publicos sao arredondados com `rounded-full`.
- Botoes internos podem ser `rounded-full` para acoes principais e `rounded-[8px]` para controles de navegacao/menu.
- Sempre inclua `transition-colors` quando houver hover.
- Use icones existentes de `public/img/icons/` quando a acao pedir direcao, upload, busca, download ou estado.

### Inputs

Padrao publico:

```html
<input class="h-11 rounded-full border border-verde bg-[#f6f6f6] px-4 text-base text-preto outline-none transition-colors placeholder:text-preto/40 focus:border-verde-3" />
```

Padrao interno:

```html
<input class="h-12 rounded-[8px] border border-[#e2e2e2] bg-[#fbfbfb] px-4 text-sm text-preto outline-none transition-colors focus:border-verde" />
```

### Cards e blocos

- Recursos da landing nao usam cards pesados: sao blocos simples `p-4`, icone, titulo e texto.
- Waitlist usa card central com `border border-[#bababa] rounded-2xl px-8 py-10`.
- Pricing usa `rounded-2xl border border-black/25 bg-white p-6`.
- Dashboard usa cards mais utilitarios, geralmente `rounded-[8px] border border-[#e2e2e2] bg-white`.
- Modais e overlays internos usam `rounded-[8px]`, `bg-white`, sombras arbitrarias e overlays `bg-black/*`.

Evite colocar cards dentro de cards. Prefira secoes claras e componentes repetidos bem separados.

### Badges e status

- Badges publicos usam `rounded-full`, fonte pequena e borda discreta.
- Estado ativo no dashboard usa fundo verde claro `#d1fac8` e texto verde vivo.
- Mensagens de sucesso usam verde claro, borda verde suave e texto `text-verde`.
- Mensagens de erro internas usam `rounded-[8px] border border-[#f1b8b8] bg-[#fff5f5] text-[#b42318]`.

### Controles de render

- Upload: zona `rounded-[8px] border border-dashed border-[#bababa] bg-[#f8f8f8]`.
- Selects e botoes de opcao: `h-12` ou `min-h-[68px]`, `rounded-[8px]`, `border-[#e2e2e2]`, `bg-white`, `hover:bg-[#f3f3f3]`.
- Range de qualidade: input com classe `quality-range`, trilho `h-1 rounded-full bg-[#e2e2e2]` e preenchimento `bg-verde`.
- Acoes de preview/render: botoes iconicos pequenos com `aria-label`, geralmente sem texto visivel.

### FAQ e accordions

Padrao atual:

- Item com `border-b border-black/25 py-4`.
- Pergunta em `text-sm font-medium text-preto`.
- Resposta em `text-sm font-light leading-relaxed text-preto`.
- Icone verde com mais/menos.

## Imagens e assets

Assets principais:

- `public/img/foto_hero.png`: imagem hero de paisagismo.
- `public/img/cta_background.png`: fundo da chamada final.
- `public/img/dashboard_image.png`: screenshot do produto.
- `public/img/papers.svg`: ilustracao de documentos.
- `public/img/profile_pictures.png`: apoio social proof da badge.
- `public/img/icons/`: biblioteca local de icones SVG.

Direcao de imagem:

- Priorize imagens reais de ambientes verdes, projetos e produto.
- Use screenshots quando a promessa for operacional.
- Evite fundos abstratos, gradientes decorativos e ilustracoes genericas quando uma foto ou tela real comunicar melhor.
- Em imagens de capa, use overlay escuro apenas quando houver texto por cima, como `bg-preto/60`.

## Voz e texto

Tom:

- Direto, humano e pratico.
- Fala com profissionais, nao com "usuarios" genericos.
- Enfatiza economia de tempo, menos planilhas, menos retrabalho e entregas profissionais.
- Usa frases curtas e beneficios concretos.

Exemplos alinhados:

- "Tecnologia feita para profissionais."
- "Crie renders profissionais em segundos."

Evite:

- Jargoes abstratos de SaaS.
- Promessas vagas como "potencialize seu negocio" sem explicar o ganho.
- Textos longos em cards pequenos.

## Responsividade

Use mobile-first:

- Comece com `grid-cols-1`, `flex-col`, tamanhos compactos e aumente em `sm`, `md`, `lg`.
- Landing revela a imagem do hero apenas em `lg` para preservar foco e performance no mobile.
- Dashboard usa `sm`, `md`, `lg`, `xl` e `2xl` defaults do Tailwind; nao ha breakpoints customizados.
- CTAs devem quebrar linha com `flex-wrap` quando necessario.
- Inputs de formularios publicos viram coluna no mobile e linha em `sm`.
- Textos dentro de botoes devem usar `whitespace-nowrap` quando a largura permitir, mas nunca causar overflow.

## Acessibilidade

- Mantenha alt text descritivo para imagens de conteudo.
- Use `alt=""` apenas para icones puramente decorativos.
- Preserve contraste: texto principal em `text-preto`; textos sobre imagem devem usar `text-branco` com overlay escuro.
- Prefira labels visiveis ou contexto claro para campos de formulario.
- Ao adicionar novos controles interativos, inclua estados de foco com Tailwind, por exemplo `focus:outline-none focus:ring-2 focus:ring-verde/35`.

## Regras de implementacao

- Use apenas Tailwind para estilos de paginas.
- Nao adicione CSS tradicional de pagina em `public/css/styles.css`.
- Use `public/css/styles.css` para fontes, import do Tailwind, tokens globais e componentes globais inevitaveis como controles nativos.
- Nao edite `public/css/output.css` manualmente; gere pelo build do Tailwind.
- Novas rotas devem ficar em `src/routes/`.
- Novas views devem seguir os partials e padroes existentes quando forem parte do dashboard.
- Reutilize assets de `public/img/` e icones de `public/img/icons/` antes de criar novos.

## Atencoes atuais

- A landing usa algumas classes como `text-verde-escuro` e `border-verde-escuro`, mas esse token nao esta definido em `public/css/styles.css`. Para novas telas, prefira `verde-3` ou adicione o token global antes de usar.
- A wordmark da landing usa `font-regular`; em Tailwind, o peso padrao equivalente e `font-normal`. Para novos componentes, prefira `font-normal`, `font-medium` ou `font-semibold`.
- `text-verde` sobre branco e `text-white`/`text-branco` sobre `bg-verde` aparecem no produto, mas nao atingem contraste AA para texto normal. Para novos textos funcionais, prefira `verde-3` em texto ou `text-preto` sobre `bg-verde`.
- Algumas views internas usam cores auxiliares ainda hardcoded (`#fafafa`, `#656565`, `#e30000`, `#c90000`). Para novas telas, prefira tokens existentes ou promova cores recorrentes para `@theme`.
- Home, Galeria e Render usam muitos valores arbitrarios para layout fixo. Mantenha esse padrao apenas quando estiver reproduzindo dimensoes ja existentes; para novos fluxos, prefira a escala default do Tailwind.
- O padrao visual publico aceita `rounded-2xl`; o dashboard tende a `rounded-[8px]` para ficar mais compacto e operacional.

## Checklist para novas telas

- Usa `font-sans` e tokens `text-preto`, `bg-branco`, `bg-verde`, `hover:bg-verde-2`.
- Mantem container `max-w-6xl mx-auto px-6` em paginas publicas.
- Usa cards apenas quando o conteudo precisa de moldura.
- Usa fotos, screenshots ou icones reais do produto quando houver valor visual.
- Mantem copy curta, concreta e voltada para paisagistas.
- Tem estados hover/focus em links, botoes e inputs.
- Funciona em mobile antes de ajustar desktop.
