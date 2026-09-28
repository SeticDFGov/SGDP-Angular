import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, NgZone, PLATFORM_ID, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, Router } from '@angular/router';

/** A barra só aparece se a espera passar disto: resposta rápida não pisca nada. */
export const ESPERA_BARRA_MS = 150;
/** Depois de aparecer, a barra fica pelo menos isto. */
export const BARRA_MINIMA_MS = 300;
/** Espera longa: "Carregando" é lido uma vez pelo leitor de tela. */
export const ESPERA_AVISO_MS = 1000;
/** A navegação ou requisição que começa até este tempo depois do clique é do clique. */
export const JANELA_CLIQUE_MS = 400;
/**
 * Folga entre o fim de uma atividade e o começo da seguinte (a tela nova pede os
 * dados logo depois da navegação): dentro dela, continua a mesma espera.
 */
export const FOLGA_MS = 60;

/** No `<html>` enquanto a barra está à vista: cursor de espera na página. */
export const CLASSE_PAGINA = 'pagina-carregando';
/** No botão ou link clicado enquanto o que ele começou não termina: giro e cursor de espera. */
export const CLASSE_OCUPADO = 'clique-ocupado';

/** Botão ou link ocupado: as atividades que ele espera e o que devolver no fim. */
interface Ocupado {
  ids: Set<number>;
  desde: number;
  giro: boolean;
  aria: string | null;
  posicao: string;
}

/**
 * Indicador de carregamento do site inteiro (ajuste global de 2026-09-24).
 *
 * Conta as atividades em andamento: a navegação do Router (do NavigationStart ao
 * NavigationEnd, Cancel ou Error, o que cobre os pacotes sob demanda, as guardas e
 * os resolvers) e as requisições HTTP (pelo `carregamentoInterceptor`, menos as
 * marcadas com `SEM_CARREGAMENTO`). Com isso:
 *
 * - a barra do topo (`BarraCarregamentoComponent`, sinal `visivel`) aparece se a
 *   espera passar de 150 ms e, depois de aparecer, fica pelo menos 300 ms; o
 *   `<html>` ganha a classe do cursor de espera enquanto ela está à vista;
 * - espera acima de 1 s: "Carregando" é lido uma vez, pelo `anunciar` que o
 *   `AcessibilidadeService` preenche ao nascer (a região viva é dele);
 * - o botão ou link clicado (fase de captura, em `button`, `a[href]` e
 *   `[role=button]`, menos o que estiver dentro de `data-sem-carregando`) que
 *   começa uma navegação ou requisição até 400 ms depois do clique ganha
 *   `aria-busy="true"` e, se a espera passar de 150 ms, o giro; até o fim, um
 *   segundo clique nele não dispara nada. O que a tela fizer ali mesmo com a
 *   resposta de uma atividade dele (outra requisição, a navegação depois de
 *   salvar) continua a mesma espera.
 *
 * Só no navegador: no servidor (SSR) não há listener, contagem nem mexida no DOM.
 */
@Injectable({ providedIn: 'root' })
export class CarregamentoService {
  readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  /** A barra do topo está à vista. */
  readonly visivel = signal(false);
  /**
   * Lê um aviso curto para quem usa leitor de tela. O `AcessibilidadeService`
   * preenche ao nascer (carrega com a barra de acessibilidade, sob demanda); antes
   * disso, a espera longa não tem aviso falado.
   */
  anunciar: ((texto: string) => void) | null = null;
  /** Tira o "Carregando" da região viva quando a espera acaba (quem lê a página depois não o acha; F1, D15). */
  limparAviso: (() => void) | null = null;

  readonly #documento = inject(DOCUMENT);
  readonly #zona = inject(NgZone);
  #ultimoId = 0;
  readonly #atividades = new Set<number>();
  /** Id da navegação do Router para a atividade dela. */
  readonly #navegacoes = new Map<number, number>();
  /** Atividade que está entregando o resultado à tela agora. */
  #entregando: number | null = null;
  #inicioEspera: number | null = null;
  #ociosoDesde: number | null = null;
  #mostradaEm = 0;
  #avisado = false;
  /** "Carregando" foi lido nesta espera (no fim, sai da região viva). */
  #falado = false;
  /** A primeira atividade de um clique nesta espera: quando ela acaba, o "Carregando" que ainda não saiu não sai mais. */
  #acao: number | null = null;
  #temporizador?: ReturnType<typeof setTimeout>;
  #clique: { elemento: HTMLElement; ate: number } | null = null;
  readonly #ocupados = new Map<HTMLElement, Ocupado>();

  constructor() {
    if (!this.noNavegador) return;
    inject(Router).events.subscribe(evento => {
      if (evento instanceof NavigationStart) this.#navegacoes.set(evento.id, this.iniciar());
      else if (evento instanceof NavigationEnd || evento instanceof NavigationCancel
        || evento instanceof NavigationError || evento instanceof NavigationSkipped) {
        const atividade = this.#navegacoes.get(evento.id);
        this.#navegacoes.delete(evento.id);
        if (atividade) this.terminar(atividade);
      }
    });
    this.#zona.runOutsideAngular(() => this.#documento.addEventListener('click', evento => this.#aoClicar(evento), true));
  }

  /**
   * Começo de uma atividade (requisição ou navegação); devolve o número dela, para o
   * `terminar`. O botão do clique recente, e os que esperam pela atividade que está
   * entregando o resultado agora, passam a esperar por esta também.
   */
  iniciar(): number {
    const id = ++this.#ultimoId;
    const agora = Date.now();
    this.#atividades.add(id);
    const clique = this.#clique;
    if (clique && agora <= clique.ate && clique.elemento.isConnected) {
      this.#ocupar(clique.elemento, id, agora);
      this.#acao ??= id;
    }
    const causa = this.#entregando;
    for (const [elemento, ocupado] of this.#ocupados) if (causa && ocupado.ids.has(causa)) this.#ocupar(elemento, id, agora);
    this.#avaliar();
    return id;
  }

  terminar(id: number): void {
    if (!this.#atividades.delete(id)) return;
    // A ação do clique terminou (o "salvo" da tela sai agora): o que vier depois dela é a mesma espera, mas o
    // "Carregando" que ainda não tinha saído não sai mais, para não ser lido depois do resultado (F1, D08)
    if (id === this.#acao) this.#avisado = true;
    for (const [elemento, ocupado] of this.#ocupados) {
      if (ocupado.ids.delete(id) && !ocupado.ids.size) this.#liberar(elemento, ocupado);
    }
    this.#avaliar();
  }

  /**
   * Roda `acao` como parte da atividade `id` (a resposta dela chegando à tela): o que
   * a tela começar ali mesmo mantém ocupado o mesmo botão.
   */
  durante<T>(id: number, acao: () => T): T {
    const antes = this.#entregando;
    this.#entregando = id;
    try {
      return acao();
    } finally {
      this.#entregando = antes;
    }
  }

  #aoClicar(evento: MouseEvent): void {
    const alvo = evento.target instanceof Element
      ? evento.target.closest<HTMLElement>('button, a[href], [role="button"]') : null;
    if (!alvo) return;
    if (this.#ocupados.has(alvo)) {
      // Ainda trabalhando: o segundo clique não dispara de novo (evita envio duplicado)
      evento.preventDefault();
      evento.stopImmediatePropagation();
      return;
    }
    // Abrir em outra aba (Ctrl, botão do meio...) não é espera desta página
    if (evento.button || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey
      || alvo.closest('[data-sem-carregando]')) return;
    const clique = { elemento: alvo, ate: Infinity };
    this.#clique = clique;
    // A janela conta do fim do clique: um confirm() no meio dele não a gasta
    setTimeout(() => clique.ate = Date.now() + JANELA_CLIQUE_MS);
  }

  #ocupar(elemento: HTMLElement, id: number, agora: number): void {
    let ocupado = this.#ocupados.get(elemento);
    if (!ocupado) {
      ocupado = { ids: new Set(), desde: agora, giro: false, aria: elemento.getAttribute('aria-busy'), posicao: elemento.style.position };
      this.#ocupados.set(elemento, ocupado);
      elemento.setAttribute('aria-busy', 'true');
    }
    ocupado.ids.add(id);
  }

  #liberar(elemento: HTMLElement, ocupado: Ocupado): void {
    this.#ocupados.delete(elemento);
    if (ocupado.aria === null) elemento.removeAttribute('aria-busy');
    else elemento.setAttribute('aria-busy', ocupado.aria);
    if (!ocupado.giro) return;
    elemento.classList.remove(CLASSE_OCUPADO);
    elemento.style.position = ocupado.posicao;
    elemento.style.removeProperty('--giro-direita');
    elemento.style.removeProperty('--giro-esquerda');
  }

  /**
   * O giro (0,75em, por cima, sem mudar a largura) fica logo depois do texto quando
   * cabe dentro do elemento (no espaço à direita do texto: o respiro ou o que sobra
   * num botão largo); senão, logo depois do elemento (ou na beirada, se o elemento
   * corta o que passa dele).
   */
  #mostrarGiro(elemento: HTMLElement): void {
    const estilo = getComputedStyle(elemento);
    if (estilo.position === 'static') elemento.style.position = 'relative';
    const caixa = elemento.getBoundingClientRect();
    const faixa = this.#documento.createRange();
    faixa.selectNodeContents(elemento);
    const texto = faixa.getBoundingClientRect();
    const giro = parseFloat(estilo.fontSize) * 0.75;
    const livre = caixa.right - parseFloat(estilo.borderRightWidth) - texto.right;
    if (texto.width && livre >= giro + 2) {
      const esquerda = texto.right - caixa.left - parseFloat(estilo.borderLeftWidth) + Math.min(giro / 3, (livre - giro) / 2);
      elemento.style.setProperty('--giro-esquerda', `${esquerda}px`);
    } else if (estilo.overflowX === 'hidden' || estilo.overflowX === 'clip') elemento.style.setProperty('--giro-direita', '0px');
    else elemento.style.setProperty('--giro-esquerda', 'calc(100% + .25em)');
    elemento.classList.add(CLASSE_OCUPADO);
  }

  /** Decide o que mostrar agora e agenda a próxima conferência. */
  #avaliar(): void {
    clearTimeout(this.#temporizador);
    const agora = Date.now();
    let proxima = Infinity;

    if (this.#atividades.size) {
      this.#ociosoDesde = null;
      if (this.#inicioEspera === null) {
        this.#inicioEspera = agora;
        this.#avisado = false;
      }
      const barra = this.#inicioEspera + ESPERA_BARRA_MS;
      if (agora >= barra) this.#mostrarBarra(true, agora);
      else proxima = barra;
      // Uma vez por espera, sem repetir a cada requisição
      const aviso = this.#inicioEspera + ESPERA_AVISO_MS;
      if (!this.#avisado && agora >= aviso) {
        this.#avisado = this.#falado = true;
        this.anunciar?.('Carregando');
      } else if (!this.#avisado) proxima = Math.min(proxima, aviso);
    } else if (this.#inicioEspera !== null) {
      this.#ociosoDesde ??= agora;
      const fim = Math.max(this.#ociosoDesde + FOLGA_MS, this.visivel() ? this.#mostradaEm + BARRA_MINIMA_MS : 0);
      if (agora >= fim) {
        this.#inicioEspera = this.#ociosoDesde = this.#acao = null;
        if (this.#falado) this.limparAviso?.();
        this.#falado = false;
        this.#mostrarBarra(false, agora);
      } else proxima = fim;
    }

    for (const [elemento, ocupado] of this.#ocupados) {
      if (ocupado.giro) continue;
      const giro = ocupado.desde + ESPERA_BARRA_MS;
      if (agora >= giro) {
        ocupado.giro = true;
        this.#mostrarGiro(elemento);
      } else proxima = Math.min(proxima, giro);
    }

    if (proxima < Infinity) {
      this.#zona.runOutsideAngular(() => this.#temporizador = setTimeout(() => this.#avaliar(), proxima - agora));
    }
  }

  #mostrarBarra(mostrar: boolean, agora: number): void {
    if (this.visivel() === mostrar) return;
    if (mostrar) this.#mostradaEm = agora;
    this.#documento.documentElement.classList.toggle(CLASSE_PAGINA, mostrar);
    this.#zona.run(() => this.visivel.set(mostrar));
  }
}
