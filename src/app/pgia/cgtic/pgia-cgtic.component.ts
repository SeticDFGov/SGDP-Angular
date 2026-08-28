import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, PapeisPgia, Perfis } from '../../auth/services/auth';
import { UserProfile } from '../../../api/auth/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PgiaGovernancaService, PgiaSistemaResumo } from '../services/pgia-governanca.service';
import { PgiaAbasComponent } from '../shared/pgia-abas.component';
import { PgiaChecklistAbertoComponent } from '../shared/pgia-checklist-aberto.component';
import {
  PgiaDeliberacao,
  PgiaDeliberacaoForm,
  PgiaHomologacaoPendente,
  RESULTADOS_DELIBERACAO,
  TIPOS_DELIBERACAO
} from '../../../api/pgia/interface';

/** Rótulos do mock, com a referência ao artigo; o valor gravado é o da lista de domínio. */
const ROTULOS_TIPO: Record<string, string> = {
  'Classificação de sistema como Alto Risco': 'Classificação de sistema como Alto Risco (proposta da SGDI)',
  'Autorização de treinamento com dados do GDF': 'Autorização de treinamento com dados do GDF (art. 21)',
  'Ampliação do rol de Alto Risco': 'Ampliação do rol de Alto Risco (art. 16, § 2º)',
  'Aprovação do Guia de Contratações': 'Aprovação do Guia de Contratações (art. 26)',
  'Suspensão de sistema': 'Suspensão de sistema (art. 30, parágrafo único)'
};

/** Tipos de deliberação que fazem o backend mudar a situação de homologação do sistema. */
const TIPOS_QUE_MUDAM_HOMOLOGACAO: string[] = [
  'Classificação de sistema como Alto Risco',
  'Aprovação de aquisição de Alto Risco'
];

@Component({
  selector: 'app-pgia-cgtic',
  standalone: true,
  imports: [CommonModule, FormsModule, PgiaAbasComponent, PgiaChecklistAbertoComponent],
  templateUrl: './pgia-cgtic.component.html'
})
export class PgiaCgticComponent implements OnInit {
  user: UserProfile | null = null;
  loading = true;
  temAcesso = false;

  tipos = TIPOS_DELIBERACAO.map(v => ({ valor: v, rotulo: ROTULOS_TIPO[v] ?? v }));
  resultados = RESULTADOS_DELIBERACAO;

  // Fila delegada ao comitê
  fila: PgiaHomologacaoPendente[] = [];
  carregandoFila = false;
  expandido: number | null = null;

  // Demais sistemas do inventário, para deliberações que não vêm da fila
  todosSistemas: PgiaSistemaResumo[] = [];

  // Deliberações registradas
  deliberacoes: PgiaDeliberacao[] = [];

  form = this.novoForm();
  submetido = false;
  salvando = false;

  constructor(
    private authService: AuthService,
    private governancaService: PgiaGovernancaService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      this.user = user;
      const papel = user?.PapelPgia ?? null;
      const isAdmin = user?.Perfil === Perfis.Admin;
      this.temAcesso = isAdmin || papel === PapeisPgia.Cgtic;
      this.loading = false;
      if (this.temAcesso) {
        this.carregarFila();
        this.carregarDeliberacoes();
        this.carregarSistemas();
      }
    });
  }

  private novoForm() {
    return {
      Tipo: 'Classificação de sistema como Alto Risco' as string,
      SistemaIaId: null as number | null,
      DataDeliberacao: '',
      Resultado: '' as string,
      NumeroAto: '',
      Ementa: ''
    };
  }

  carregarFila(): void {
    this.carregandoFila = true;
    this.governancaService.listarHomologacoes('Aguardando deliberação do CGTIC').subscribe({
      next: (lista) => { this.fila = lista; this.carregandoFila = false; },
      error: () => {
        this.carregandoFila = false;
        this.notificationService.error('Não foi possível carregar os casos delegados ao comitê.');
      }
    });
  }

  carregarSistemas(): void {
    this.governancaService.listarSistemasGovernanca().subscribe({
      next: (lista) => this.todosSistemas = lista,
      error: () => this.notificationService.error('Não foi possível carregar a lista de sistemas.')
    });
  }

  /** Sistemas fora da fila delegada: entram no segundo grupo do select de objeto. */
  get demaisSistemas(): PgiaSistemaResumo[] {
    const naFila = new Set(this.fila.map(f => f.Sistema.Id));
    return this.todosSistemas.filter(s => !naFila.has(s.Id));
  }

  carregarDeliberacoes(): void {
    this.governancaService.listarDeliberacoes().subscribe({
      next: (lista) => this.deliberacoes = lista,
      error: () => this.notificationService.error('Não foi possível carregar as deliberações registradas.')
    });
  }

  alternarDetalhe(item: PgiaHomologacaoPendente): void {
    this.expandido = this.expandido === item.Sistema.Id ? null : item.Sistema.Id;
  }

  /** Atalho do card da fila: já deixa o formulário de deliberação pronto para o caso. */
  prepararDeliberacao(item: PgiaHomologacaoPendente): void {
    this.form = this.novoForm();
    this.form.Tipo = 'Classificação de sistema como Alto Risco';
    this.form.SistemaIaId = item.Sistema.Id;
    this.submetido = false;
    this.notificationService.info(
      `Formulário preparado para ${item.Sistema.Denominacao}. Complete a data e o resultado abaixo.`);
  }

  badgeClasse(risco: string | null): string {
    switch (risco) {
      case 'Risco Excessivo': return 'bg-red-100 text-red-800';
      case 'Alto Risco': return 'bg-orange-100 text-orange-800';
      case 'Risco Moderado': return 'bg-yellow-100 text-yellow-800';
      case 'Baixo Risco': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  badgeResultado(resultado: string): string {
    switch (resultado) {
      case 'Favorável': return 'bg-green-100 text-green-800';
      case 'Desfavorável': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800'; // Em diligência
    }
  }

  /** O mock pede número e ementa quando a deliberação vira resolução. */
  get ehResolucao(): boolean {
    return this.form.Tipo === 'Resolução normativa';
  }

  get errData(): boolean { return this.submetido && !this.form.DataDeliberacao; }
  get errResultado(): boolean { return this.submetido && !this.form.Resultado; }
  get errNumeroAto(): boolean { return this.submetido && this.ehResolucao && !this.form.NumeroAto.trim(); }
  get errEmenta(): boolean { return this.submetido && this.ehResolucao && !this.form.Ementa.trim(); }

  registrarDeliberacao(): void {
    this.submetido = true;
    if (this.errData || this.errResultado || this.errNumeroAto || this.errEmenta) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    const sistemaId = this.form.SistemaIaId ? Number(this.form.SistemaIaId) : null;
    // A homologação só muda quando a decisão é sobre um caso que está na fila do
    // comitê e o tipo é de classificação/aquisição de Alto Risco.
    const tipoMudaHomologacao = TIPOS_QUE_MUDAM_HOMOLOGACAO.includes(this.form.Tipo);
    const veioDaFila = sistemaId !== null && this.fila.some(f => f.Sistema.Id === sistemaId);
    const emDiligencia = this.form.Resultado === 'Em diligência';
    const payload: PgiaDeliberacaoForm = {
      Tipo: this.form.Tipo,
      SistemaIaId: sistemaId,
      DataDeliberacao: this.form.DataDeliberacao,
      Resultado: this.form.Resultado,
      NumeroAto: this.ehResolucao ? (this.form.NumeroAto.trim() || null) : null,
      Ementa: this.ehResolucao ? (this.form.Ementa.trim() || null) : null
    };
    this.salvando = true;
    this.governancaService.criarDeliberacao(payload).subscribe({
      next: () => {
        this.salvando = false;
        this.form = this.novoForm();
        this.submetido = false;
        this.carregarFila();
        this.carregarDeliberacoes();
        const base = 'Deliberação registrada. Os órgãos interessados serão notificados.';
        let mensagem = base;
        if (tipoMudaHomologacao && veioDaFila) {
          mensagem = emDiligencia
            ? base + ' O sistema segue aguardando o comitê.'
            : base + ' A homologação do sistema foi atualizada conforme o resultado.';
        }
        this.notificationService.success(mensagem);
      },
      error: () => {
        this.salvando = false;
        this.notificationService.error('Não foi possível registrar a deliberação.');
      }
    });
  }
}
