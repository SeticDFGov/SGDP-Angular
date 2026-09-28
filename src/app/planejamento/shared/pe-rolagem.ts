/**
 * Rolagem da página que a própria tela faz (o foco num título, o campo do nome
 * posto à vista) sem deixar alvo meio escondido sob o cabeçalho preso do SGDP (o
 * `header#menu` do MainLayout, preso ao topo). Um botão cortado pela borda do
 * cabeçalho fica com menos de 24 px à vista e é difícil de acertar (WCAG 2.5.8; o
 * axe acusa "target-size"). F2 (A-N03 e D-O3). Só no navegador; sem Angular.
 */

/** O que se clica ou recebe o foco pelo Tab. */
const SELETOR_ALVOS = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Meio pixel de tolerância: arredondamento das medidas. */
const TOLERANCIA_PX = 0.5;

interface Faixa {
  top: number;
  bottom: number;
}

/**
 * Depois da rolagem, se algum alvo de `raiz` ficou cortado pela borda de baixo do
 * cabeçalho preso, a página rola o mínimo para ele aparecer inteiro ou ficar
 * inteiro atrás do cabeçalho, sem tirar `manter` de vista (entre o cabeçalho e
 * `folgaBaixoPx` do pé da janela, onde fica o pé preso da tela). `ignorar`: os
 * alvos dentro de uma área com rolagem própria (cortados por ela, não pela página).
 */
export function acertarRolagemSobCabecalho(raiz: Element, manter: Element | null, folgaBaixoPx = 0, ignorar?: string): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const cabecalho = document.getElementById('menu');
  if (!cabecalho) return;
  const limite = cabecalho.getBoundingClientRect().bottom;
  if (limite <= 0) return;

  const alvos: Faixa[] = [];
  raiz.querySelectorAll(SELETOR_ALVOS).forEach(el => {
    if (ignorar && el.closest(ignorar)) return;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) alvos.push({ top: r.top, bottom: r.bottom });
  });
  // Rolar a página `desloc` px para baixo (negativo: para cima) leva cada alvo `desloc` px para cima
  const corta = (desloc: number) => alvos.some(a => a.top - desloc < limite - TOLERANCIA_PX && a.bottom - desloc > limite + TOLERANCIA_PX);
  if (!corta(0)) return;

  const m = manter?.getBoundingClientRect() ?? null;
  const baixoLivre = window.innerHeight - folgaBaixoPx;
  const cabe = (desloc: number) => !m || (m.top - desloc >= limite - TOLERANCIA_PX && m.bottom - desloc <= baixoLivre + TOLERANCIA_PX);
  const maximo = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const dentro = (desloc: number) => window.scrollY + desloc >= 0 && window.scrollY + desloc <= maximo;

  // Os candidatos: cada alvo logo abaixo do cabeçalho (inteiro à vista) ou logo atrás dele (inteiro escondido)
  let melhor: number | null = null;
  for (const a of alvos) {
    for (const desloc of [a.top - limite, a.bottom - limite]) {
      if (Math.abs(desloc) < TOLERANCIA_PX || !dentro(desloc) || !cabe(desloc) || corta(desloc)) continue;
      if (melhor === null || Math.abs(desloc) < Math.abs(melhor)) melhor = desloc;
    }
  }
  if (melhor !== null) window.scrollBy(0, Math.round(melhor));
}

/**
 * A altura do pé preso ao fim da tela (no editor de fluxos, a barra `#pe-fx-pe`
 * com Salvar e Desfazer), mais uma folga: o que fica à vista não fica atrás dele.
 */
export function alturaDoPePreso(id = 'pe-fx-pe'): number {
  if (typeof document === 'undefined') return 0;
  const pe = document.getElementById(id);
  return pe ? pe.getBoundingClientRect().height + 8 : 0;
}
