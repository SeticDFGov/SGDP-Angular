import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PgiaPublicoService } from '../services/pgia-publico.service';
import {
  PgiaRegistroPublicoItem,
  PgiaSolicitacaoPublica,
  TIPOS_SOLICITACAO
} from '../../../api/pgia/interface';

/**
 * Página pública de transparência (arts. 23 e 24). Fora do MainLayout, sem guard
 * e sem sessão: nenhum acesso a localStorage ou a serviços autenticados, para
 * renderizar no servidor sem erro.
 */
@Component({
  selector: 'app-pgia-transparencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pgia-transparencia.component.html'
})
export class PgiaTransparenciaComponent implements OnInit {
  @ViewChild('caixaProtocolo') caixaProtocolo?: ElementRef<HTMLElement>;

  tipos = TIPOS_SOLICITACAO;

  // ── Registro Público ──────────────────────────────────────────────────────
  sistemas: PgiaRegistroPublicoItem[] = [];
  carregando = true;
  paginaAtual = 1;
  totalPaginas = 1;
  totalItens = 0;
  carregandoMais = false;
  erroRegistro = false;

  // ── Pedido do cidadão ─────────────────────────────────────────────────────
  form = this.novoForm();
  submetido = false;
  enviando = false;
  protocoloGerado: string | null = null;

  // ── Acompanhamento ────────────────────────────────────────────────────────
  protocoloConsulta = '';
  consultando = false;
  consulta: PgiaSolicitacaoPublica | null = null;
  naoEncontrado = false;

  constructor(private publicoService: PgiaPublicoService) {}

  ngOnInit(): void {
    this.carregarRegistro();
  }

  private novoForm() {
    return {
      SistemaIaId: null as number | null,
      Tipo: '' as string,
      SolicitanteNome: '',
      SolicitanteContato: '',
      ReferenciaDecisao: '',
      Descricao: ''
    };
  }

  carregarRegistro(): void {
    this.carregando = true;
    this.erroRegistro = false;
    this.publicoService.listarRegistroPublico(1).subscribe({
      next: (pagina) => {
        this.sistemas = pagina.Items ?? [];
        this.paginaAtual = pagina.CurrentPage ?? 1;
        this.totalPaginas = pagina.TotalPages ?? 1;
        this.totalItens = pagina.TotalItems ?? this.sistemas.length;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        this.erroRegistro = true;
      }
    });
  }

  get temMaisPaginas(): boolean {
    return this.paginaAtual < this.totalPaginas;
  }

  carregarMais(): void {
    if (!this.temMaisPaginas || this.carregandoMais) return;
    this.carregandoMais = true;
    this.erroCarregarMais = false;
    this.publicoService.listarRegistroPublico(this.paginaAtual + 1).subscribe({
      next: (pagina) => {
        this.sistemas = this.sistemas.concat(pagina.Items ?? []);
        this.paginaAtual = pagina.CurrentPage ?? this.paginaAtual + 1;
        this.totalPaginas = pagina.TotalPages ?? this.totalPaginas;
        this.totalItens = pagina.TotalItems ?? this.totalItens;
        this.carregandoMais = false;
      },
      error: () => {
        this.carregandoMais = false;
        this.erroCarregarMais = true;
      }
    });
  }

  erroCarregarMais = false;

  badgeClasse(risco: string | null): string {
    switch (risco) {
      case 'Risco Excessivo': return 'bg-red-100 text-red-800';
      case 'Alto Risco': return 'bg-orange-100 text-orange-800';
      case 'Risco Moderado': return 'bg-yellow-100 text-yellow-800';
      case 'Baixo Risco': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  badgeStatus(status: string): string {
    switch (status) {
      case 'Respondida': return 'bg-green-100 text-green-800';
      case 'Em análise': return 'bg-indigo-100 text-indigo-800';
      case 'Encaminhada ao Encarregado de Dados': return 'bg-purple-100 text-purple-800';
      default: return 'bg-blue-100 text-blue-800'; // Recebida
    }
  }

  // ── Pedido ────────────────────────────────────────────────────────────────

  get errSistema(): boolean { return this.submetido && !this.form.SistemaIaId; }
  get errTipo(): boolean { return this.submetido && !this.form.Tipo; }
  get errNome(): boolean { return this.submetido && !this.form.SolicitanteNome.trim(); }
  get errContato(): boolean { return this.submetido && !this.form.SolicitanteContato.trim(); }
  get errDescricao(): boolean { return this.submetido && !this.form.Descricao.trim(); }

  // Mensagem sem jargão: quem lê esta página não é servidor.
  readonly avisoCamposEmBranco =
    'Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.';
  mensagemAviso: string | null = null;

  enviarPedido(): void {
    this.submetido = true;
    this.mensagemAviso = null;
    if (this.errSistema || this.errTipo || this.errNome || this.errContato || this.errDescricao) {
      this.mensagemAviso = this.avisoCamposEmBranco;
      return;
    }
    this.enviando = true;
    this.publicoService.enviarSolicitacao({
      SistemaIaId: Number(this.form.SistemaIaId),
      Tipo: this.form.Tipo,
      SolicitanteNome: this.form.SolicitanteNome.trim(),
      SolicitanteContato: this.form.SolicitanteContato.trim(),
      ReferenciaDecisao: this.form.ReferenciaDecisao.trim() || null,
      Descricao: this.form.Descricao.trim()
    }).subscribe({
      next: (resposta) => {
        this.enviando = false;
        this.protocoloGerado = resposta?.Protocolo ?? null;
        this.form = this.novoForm();
        this.submetido = false;
        // Handler de clique: só roda no browser.
        setTimeout(() => this.caixaProtocolo?.nativeElement?.scrollIntoView({ behavior: 'smooth' }));
      },
      error: () => {
        this.enviando = false;
        this.mensagemAviso = 'Não foi possível enviar o seu pedido agora. Tente de novo em alguns minutos.';
      }
    });
  }

  // ── Acompanhamento ────────────────────────────────────────────────────────

  consultarProtocolo(): void {
    const protocolo = this.protocoloConsulta.trim();
    this.consulta = null;
    this.naoEncontrado = false;
    this.erroConsulta = false;
    if (!protocolo) return;
    this.consultando = true;
    this.publicoService.consultarProtocolo(protocolo).subscribe({
      next: (dados) => {
        this.consultando = false;
        this.consulta = dados;
      },
      error: (err) => {
        this.consultando = false;
        // 404 é "protocolo não existe"; o resto é falha de rede/servidor
        if (err?.status === 404) this.naoEncontrado = true;
        else this.erroConsulta = true;
      }
    });
  }

  erroConsulta = false;
}
