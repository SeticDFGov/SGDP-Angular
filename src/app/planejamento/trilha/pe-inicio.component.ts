import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AcessibilidadeService } from '../../core/acessibilidade/acessibilidade.service';
import { NotificationService } from '../../core/services/notification.service';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import { mensagemErroDownload, salvarResposta } from '../shared/pe-download';
import { classeSituacaoPdtic, resumoAndamento, rotuloSituacaoPdtic } from '../shared/pe-pdtic-rotulos';
import { textoVigencia } from '../shared/pe-referenciais-rotulos';
import { PeRegistrosService } from '../services/pe-registros.service';
import { EstadoTrilhaPe, PeTrilhaEstadoService } from './pe-trilha-estado.service';
import { EstadoPassoPe, StatusPassoPe } from './pe-trilha-status.service';
import { ATALHOS_REFERENCIAIS, PassoNumeradoPe, rotuloGuia } from './pe-trilhas';
import { papelPlanejamentoDeOrgao, rotuloCurtoPapelPlanejamento } from '../../core/acessos/papeis-planejamento';

/**
 * Visão geral da Governança Estratégica (primeira tela do módulo): o que o módulo
 * faz, em linguagem simples, o papel e o órgão de quem está logado (e, na trilha
 * de um órgão, o nível de maturidade dele), o próximo passo recomendado e todas
 * as etapas e passos numerados, com a situação de cada um (ou "em construção",
 * para os passos cuja tela chega nas próximas entregas). Acesso rápido aos
 * referenciais do DF (princípios, PETIC-DF e diretrizes do ciclo), que todo papel
 * lê, e às deliberações do CGTIC, que só os papéis globais veem.
 *
 * Na trilha de um órgão (E4), o bloco do PDTIC: sem PDTIC aberto, a equipe do
 * órgão vê "Começar o PDTIC" (os demais, só o aviso); aberto, a versão, a
 * situação, a vigência, o andamento dos passos e a planilha completa. O próximo
 * passo e a situação de cada passo vêm do servidor (GET pdtic/{id}/situacao).
 */
@Component({
  selector: 'app-pe-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule, CitaPlanejamentoDirective],
  templateUrl: './pe-inicio.component.html'
})
export class PeInicioComponent implements OnInit {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly registrosService = inject(PeRegistrosService);
  private readonly notificacoes = inject(NotificationService);
  private readonly acessibilidade = inject(AcessibilidadeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  estado: EstadoTrilhaPe | null = null;
  abrindo = false;
  baixando = false;

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => this.estado = estado);
    // A visão geral sempre mostra a situação atualizada
    this.estadoService.atualizarStatus(true);
  }

  passosDaEtapa(indice: number): PassoNumeradoPe[] {
    return this.estado?.passos.filter(p => p.etapa === indice) ?? [];
  }

  status(passo: PassoNumeradoPe): StatusPassoPe | null {
    return this.estadoService.statusDoPasso(passo);
  }

  guia(passo: PassoNumeradoPe): string {
    return rotuloGuia(passo.guia);
  }

  /** Referenciais do DF para todos; as deliberações, só para quem pode vê-las (o papel já chegou). */
  get atalhos(): typeof ATALHOS_REFERENCIAIS {
    const globais = this.estadoService.veDeliberacoes === true;
    return ATALHOS_REFERENCIAIS.filter(a => !a.soGlobais || globais);
  }

  get temStatus(): boolean {
    return !!this.estado?.passos.some(p => !!p.status);
  }

  get trilhaDeOrgao(): boolean {
    return this.estado?.perfil === 'orgao';
  }

  get carregandoStatus(): boolean {
    const e = this.estado;
    if (!e) return false;
    if (e.perfil === 'orgao') return e.cargaPdtic === 'carregando' || (e.cargaPdtic === 'ok' && !e.situacao);
    return this.temStatus && !e.situacao;
  }

  /**
   * Próximo passo. Na trilha de um órgão, o que o servidor recomenda (nenhum sem
   * PDTIC aberto). Nas centrais, o primeiro vencido; senão o primeiro com fila
   * esperando; senão o primeiro pendente, na ordem da trilha; trilha sem situação
   * alguma (os passos ainda sem tela) começa pelo primeiro passo. Nada esperando = nenhum.
   */
  get recomendado(): PassoNumeradoPe | null {
    const e = this.estado;
    if (!e) return null;
    if (e.perfil === 'orgao') {
      const proximo = e.situacao?.andamento?.ProximoPasso;
      return proximo ? e.passos.find(p => p.numero === proximo) ?? null : null;
    }
    if (!this.temStatus) return e.passos[0] ?? null;
    for (const alvo of ['atrasado', 'atencao', 'pendente'] as EstadoPassoPe[]) {
      const passo = e.passos.find(p => this.status(p)?.estado === alvo);
      if (passo) return passo;
    }
    return null;
  }

  /** "Nada esperando": nas centrais, sem recomendado; no órgão, com PDTIC e sem próximo passo. */
  get nadaEsperando(): boolean {
    const e = this.estado;
    if (!e || this.recomendado || this.carregandoStatus) return false;
    if (e.perfil === 'orgao') return !!e.situacao?.andamento;
    return true;
  }

  // ── Papel e órgão ─────────────────────────────────────────────────────────

  get rotuloPapel(): string {
    const e = this.estado;
    if (!e) return '';
    if (e.adminGeral) return 'Administrador do SGDP: vê todas as trilhas e tudo no módulo';
    return rotuloCurtoPapelPlanejamento(e.meuPapel?.Papel);
  }

  /** Nível de maturidade na trilha de um órgão (a do órgão da pessoa ou a do órgão à vista). */
  get rotuloNivel(): string | null {
    const t = this.estado?.trilhaOrgao;
    if (!t) return null;
    return t.NivelPadrao ? `${t.NivelNome} (o padrão, até o administrador do módulo definir o nível do órgão)` : t.NivelNome;
  }

  /** "SES · Secretaria de Estado de Saúde" ou "Todos os órgãos" para os papéis centrais. */
  get rotuloOrgao(): string {
    const papel = this.estado?.meuPapel;
    if (this.estado?.adminGeral || !papelPlanejamentoDeOrgao(papel?.Papel)) return 'Todos os órgãos';
    if (!papel?.OrgaoId) return 'Nenhum órgão ligado à sua unidade';
    return [papel.OrgaoSigla, papel.OrgaoNome].filter(Boolean).join(' · ');
  }

  // ── PDTIC do órgão ────────────────────────────────────────────────────────

  get siglaOrgao(): string {
    return this.estado?.trilhaOrgao?.OrgaoSigla ?? this.estado?.meuPapel?.OrgaoSigla ?? '';
  }

  get podeAbrirPdtic(): boolean {
    return this.estadoService.podeAbrirPdtic;
  }

  /** Quem vê o órgão sem PDTIC e não pode abrir: o motivo. */
  get quemAbre(): string {
    const e = this.estado;
    if (e?.orgaoVisto !== null) return 'Quem começa o PDTIC é a equipe do órgão, na trilha dela. Aqui você só lê.';
    return 'Quem começa o PDTIC é a equipe do órgão. O seu papel de consulta só lê.';
  }

  rotuloSituacao(situacao: string): string {
    return rotuloSituacaoPdtic(situacao);
  }

  classeSituacao(situacao: string): string {
    return classeSituacaoPdtic(situacao);
  }

  vigencia(): string {
    const p = this.estado?.pdtic;
    if (!p) return '-';
    const texto = textoVigencia(p);
    return texto === '-' ? 'Ainda não informada (passo 1.1)' : texto;
  }

  get andamento(): { feitos: number; total: number } | null {
    const andamento = this.estado?.situacao?.andamento;
    if (!andamento) return null;
    const resumo = resumoAndamento(andamento);
    return resumo.total > 0 ? resumo : null;
  }

  abrirPdtic(): void {
    if (this.abrindo || !this.podeAbrirPdtic) return;
    this.abrindo = true;
    this.estadoService.abrirPdtic().subscribe({
      next: pdtic => {
        this.abrindo = false;
        this.notificacoes.success(`PDTIC ${pdtic.Versao} aberto. Siga os passos da trilha, a partir do primeiro.`);
        this.acessibilidade.anunciar(`PDTIC ${pdtic.Versao} aberto.`);
      },
      error: erro => {
        this.abrindo = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível começar o PDTIC. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
        // 409: alguém da equipe abriu antes; o PDTIC atual vem de novo
        if ((erro as { status?: number } | null)?.status === 409) this.estadoService.recarregarPdtic();
      }
    });
  }

  tentarPdticDeNovo(): void {
    this.estadoService.recarregarPdtic();
  }

  /** O XLSX do PDTIC com uma aba por seção e a aba Leia-me (por blob, com o nome do servidor). */
  baixarCompleta(): void {
    const p = this.estado?.pdtic;
    if (!p || this.baixando) return;
    this.baixando = true;
    this.registrosService.planilhaCompleta({ tipo: 'pdtic', id: p.Id }).subscribe({
      next: resposta => {
        this.baixando = false;
        salvarResposta(resposta, `PDTIC_${p.OrgaoSigla}_completa.xlsx`);
      },
      error: erro => {
        this.baixando = false;
        mensagemErroDownload(erro, 'Não foi possível gerar a planilha completa. Tente de novo.').then(m => {
          if (m) this.notificacoes.error(m);
        });
      }
    });
  }

  classeEstado(estado: EstadoPassoPe | undefined): string {
    switch (estado) {
      case 'feito': return 'bg-green-50 text-green-800 border-green-200';
      case 'atrasado': return 'bg-red-50 text-red-800 border-red-200';
      case 'atencao': return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'pendente': return 'bg-blue-50 text-blue-800 border-blue-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  }

  irPara(passo: PassoNumeradoPe): void {
    this.router.navigate([passo.rota], { queryParams: { passo: passo.numero } });
  }
}
