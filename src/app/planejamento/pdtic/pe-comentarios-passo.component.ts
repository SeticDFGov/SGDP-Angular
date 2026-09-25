import {
  AfterViewChecked, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, PLATFORM_ID, inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PeComentario } from '../../../api/planejamento/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PePdticService } from '../services/pe-pdtic.service';
import { mensagemErroPe } from '../shared/pe-erros';
import { plural } from '../shared/pe-pdtic-rotulos';
import { quandoEQuem } from '../shared/pe-referenciais-rotulos';
import { textoDataHora } from '../shared/registros/pe-valores';

/** Tamanho do comentário e da resposta (o servidor confere de novo). */
const MAX_TEXTO = 2000;

/**
 * Comentários de um passo do PDTIC: a SGDI (administrador do módulo, equipe da
 * SGDI e admin do SGDP) comenta; a equipe do órgão responde e marca como
 * resolvido; quem escreveu o comentário também o resolve. Comentário aberto põe
 * o passo em "atenção" na trilha do órgão (por isso cada mudança avisa a tela,
 * que busca a situação de novo). Os resolvidos ficam num bloco que abre e fecha.
 */
@Component({
  selector: 'app-pe-comentarios-passo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pe-comentarios-passo.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeComentariosPassoComponent implements OnChanges, AfterViewChecked, OnDestroy {
  private readonly pdticService = inject(PePdticService);
  private readonly notificacoes = inject(NotificationService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) pdticId!: number;
  @Input({ required: true }) passoId!: number;
  /** Escreve comentário novo (SGDI). */
  @Input() podeComentar = false;
  /** Responde e resolve (equipe do órgão). */
  @Input() podeResponder = false;
  /** E-mail de quem está logado: o autor também resolve o próprio comentário. */
  @Input() email: string | null = null;
  @Output() readonly mudou = new EventEmitter<void>();

  readonly maxTexto = MAX_TEXTO;

  comentarios: PeComentario[] = [];
  carregando = false;
  erroCarga: string | null = null;

  novo = '';
  erroNovo: string | null = null;
  enviandoNovo = false;

  /** Comentário com a resposta aberta. */
  respondendo: number | null = null;
  resposta = '';
  erroResposta: string | null = null;
  enviandoResposta = false;
  resolvendo: number | null = null;

  private carga?: Subscription;
  private carregado = '';
  private focoPendente: string | null = null;

  ngOnChanges(): void {
    const chave = `${this.pdticId}|${this.passoId}`;
    if (chave === this.carregado) return;
    this.carregado = chave;
    this.comentarios = [];
    this.respondendo = null;
    this.novo = '';
    this.erroNovo = null;
    this.carregar();
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  ngOnDestroy(): void {
    this.carga?.unsubscribe();
  }

  get idBase(): string {
    return `pe-coment-${this.passoId}`;
  }

  get abertos(): PeComentario[] {
    return this.comentarios.filter(c => !c.ResolvidoEm);
  }

  get resolvidos(): PeComentario[] {
    return this.comentarios.filter(c => !!c.ResolvidoEm);
  }

  get resumo(): string {
    const n = this.abertos.length;
    return n === 0 ? 'Nenhum comentário aberto.' : `${plural(n, 'comentário aberto', 'comentários abertos')}.`;
  }

  autor(nome: string | null, email: string | null): string {
    return nome?.trim() || email?.trim() || 'Autor não informado';
  }

  respostas(c: PeComentario): PeComentario['Respostas'] {
    return c.Respostas ?? [];
  }

  quando(valor: string): string {
    return textoDataHora(valor);
  }

  resolvidoEm(c: PeComentario): string {
    return quandoEQuem(c.ResolvidoEm, c.ResolvidoPor, c.ResolvidoPorNome);
  }

  /** A equipe do órgão resolve; quem escreveu o comentário também. */
  podeResolver(c: PeComentario): boolean {
    if (c.ResolvidoEm) return false;
    if (this.podeResponder) return true;
    const meu = this.email?.trim().toLowerCase();
    return !!meu && c.AutorEmail?.trim().toLowerCase() === meu;
  }

  porId(_: number, c: { Id: number }): number {
    return c.Id;
  }

  carregar(): void {
    this.carga?.unsubscribe();
    this.carregando = true;
    this.erroCarga = null;
    this.carga = this.pdticService.comentarios(this.pdticId, this.passoId).subscribe({
      next: lista => {
        this.carregando = false;
        this.comentarios = [...lista].sort((a, b) => a.CriadoEm.localeCompare(b.CriadoEm));
      },
      error: erro => {
        this.carregando = false;
        this.erroCarga = mensagemErroPe(erro, 'Não foi possível carregar os comentários deste passo.');
      }
    });
  }

  private conferir(texto: string, vazio: string): string | null {
    const t = texto.trim();
    if (!t) return vazio;
    return t.length > MAX_TEXTO ? `Escreva até ${MAX_TEXTO} caracteres (agora são ${t.length}).` : null;
  }

  comentar(): void {
    if (this.enviandoNovo || !this.podeComentar) return;
    this.erroNovo = this.conferir(this.novo, 'Escreva o comentário.');
    if (this.erroNovo) {
      this.focoPendente = `${this.idBase}-novo`;
      return;
    }
    this.enviandoNovo = true;
    this.pdticService.comentar(this.pdticId, { PassoId: this.passoId, PaiId: null, Texto: this.novo.trim() }).subscribe({
      next: () => {
        this.enviandoNovo = false;
        this.novo = '';
        // Um aviso só: o toast já é lido pelo leitor de tela (F1, B05)
        this.notificacoes.success('Comentário enviado. A equipe do órgão vê o aviso na trilha.');
        this.carregar();
        this.mudou.emit();
      },
      error: erro => {
        this.enviandoNovo = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível enviar o comentário. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  abrirResposta(c: PeComentario): void {
    this.respondendo = c.Id;
    this.resposta = '';
    this.erroResposta = null;
    this.focoPendente = `${this.idBase}-resposta-${c.Id}`;
  }

  cancelarResposta(c: PeComentario): void {
    this.respondendo = null;
    this.focoPendente = `${this.idBase}-responder-${c.Id}`;
  }

  responder(c: PeComentario): void {
    if (this.enviandoResposta || !this.podeResponder) return;
    this.erroResposta = this.conferir(this.resposta, 'Escreva a resposta.');
    if (this.erroResposta) {
      this.focoPendente = `${this.idBase}-resposta-${c.Id}`;
      return;
    }
    this.enviandoResposta = true;
    this.pdticService.comentar(this.pdticId, { PassoId: this.passoId, PaiId: c.Id, Texto: this.resposta.trim() }).subscribe({
      next: () => {
        this.enviandoResposta = false;
        this.respondendo = null;
        this.resposta = '';
        this.notificacoes.success('Resposta enviada.');
        // O formulário da resposta sai da tela: o foco volta ao "Responder" do comentário (F1, B01)
        this.focoPendente = `${this.idBase}-responder-${c.Id}`;
        this.carregar();
        this.mudou.emit();
      },
      error: erro => {
        this.enviandoResposta = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível enviar a resposta. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  resolver(c: PeComentario): void {
    if (this.resolvendo !== null || !this.podeResolver(c)) return;
    this.resolvendo = c.Id;
    this.pdticService.resolverComentario(c.Id).subscribe({
      next: () => {
        this.resolvendo = null;
        this.notificacoes.success('Comentário marcado como resolvido.');
        this.focoPendente = `${this.idBase}-titulo`;
        this.carregar();
        this.mudou.emit();
      },
      error: erro => {
        this.resolvendo = null;
        const mensagem = mensagemErroPe(erro, 'Não foi possível marcar como resolvido. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }
}
