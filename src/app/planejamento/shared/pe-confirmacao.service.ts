import { Injectable, signal } from '@angular/core';

/** O que a janela de confirmação pergunta. */
export interface PerguntaPe {
  /** A pergunta, no título da janela ("Apagar o princípio PR12?"). */
  titulo: string;
  /** O que acontece se a pessoa confirmar, em linguagem simples. */
  texto?: string;
  /** Rótulo do botão que confirma ("Apagar", "Sair sem salvar"). */
  sim: string;
  /** Rótulo do botão que desiste (padrão: "Cancelar"). */
  nao?: string;
  /** Ação que apaga, descarta ou tira algo: o botão que confirma fica vermelho. */
  perigo?: boolean;
}

/**
 * Confirmações da Governança Estratégica (F1, A04 e B03): no lugar do `confirm`
 * nativo do navegador, que não segue o tema, o alto contraste nem o tamanho do
 * texto, uma janela do próprio módulo (`PeConfirmacaoComponent`, na moldura da
 * trilha, com a `DialogoDirective`: foco preso, Esc desiste, foco de volta a quem
 * abriu). `perguntar` devolve uma promessa com a resposta; uma pergunta nova
 * desiste da anterior, que ainda esperava.
 *
 * A guarda de saída das telas também pergunta por aqui (`confirmarSaida`, nas
 * rotas): ela cancela a navegação, pergunta e, se a pessoa confirmar, navega de
 * novo para o mesmo endereço, liberado uma vez (`liberarSaida`). Assim a espera
 * da resposta não conta como carregamento (a barra do topo não aparece).
 */
@Injectable({ providedIn: 'root' })
export class PeConfirmacaoService {
  /** A pergunta à vista (a janela aparece enquanto não é nula). */
  readonly pergunta = signal<PerguntaPe | null>(null);

  #resposta: ((sim: boolean) => void) | null = null;
  #saidaLiberada: string | null = null;
  #saidaPerguntada: Promise<boolean> | null = null;

  perguntar(pergunta: PerguntaPe): Promise<boolean> {
    this.#resposta?.(false);
    this.pergunta.set(pergunta);
    return new Promise<boolean>(resolver => this.#resposta = resolver);
  }

  /** Mudanças não salvas: "Sair sem salvar?" com o que se perde. */
  perguntarDescarte(texto: string, sim = 'Sair sem salvar', titulo = 'Sair sem salvar?'): Promise<boolean> {
    return this.perguntar({ titulo, texto, sim, nao: 'Continuar aqui', perigo: true });
  }

  responder(sim: boolean): void {
    const resposta = this.#resposta;
    this.#resposta = null;
    this.pergunta.set(null);
    // A resposta chega depois que a janela sai da tela e devolve o foco a quem a abriu: assim o foco
    // que a tela puser depois da ação (no item vizinho, por exemplo) não é desfeito pela janela
    if (resposta) setTimeout(() => resposta(sim));
  }

  /** A próxima navegação para este endereço passa pela guarda de saída sem perguntar. */
  liberarSaida(url: string): void {
    this.#saidaLiberada = url;
  }

  /** O endereço foi liberado (e deixa de estar: vale uma vez só). */
  saidaLiberada(url: string): boolean {
    const liberada = this.#saidaLiberada === url;
    this.#saidaLiberada = null;
    return liberada;
  }

  /**
   * A guarda perguntou (e cancelou a navegação): `resposta` resolve com o resultado
   * da navegação refeita, ou falso se a pessoa ficou na tela.
   */
  registrarSaida(resposta: Promise<boolean>): void {
    this.#saidaPerguntada = resposta;
    const limpar = () => {
      if (this.#saidaPerguntada === resposta) this.#saidaPerguntada = null;
    };
    resposta.then(limpar, limpar);
  }

  /**
   * Para quem navegou e viu a navegação cancelada: se foi a guarda que perguntou, a
   * resposta dela (a navegação refeita); senão, falso. Ex.: trocar a versão à vista
   * só depois de sair do passo.
   */
  saidaPerguntada(): Promise<boolean> {
    const resposta = this.#saidaPerguntada ?? Promise.resolve(false);
    this.#saidaPerguntada = null;
    return resposta;
  }
}
