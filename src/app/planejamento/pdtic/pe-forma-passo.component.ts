import { AfterViewChecked, Component, EventEmitter, Input, OnChanges, Output, PLATFORM_ID, SimpleChanges, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PePassoTrilha, PeTrilhaOrgao } from '../../../api/planejamento/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PeOrgaosService } from '../services/pe-orgaos.service';
import { PeConfirmacaoService } from '../shared/pe-confirmacao.service';
import { mensagemErroPe } from '../shared/pe-erros';
import { OpcaoDaForma, opcoesDaForma } from '../shared/pe-niveis-rotulos';

/**
 * F3 (C3 e C6) · "Forma deste passo", no modo livre: o passo com mais de uma forma
 * (as `OpcoesDetalhe` do servidor) pode ser detalhado na forma de um nível mais
 * alto, com mais seções e campos. As formas vão num grupo de botões de opção (o nome
 * do nível e, embaixo, "o mínimo do decreto" na do nível base ou o que ela
 * acrescenta, pela diferença para a forma padrão); a escolha só vale no botão "Usar
 * esta forma". Quem só lê vê a forma em uso e as outras.
 *
 * Mudança não salva numa seção do passo pergunta antes (na janela do módulo). Depois
 * de trocar, o passo a passo do órgão (a resposta do PUT) sobe à tela, que o põe no
 * estado e busca as seções de novo; um aviso só (o toast) e o foco no título do quadro.
 * Os dados dos campos que saem ficam guardados no servidor e voltam com a forma.
 */
@Component({
  selector: 'app-pe-forma-passo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pe-forma-passo.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeFormaPassoComponent implements OnChanges, AfterViewChecked {
  private readonly orgaosService = inject(PeOrgaosService);
  private readonly notificacoes = inject(NotificationService);
  private readonly confirmacao = inject(PeConfirmacaoService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) passo!: PePassoTrilha;
  @Input({ required: true }) orgaoId!: number;
  /** O nível base do modo livre (o "mínimo do decreto"). */
  @Input() nivelBaseId: number | null = null;
  /** Quem está logado troca a forma agora (o `PodeEditar` do passo e um papel que grava). */
  @Input() podeTrocar = false;
  /** Há mudança não salva numa seção do passo: a troca pergunta antes. */
  @Input() mudancaPendente = false;
  /** O PDTIC ainda não começou (o texto de quem só lê diz quando a escolha abre). */
  @Input() semPdtic = false;
  /** O passo a passo do órgão depois da troca (a resposta do PUT). */
  @Output() readonly trocou = new EventEmitter<PeTrilhaOrgao>();

  opcoes: OpcaoDaForma[] = [];
  /** A forma marcada no grupo (a escolha só vale no botão). */
  escolhida: number | null = null;
  gravando = false;
  erro: string | null = null;
  private focoPendente: string | null = null;

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['passo'] || mudancas['nivelBaseId']) {
      const antes = mudancas['passo']?.previousValue as PePassoTrilha | undefined;
      this.opcoes = opcoesDaForma(this.passo?.OpcoesDetalhe, this.nivelBaseId);
      // Outro passo, ou a forma em uso mudou: a marcação volta à forma em uso
      if (!antes || antes.Id !== this.passo.Id || antes.Detalhe?.NivelId !== this.passo.Detalhe?.NivelId) {
        this.escolhida = this.emUsoId;
        if (antes && antes.Id !== this.passo.Id) this.erro = null;
      }
    }
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  get idBase(): string {
    return `pe-forma-${this.passo.Id}`;
  }

  /** A forma em uso: a do servidor; sem ela, a padrão. */
  get emUsoId(): number | null {
    return this.passo?.Detalhe?.NivelId ?? this.opcoes.find(o => o.padrao)?.nivelId ?? null;
  }

  get emUso(): OpcaoDaForma | null {
    return this.opcoes.find(o => o.nivelId === this.emUsoId) ?? null;
  }

  /** As formas que não estão em uso (a lista de quem só lê). */
  get outras(): OpcaoDaForma[] {
    return this.opcoes.filter(o => o.nivelId !== this.emUsoId);
  }

  /** A marcação é outra forma que a em uso: o botão vale. */
  get mudou(): boolean {
    return this.escolhida !== null && this.escolhida !== this.emUsoId;
  }

  idOpcao(o: OpcaoDaForma): string {
    return `${this.idBase}-opcao-${o.nivelId}`;
  }

  escolher(o: OpcaoDaForma): void {
    this.escolhida = o.nivelId;
  }

  porNivel(_: number, o: OpcaoDaForma): number {
    return o.nivelId;
  }

  usar(): void {
    if (this.gravando || !this.podeTrocar || !this.mudou) return;
    const alvo = this.opcoes.find(o => o.nivelId === this.escolhida);
    if (!alvo) return;
    const trocar = () => this.gravar(alvo);
    if (!this.mudancaPendente) {
      trocar();
      return;
    }
    this.confirmacao.perguntarDescarte(
      'Há mudanças não salvas neste passo. Se trocar a forma, elas se perdem.',
      'Trocar sem salvar', 'Trocar a forma sem salvar?'
    ).then(sim => {
      if (sim) trocar();
    });
  }

  private gravar(alvo: OpcaoDaForma): void {
    if (this.gravando) return;
    this.gravando = true;
    this.erro = null;
    // A forma padrão vai como nula: o servidor apaga a escolha e o passo segue o padrão
    this.orgaosService.definirDetalhe(this.orgaoId, this.passo.Id, alvo.padrao ? null : alvo.nivelId).subscribe({
      next: trilha => {
        this.gravando = false;
        // Um aviso só: o toast já é lido pelo leitor de tela
        this.notificacoes.success(alvo.padrao
          ? `O passo ${this.passo.Numero} voltou à forma padrão (${alvo.nome}).`
          : `O passo ${this.passo.Numero} agora está na forma do nível ${alvo.nome}.`);
        this.focoPendente = `${this.idBase}-titulo`;
        this.trocou.emit(trilha);
      },
      error: erro => {
        this.gravando = false;
        this.erro = mensagemErroPe(erro, 'Não foi possível trocar a forma do passo. Tente de novo.');
        if (this.erro) this.focoPendente = `${this.idBase}-erro`;
      }
    });
  }
}
