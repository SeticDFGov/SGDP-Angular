/**
 * Gera os temas de acessibilidade (escuro e alto contraste) a partir do CSS que o
 * Tailwind produz para o projeto.
 *
 * Compila src/styles.css com o mesmo plugin do build (@tailwindcss/postcss, mesma
 * raiz de varredura) e, para cada regra que usa uma cor da paleta
 * (var(--color-...)), escreve a mesma regra prefixada por html.tema-escuro ou
 * html.tema-alto-contraste, com a cor trocada conforme a PROPRIEDADE: fundo, texto,
 * borda, anel de foco etc. Trocar só as variáveis da paleta não serviria, porque a
 * mesma variável pinta o fundo claro de um cartão e o texto escuro dentro dele.
 * Assim toda tela, inclusive as futuras, ganha os dois temas sem classe nova nos
 * templates.
 *
 * Saída: src/assets/temas/escuro.css e src/assets/temas/alto-contraste.css (o build
 * publica em /assets/temas/). Só baixa o arquivo quem escolhe o tema (o
 * script do index.html e o AcessibilidadeService fazem a troca).
 *
 * Roda sozinho antes do `npm start` e do `npm run build` (prestart/prebuild, que é
 * o caminho do Dockerfile). Depois de usar uma cor nova numa tela: `npm run temas`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const entrada = join(raiz, 'src', 'styles.css');
const destino = join(raiz, 'src', 'assets', 'temas');

// Paleta padrão do Tailwind: PALETA.gray[500] = 'oklch(...)'
const PALETA = {};
const temaTailwind = readFileSync(join(raiz, 'node_modules', 'tailwindcss', 'theme.css'), 'utf8');
for (const [, familia, tom, valor] of temaTailwind.matchAll(/--color-([a-z]+)-(\d{2,3}):\s*([^;]+);/g)) {
  (PALETA[familia] ??= {})[Number(tom)] = valor.trim();
}

const NEUTRAS = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone']);

const mistura = (cor, pct, base) => `color-mix(in oklab, ${cor} ${pct}%, ${base})`;

/* ---------------------------------------------------------------- escuro */

const ESCURO = {
  pagina: 'oklch(17% 0.012 264)',
  cartao: 'oklch(21.5% 0.014 264)',
  // fundos um pouco mais escuros que o cartão (linhas de cabeçalho, hover suave)
  poco: 'oklch(19.3% 0.013 264)',
  // fundos que no claro são "cinza forte" (trilhos, desabilitados): mais claros que o cartão
  elevado: { 200: 'oklch(29% 0.016 264)', 300: 'oklch(36% 0.018 264)', 400: 'oklch(44% 0.02 264)' },
  borda: {
    50: 'oklch(25% 0.014 264)', 100: 'oklch(26.5% 0.015 264)', 200: 'oklch(30.5% 0.016 264)',
    300: 'oklch(37% 0.018 264)', 400: 'oklch(45% 0.02 264)'
  },
  foco: '#60a5fa',
  // barra de carregamento do topo (a do claro, a cor principal, fica no CSS do componente)
  carregando: '#60a5fa'
};

function corEscuro(categoria, familia, tom, emMistura) {
  if (familia === 'white') {
    // Translúcido (bg-white/10...) só existe sobre os cabeçalhos escuros: fica igual
    if (emMistura) return null;
    if (categoria === 'fundo') return ESCURO.cartao;
    // borda branca é o vão entre células (mapa de riscos) ou o aro de uma bolinha
    if (categoria === 'borda' || categoria === 'anel' || categoria === 'deslocamento') return ESCURO.cartao;
    return null; // texto branco fica branco: está sempre sobre fundo cheio
  }
  if (familia === 'black') {
    if (emMistura) return null; // véu dos modais
    return categoria === 'texto' || categoria === 'placeholder' ? PALETA.gray[50] : null;
  }
  const p = PALETA[familia];
  if (!p) return null;

  if (NEUTRAS.has(familia)) {
    switch (categoria) {
      case 'fundo':
        if (tom === 50) return ESCURO.poco;
        if (tom === 100) return ESCURO.pagina;
        return ESCURO.elevado[tom] ?? null; // 500 em diante já é escuro
      case 'texto':
      case 'placeholder':
        return { 500: p[400], 600: p[300], 700: p[200], 800: p[100], 900: p[50], 950: p[50] }[tom] ?? null;
      case 'borda':
      case 'anel':
        return ESCURO.borda[tom] ?? { 600: p[400], 700: p[300], 800: p[200], 900: p[100], 950: p[50] }[tom] ?? null;
      default:
        return null;
    }
  }

  switch (categoria) {
    case 'fundo': {
      // tons claros viram uma tinta escura da mesma cor; os cheios (botões, selos) ficam
      const pct = { 50: 14, 100: 22, 200: 30, 300: 40 }[tom];
      return pct ? mistura(p[500], pct, ESCURO.cartao) : null;
    }
    case 'texto':
    case 'placeholder':
      return { 500: p[400], 600: p[400], 700: p[300], 800: p[200], 900: p[200], 950: p[100] }[tom] ?? null;
    case 'borda': {
      const pct = { 50: 22, 100: 30, 200: 38, 300: 50 }[tom];
      if (pct) return mistura(p[500], pct, ESCURO.cartao);
      return { 700: p[400], 800: p[300], 900: p[300], 950: p[200] }[tom] ?? null;
    }
    case 'anel': {
      const pct = { 50: 45, 100: 45, 200: 45, 300: 45 }[tom];
      return pct ? mistura(p[500], pct, ESCURO.cartao) : null;
    }
    default:
      return null;
  }
}

/* -------------------------------------------------------- alto contraste */

// Todas com contraste de 8:1 ou mais sobre o preto
const AC = {
  link: '#ffff00',
  placeholder: '#c8c8c8',
  familias: {
    red: '#ff8080', rose: '#ff8080', pink: '#ff8080',
    orange: '#ffb070', amber: '#ffe14d', yellow: '#ffe14d',
    lime: '#66ff99', green: '#66ff99', emerald: '#66ff99',
    teal: '#5ff5f5', cyan: '#5ff5f5',
    sky: '#80c8ff', blue: '#80c8ff',
    indigo: '#d0a8ff', violet: '#d0a8ff', purple: '#d0a8ff', fuchsia: '#d0a8ff'
  }
};

/** Devolve a cor e, para fundo cheio, o contorno que deixa o elemento visível no preto. */
function corAltoContraste(categoria, familia, tom, emMistura) {
  const neutra = familia === 'white' || familia === 'black' || NEUTRAS.has(familia);
  const colorida = !neutra && AC.familias[familia];
  switch (categoria) {
    case 'fundo':
      if (emMistura && neutra) return null; // véus e translúcidos dos cabeçalhos
      if (familia === 'black') return null;
      if (emMistura) return { valor: '#000' };
      // Fundo cheio (botão, selo, barra de progresso, bolinha): preto com contorno
      // na cor da família, para não sumir
      if (colorida && tom >= 400) return { valor: '#000', contorno: colorida };
      if (NEUTRAS.has(familia) && tom >= 500 && tom <= 700) return { valor: '#000', contorno: '#fff' };
      return { valor: '#000' };
    case 'texto':
      if (emMistura && neutra) return null;
      return { valor: colorida || '#fff' };
    case 'placeholder':
      return { valor: AC.placeholder };
    case 'borda':
      if (familia === 'white') return { valor: '#000' }; // vão entre células
      return { valor: colorida || '#fff' };
    case 'anel':
    case 'destaque':
      return { valor: AC.link };
    case 'deslocamento':
    case 'gradiente':
      return { valor: '#000' };
    default:
      return null;
  }
}

/* ------------------------------------------------------------- geração */

function categoriaDe(propriedade, seletor) {
  if (propriedade === 'color') return /::?placeholder/.test(seletor) ? 'placeholder' : 'texto';
  if (propriedade === 'background-color' || propriedade === 'background') return 'fundo';
  if (/^border(-[a-z]+)*-color$/.test(propriedade) || propriedade === 'outline-color') return 'borda';
  if (propriedade === '--tw-ring-color' || propriedade === '--tw-inset-ring-color') return 'anel';
  if (propriedade === '--tw-ring-offset-color') return 'deslocamento';
  if (/^--tw-gradient-(from|via|to)$/.test(propriedade)) return 'gradiente';
  if (['fill', 'stroke', 'text-decoration-color', 'caret-color'].includes(propriedade)) return 'texto';
  if (propriedade === 'accent-color') return 'destaque';
  return null; // sombras e o resto ficam como estão
}

const TOKEN_COR = /var\(--color-([a-z]+)(?:-(\d{2,3}))?\)/g;

// Pares em que um fundo claro-cheio leva texto escuro (células verde, amarela e
// laranja do mapa de riscos da CGDF): no escuro as duas cores voltam às originais, no alto
// contraste a célula fica preta com contorno da cor
const PARES_CHEIOS = [
  { fundo: ['green', 500], texto: ['gray', 900] },
  { fundo: ['yellow', 300], texto: ['gray', 900] },
  { fundo: ['orange', 400], texto: ['gray', 900] }
];

const BASE = {
  escuro: `
html.tema-escuro{color-scheme:dark;background-color:${ESCURO.pagina};color:${PALETA.gray[200]};--foco:${ESCURO.foco};--carregando:${ESCURO.carregando}}
html.tema-escuro body{background-color:${ESCURO.pagina}}
html.tema-escuro *,html.tema-escuro ::before,html.tema-escuro ::after{--tw-ring-offset-color:${ESCURO.cartao}}
html.tema-escuro #gantt-chart-container::-webkit-scrollbar-track{background:${ESCURO.elevado[200]}}
html.tema-escuro #gantt-chart-container::-webkit-scrollbar-thumb{background:${PALETA.gray[500]}}`,
  'alto-contraste': `
html.tema-alto-contraste{color-scheme:dark;background-color:#000;color:#fff;--foco:${AC.link};--carregando:${AC.link}}
html.tema-alto-contraste body{background-color:#000;color:#fff}
html.tema-alto-contraste *,html.tema-alto-contraste ::before,html.tema-alto-contraste ::after{--tw-ring-offset-color:#000}
html.tema-alto-contraste app-root a[href]{color:${AC.link};text-decoration:underline;text-underline-offset:2px}
html.tema-alto-contraste app-root :is(input,select,textarea):not([type=checkbox]):not([type=radio]):not([type=range]){background-color:#000;color:#fff;border-color:#fff}
html.tema-alto-contraste app-root :is(input[type=checkbox],input[type=radio]){accent-color:${AC.link}}
html.tema-alto-contraste app-root [aria-pressed=true],html.tema-alto-contraste app-root a[href][aria-current=page]{background-color:${AC.link};color:#000;box-shadow:none;text-decoration:none}
html.tema-alto-contraste ::placeholder{color:${AC.placeholder};opacity:1}
html.tema-alto-contraste ::selection{background-color:${AC.link};color:#000}
html.tema-alto-contraste #gantt-chart-container::-webkit-scrollbar-track{background:#000}
html.tema-alto-contraste #gantt-chart-container::-webkit-scrollbar-thumb{background:#fff}`
};

function envolver(regra, embrulhos) {
  return embrulhos.reduceRight((css, at) => `@${at.name} ${at.params}{${css}}`, regra);
}

function gerar(root, tema) {
  const classe = `tema-${tema}`;
  const mapear = tema === 'escuro' ? corEscuro : corAltoContraste;
  const saida = [];

  root.walkRules(regra => {
    const embrulhos = [];
    for (let pai = regra.parent; pai && pai.type !== 'root'; pai = pai.parent) {
      if (pai.type !== 'atrule') continue;
      if (pai.name === 'layer') {
        // variáveis do tema e valores iniciais das propriedades não são uso de cor
        if (pai.params === 'theme' || pai.params === 'properties') return;
        continue; // o tema sai sem camada: vence as utilidades sem precisar de !important
      }
      if (pai.name === 'keyframes' || pai.name === 'property' || pai.name === 'font-face') return;
      embrulhos.unshift(pai);
    }

    const seletores = regra.selectors.filter(s => !/^(:root|html|:host)\b/.test(s.trim()));
    if (!seletores.length) return;
    const seletorTexto = seletores.join(',');

    const declaracoes = [];
    let contorno = null;
    regra.each(no => {
      if (no.type !== 'decl') return;
      if (tema === 'alto-contraste' && no.prop === '--tw-shadow'
          && no.value.trim() !== '0 0 #0000' && /#|rgb|oklch|color-mix/.test(no.value)) {
        // sombra (cartões, menus, janelas) vira um contorno branco fino
        declaracoes.push(`--tw-shadow:0 0 0 1px #fff`);
        return;
      }
      const categoria = categoriaDe(no.prop, seletorTexto);
      if (!categoria || !no.value.includes('var(--color-')) return;
      const emMistura = no.value.includes('color-mix(');
      let mudou = false;
      const valor = no.value.replace(TOKEN_COR, (token, familia, tom) => {
        const r = mapear(categoria, familia, tom ? Number(tom) : undefined, emMistura);
        const cor = r && typeof r === 'object' ? r.valor : r;
        if (!cor) return token;
        if (r && typeof r === 'object' && r.contorno) contorno = r.contorno;
        mudou = true;
        return cor;
      });
      if (mudou) declaracoes.push(`${no.prop}:${valor}`);
    });
    if (contorno) declaracoes.push(`box-shadow:inset 0 0 0 2px ${contorno}`);
    if (!declaracoes.length) return;

    const prefixado = seletores.map(s => `html.${classe} ${s.trim()}`).join(',');
    saida.push(envolver(`${prefixado}{${declaracoes.join(';')}}`, embrulhos));
  });

  for (const par of PARES_CHEIOS) {
    const [ff, ft] = par.fundo;
    const [tf, tt] = par.texto;
    const seletor = `html.${classe} .bg-${ff}-${ft}.text-${tf}-${tt}`;
    saida.push(tema === 'escuro'
      ? `${seletor}{background-color:${PALETA[ff][ft]};color:${PALETA[tf][tt]}}`
      : `${seletor}{background-color:#000;color:#fff;box-shadow:inset 0 0 0 2px ${AC.familias[ff]}}`);
  }

  return saida;
}

const css = readFileSync(entrada, 'utf8');
const { root } = await postcss([tailwind({ base: raiz, optimize: { minify: false } })]).process(css, { from: entrada });

mkdirSync(destino, { recursive: true });
for (const tema of ['escuro', 'alto-contraste']) {
  const regras = gerar(root, tema);
  const conteudo = `/* GERADO por scripts/temas/gerar-temas.mjs a partir do CSS do Tailwind: não editar à mão (npm run temas). */`
    + BASE[tema] + '\n' + regras.join('\n') + '\n';
  writeFileSync(join(destino, `${tema}.css`), conteudo);
  console.log(`assets/temas/${tema}.css: ${regras.length} regras, ${(Buffer.byteLength(conteudo) / 1024).toFixed(1)} kB`);
}
