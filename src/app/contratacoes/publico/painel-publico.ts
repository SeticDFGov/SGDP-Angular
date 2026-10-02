/**
 * Endereços do painel público da Supervisão Contínua das Contratações e o código que um
 * site de fora cola para incorporá-lo. Usado pela página pública e pelo aviso do painel
 * interno (/analises/painel).
 */

/** Página inteira, aberta, sem login (como a /transparencia-ia). */
export const CAMINHO_PAINEL_PUBLICO = '/transparencia-contratacoes';

/**
 * A mesma tela para ir num iframe: sem a barra de acessibilidade e sem o cabeçalho, com um
 * título curto e o link para a página inteira. É um caminho, e não um parâmetro, para o
 * `index.html` e o `App` saberem antes da primeira pintura (o tema pode vir em `?tema=`).
 */
export const CAMINHO_PAINEL_INCORPORADO = '/transparencia-contratacoes/incorporar';

/** Chave da mensagem com a altura do painel, que o iframe manda para a página de fora. */
export const MENSAGEM_ALTURA = 'painelContratacoesAltura';

export type TemaIncorporado = '' | 'claro' | 'escuro' | 'alto-contraste';

/** Filtros do painel no endereço: `orgao` e `tipo` se repetem, `de` e `ate` são yyyy-MM-dd. */
export interface FiltrosPainelPublico {
  orgaos: string[];
  tipos: string[];
  de: string;
  ate: string;
}

export function temFiltro(f: FiltrosPainelPublico | null | undefined): boolean {
  return !!f && (f.orgaos.length > 0 || f.tipos.length > 0 || !!f.de || !!f.ate);
}

export function parametrosDosFiltros(f: FiltrosPainelPublico | null | undefined): URLSearchParams {
  const q = new URLSearchParams();
  if (!f) return q;
  [...f.orgaos].sort().forEach(o => q.append('orgao', o));
  [...f.tipos].sort().forEach(t => q.append('tipo', t));
  if (f.de) q.set('de', f.de);
  if (f.ate) q.set('ate', f.ate);
  return q;
}

/** Endereço do painel na origem dada (a do próprio site: produção ou homologação). */
export function enderecoDoPainel(origem: string, opcoes: {
  incorporado?: boolean;
  filtros?: FiltrosPainelPublico | null;
  tema?: TemaIncorporado;
} = {}): string {
  const q = parametrosDosFiltros(opcoes.filtros);
  if (opcoes.incorporado && opcoes.tema) q.set('tema', opcoes.tema);
  const consulta = q.toString();
  return origem + (opcoes.incorporado ? CAMINHO_PAINEL_INCORPORADO : CAMINHO_PAINEL_PUBLICO) + (consulta ? '?' + consulta : '');
}

/**
 * Código para colar no site de fora: o iframe e um script opcional que ajusta a altura do
 * quadro ao painel (o painel avisa a altura por postMessage; o script só aceita a origem
 * do SGDP).
 */
export function codigoParaIncorporar(origem: string, endereco: string): string {
  return [
    '<iframe id="painel-contratacoes-gdf"',
    `        src="${endereco}"`,
    '        title="Contratações de TIC do GDF"',
    '        style="width: 100%; height: 1100px; border: 0;"',
    '        loading="lazy"></iframe>',
    '<script>',
    '  // Opcional: ajusta a altura do quadro ao tamanho do painel',
    '  window.addEventListener("message", function (e) {',
    `    if (e.origin !== "${origem}" || !e.data || !e.data.${MENSAGEM_ALTURA}) return;`,
    `    document.getElementById("painel-contratacoes-gdf").style.height = e.data.${MENSAGEM_ALTURA} + "px";`,
    '  });',
    '</' + 'script>'
  ].join('\n');
}

/** Copia para a área de transferência; sem a API (página sem HTTPS), cai no jeito antigo. */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // segue para o jeito antigo
  }
  const antes = document.activeElement as HTMLElement | null;
  const area = document.createElement('textarea');
  area.value = texto;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(area);
  area.select();
  let copiou = false;
  try {
    copiou = document.execCommand('copy');
  } catch {
    copiou = false;
  }
  area.remove();
  antes?.focus();
  return copiou;
}
