import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { CarregamentoService } from '../carregamento/carregamento.service';

export type Tema = 'claro' | 'escuro' | 'alto-contraste';

export interface OpcaoTema {
  valor: Tema;
  rotulo: string;
  icone: string;
}

export const TEMAS: OpcaoTema[] = [
  { valor: 'claro', rotulo: 'Claro', icone: 'light_mode' },
  { valor: 'escuro', rotulo: 'Escuro', icone: 'dark_mode' },
  { valor: 'alto-contraste', rotulo: 'Alto contraste', icone: 'contrast' }
];

/**
 * Tamanhos do texto, em % do tamanho configurado no navegador. Tudo no site é
 * medido em rem (texto, espaçamentos e caixas), então o layout acompanha, como
 * no zoom do navegador; os pontos de quebra (celular/desktop) não mudam.
 */
export const TAMANHOS_TEXTO = [90, 100, 112.5, 125, 137.5, 150];
export const TAMANHO_TEXTO_PADRAO = 100;

/**
 * Chave no localStorage. O script do `src/index.html` lê a mesma chave para
 * aplicar tema e tamanho antes da primeira pintura: mudar o formato aqui exige
 * mudar lá também.
 */
export const CHAVE_PREFERENCIAS = 'sgdp.acessibilidade';

interface Preferencias {
  /** Ausente: segue o sistema operacional (escuro se o sistema estiver no escuro). */
  tema?: Tema;
  fonte?: number;
  /** Ausente ou falso: segue o sistema operacional. */
  reduzirAnimacoes?: boolean;
}

/**
 * Preferências de acessibilidade da pessoa neste navegador: tema, tamanho do
 * texto e animações. Aplica no `<html>` (classes `tema-*` e `sem-animacoes`,
 * `font-size`) e troca a folha do tema (`src/assets/temas/*.css`, gerada por
 * `scripts/temas/gerar-temas.mjs`).
 *
 * Só é usado pela barra de acessibilidade (carregada sob demanda) e pela página
 * /acessibilidade: o pacote inicial não carrega nada disto.
 */
@Injectable({ providedIn: 'root' })
export class AcessibilidadeService {
  private readonly documento = inject(DOCUMENT);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  /** Tema escolhido; nulo quando a pessoa nunca escolheu (segue o sistema). */
  readonly temaEscolhido = signal<Tema | null>(null);
  private readonly sistemaNoEscuro = signal(false);
  readonly tema = computed<Tema>(() => this.temaEscolhido() ?? (this.sistemaNoEscuro() ? 'escuro' : 'claro'));

  readonly fonte = signal(TAMANHO_TEXTO_PADRAO);
  readonly podeDiminuir = computed(() => this.fonte() > TAMANHOS_TEXTO[0]);
  readonly podeAumentar = computed(() => this.fonte() < TAMANHOS_TEXTO[TAMANHOS_TEXTO.length - 1]);

  /** Escolha feita na página de acessibilidade; o pedido do sistema vale pelo CSS. */
  readonly reduzirAnimacoes = signal(false);

  private regiaoAviso: HTMLElement | null = null;
  /** O texto que a região viva recebe daqui a pouco (a escrita espera a região ser esvaziada). */
  private escritaPendente: { texto: string; temporizador: ReturnType<typeof setTimeout> } | null = null;

  constructor() {
    if (!this.noNavegador) return;

    const salvas = this.ler();
    if (TEMAS.some(t => t.valor === salvas.tema)) this.temaEscolhido.set(salvas.tema!);
    if (TAMANHOS_TEXTO.includes(Number(salvas.fonte))) this.fonte.set(Number(salvas.fonte));
    this.reduzirAnimacoes.set(salvas.reduzirAnimacoes === true);

    const esquemaEscuro = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (esquemaEscuro) {
      this.sistemaNoEscuro.set(esquemaEscuro.matches);
      esquemaEscuro.addEventListener('change', evento => this.sistemaNoEscuro.set(evento.matches));
    }

    effect(() => this.aplicar(this.tema(), this.fonte(), this.reduzirAnimacoes()));

    // A espera longa do indicador de carregamento é lida nesta mesma região viva, e o aviso sai dela no fim
    const carregamento = inject(CarregamentoService);
    carregamento.anunciar = texto => this.anunciar(texto);
    carregamento.limparAviso = () => this.limparAviso('Carregando');
  }

  escolherTema(tema: Tema): void {
    this.temaEscolhido.set(tema);
    this.salvar();
    this.anunciar(`Tema ${this.rotuloTema(tema).toLowerCase()} ativado.`);
  }

  /** Volta a seguir o sistema operacional. */
  seguirTemaDoSistema(): void {
    this.temaEscolhido.set(null);
    this.salvar();
    this.anunciar(`O tema segue o sistema: ${this.rotuloTema(this.tema()).toLowerCase()}.`);
  }

  aumentarTexto(): void {
    const maior = TAMANHOS_TEXTO.find(t => t > this.fonte());
    if (maior !== undefined) this.definirTexto(maior);
  }

  diminuirTexto(): void {
    const menor = [...TAMANHOS_TEXTO].reverse().find(t => t < this.fonte());
    if (menor !== undefined) this.definirTexto(menor);
  }

  textoPadrao(): void {
    this.definirTexto(TAMANHO_TEXTO_PADRAO);
  }

  definirReducaoDeAnimacoes(reduzir: boolean): void {
    this.reduzirAnimacoes.set(reduzir);
    this.salvar();
    this.anunciar(reduzir ? 'Animações reduzidas.' : 'Animações conforme o sistema.');
  }

  /** Tudo de volta ao padrão: tema do sistema, texto em 100% e animações do sistema. */
  restaurarPadrao(): void {
    this.temaEscolhido.set(null);
    this.fonte.set(TAMANHO_TEXTO_PADRAO);
    this.reduzirAnimacoes.set(false);
    try {
      localStorage.removeItem(CHAVE_PREFERENCIAS);
    } catch {
      // sem armazenamento local: nada a apagar
    }
    this.anunciar('Preferências de acessibilidade restauradas.');
  }

  rotuloTema(tema: Tema): string {
    return TEMAS.find(t => t.valor === tema)?.rotulo ?? tema;
  }

  rotuloTexto(fonte = this.fonte()): string {
    return `${String(fonte).replace('.', ',')}%`;
  }

  /**
   * Lê um aviso curto para quem usa leitor de tela (região `aria-live` invisível,
   * criada na primeira vez). Serve também para anunciar a troca de página.
   */
  anunciar(texto: string): void {
    if (!this.noNavegador) return;
    if (!this.regiaoAviso) {
      const regiao = this.documento.createElement('div');
      regiao.setAttribute('role', 'status');
      regiao.setAttribute('aria-live', 'polite');
      regiao.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;'
        + 'overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
      this.documento.body.appendChild(regiao);
      this.regiaoAviso = regiao;
    }
    const regiao = this.regiaoAviso;
    // Esvaziar e escrever depois: o mesmo texto duas vezes seguidas também é lido
    regiao.textContent = '';
    if (this.escritaPendente) clearTimeout(this.escritaPendente.temporizador);
    const temporizador = setTimeout(() => {
      regiao.textContent = texto;
      this.escritaPendente = null;
    }, 60);
    this.escritaPendente = { texto, temporizador };
  }

  /**
   * Tira da região viva um aviso que já passou (F1, D15): o "Carregando" depois que a
   * espera acabou ficava escrito, e quem lia a página com o cursor virtual o achava.
   * Só se ainda for ele: um aviso mais novo fica.
   */
  limparAviso(texto: string): void {
    if (this.escritaPendente?.texto === texto) {
      clearTimeout(this.escritaPendente.temporizador);
      this.escritaPendente = null;
    }
    if (this.regiaoAviso?.textContent === texto) this.regiaoAviso.textContent = '';
  }

  private definirTexto(fonte: number): void {
    this.fonte.set(fonte);
    this.salvar();
    this.anunciar(`Texto em ${this.rotuloTexto(fonte)}.`);
  }

  private aplicar(tema: Tema, fonte: number, reduzirAnimacoes: boolean): void {
    const html = this.documento.documentElement;
    html.classList.toggle('sem-animacoes', reduzirAnimacoes);
    html.style.fontSize = fonte === TAMANHO_TEXTO_PADRAO ? '' : `${fonte}%`;

    const trocarClasse = () => {
      for (const t of TEMAS) html.classList.toggle(`tema-${t.valor}`, t.valor === tema && tema !== 'claro');
    };
    const folhas = Array.from(this.documento.querySelectorAll<HTMLLinkElement>('link[href^="assets/temas/"]'));
    if (tema === 'claro') {
      trocarClasse();
      folhas.forEach(folha => folha.remove());
      return;
    }

    const endereco = `assets/temas/${tema}.css${this.versaoTemas()}`;
    const pronta = folhas.find(folha => folha.getAttribute('href') === endereco);
    if (pronta) {
      trocarClasse();
      folhas.filter(folha => folha !== pronta).forEach(folha => folha.remove());
      return;
    }

    // A classe só muda quando a folha nova chega: as regras de cada tema valem só
    // sob a classe dele, e trocar antes deixaria a tela no claro por um instante
    const folha = this.documento.createElement('link');
    folha.rel = 'stylesheet';
    folha.href = endereco;
    const concluir = () => {
      if (this.tema() !== tema) return; // a pessoa já escolheu outro
      trocarClasse();
      folhas.forEach(antiga => antiga.remove());
    };
    folha.addEventListener('load', concluir, { once: true });
    folha.addEventListener('error', concluir, { once: true });
    this.documento.head.appendChild(folha);
  }

  /** Mesmo versionamento do script do index.html: o hash do styles-*.css. */
  private versaoTemas(): string {
    const estilos = this.documento.querySelector('link[href*="styles"]');
    const versao = estilos?.getAttribute('href')?.match(/styles-([A-Za-z0-9]+)/)?.[1];
    return versao ? `?v=${versao}` : '';
  }

  private ler(): Preferencias {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_PREFERENCIAS) || '{}') ?? {};
    } catch {
      return {};
    }
  }

  private salvar(): void {
    const preferencias: Preferencias = {};
    const tema = this.temaEscolhido();
    if (tema) preferencias.tema = tema;
    if (this.fonte() !== TAMANHO_TEXTO_PADRAO) preferencias.fonte = this.fonte();
    if (this.reduzirAnimacoes()) preferencias.reduzirAnimacoes = true;
    try {
      if (Object.keys(preferencias).length) localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(preferencias));
      else localStorage.removeItem(CHAVE_PREFERENCIAS);
    } catch {
      // sem armazenamento local: a escolha vale só até recarregar a página
    }
  }
}
