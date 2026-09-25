import { AfterViewChecked, Component, DestroyRef, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PePdtic } from '../../../api/planejamento/interface';
import { NotificationService } from '../../core/services/notification.service';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import { mensagemErroDownload, salvarResposta } from '../shared/pe-download';
import { PdfDoPdtic, baixarPdfDoPdtic, pdfDoPdtic, rotuloPdfDoPdtic } from '../shared/pe-pdf-pdtic';
import {
  SECAO_AVALIACAO_COMITE, classeEstadoPasso, classeSituacaoPdtic, minusculaInicial, pdticAntesDaPublicacao, pdticDepoisDaPublicacao,
  pdticVigente, quandoMarcoPdtic, quandoPdtic, resumoAndamento, rotuloSituacaoPdtic, situacaoDaVersaoNaFrase, textoDoStatus, vigenciaTerminou
} from '../shared/pe-pdtic-rotulos';
import { textoAto, textoVigencia } from '../shared/pe-referenciais-rotulos';
import { hojeIso } from '../shared/registros/pe-valores';
import { PePdticService } from '../services/pe-pdtic.service';
import { PeRegistrosService } from '../services/pe-registros.service';
import { PeAcaoPdticComponent } from '../pdtic/pe-acao-pdtic.component';
import { PeRegistroExternoComponent } from '../pdtic/pe-registro-externo.component';
import { PePainelAcompanhamentoComponent } from '../acompanhamento/pe-painel-acompanhamento.component';
import { PeInadimplenciasOrgaoComponent } from '../inadimplencia/pe-inadimplencias-orgao.component';
import { EstadoTrilhaPe, PeTrilhaEstadoService } from './pe-trilha-estado.service';
import { EstadoPassoPe, StatusPassoPe } from './pe-trilha-status.service';
import { ATALHOS_ACOMPANHAMENTO, ATALHOS_REFERENCIAIS, PassoNumeradoPe, rotaPaginaOrgao, rotuloGuia } from './pe-trilhas';
import { papelPlanejamentoDeOrgao, rotuloCurtoPapelPlanejamento } from '../../core/acessos/papeis-planejamento';

/** Link para um passo da trilha à vista. */
interface LinkPasso {
  rota: string;
  numero: string;
}

/**
 * Visão geral da Governança Estratégica (primeira tela do módulo): o que o módulo
 * faz, em linguagem simples, o papel e o órgão de quem está logado (e, na trilha
 * de um órgão, o nível de maturidade dele), o próximo passo recomendado e todas
 * as etapas e passos numerados, com a situação de cada um. Acesso rápido aos
 * referenciais do DF (princípios, PETIC-DF e diretrizes do ciclo), que todo papel
 * lê, e às deliberações do CGTIC, que só os papéis globais veem.
 *
 * E8: para os papéis globais e o admin do SGDP, o acesso rápido ao acompanhamento
 * dos órgãos (painel, conformidade, árvore do PETIC-DF, páginas dos órgãos e
 * inadimplências); para a equipe e a consulta do órgão, as notificações da SGDI ao
 * próprio órgão (só leitura, num pacote próprio pelo `@defer`) e o link para a
 * página do órgão.
 *
 * Na trilha de um órgão (E4), o bloco do PDTIC: sem PDTIC aberto, a equipe do
 * órgão vê "Começar o PDTIC" (os demais, só o aviso); aberto, a versão, a
 * situação, a vigência, o andamento dos passos e a planilha completa. O próximo
 * passo e a situação de cada passo vêm do servidor (GET pdtic/{id}/situacao).
 *
 * E7: sem PDTIC, também "Registrar um PDTIC aprovado fora do sistema" (a equipe
 * do órgão e o admin do SGDP; o formulário carrega num pacote próprio, pelo
 * `@defer`); com PDTIC, a faixa da situação (enviado, devolvido com o que
 * ajustar, aprovado, encerrado, revisão em andamento, registrado fora do
 * sistema), as datas do caminho da aprovação, o PDF enviado, a escolha entre a
 * versão em revisão e a vigente, "Encerrar o PDTIC" para o administrador quando a
 * vigência terminou e "Abrir a revisão" para o órgão sem a avaliação do comitê.
 *
 * E7 rodada B: depois da publicação, o painel de acompanhamento do PDTIC
 * (AC-PDTIC): metas e ações com os percentuais e a situação em texto, e os
 * quadros dos riscos (num pacote próprio, pelo `@defer`).
 */
@Component({
  selector: 'app-pe-inicio',
  standalone: true,
  imports: [
    CommonModule, RouterModule, CitaPlanejamentoDirective, PeAcaoPdticComponent, PeRegistroExternoComponent,
    PePainelAcompanhamentoComponent, PeInadimplenciasOrgaoComponent
  ],
  templateUrl: './pe-inicio.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeInicioComponent implements OnInit, AfterViewChecked {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly registrosService = inject(PeRegistrosService);
  private readonly pdticService = inject(PePdticService);
  private readonly notificacoes = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  estado: EstadoTrilhaPe | null = null;
  abrindo = false;
  baixando = false;
  baixandoPdf = false;
  /** E7: o formulário do PDTIC aprovado fora do sistema está aberto. */
  formExterno = false;
  private readonly hoje = hojeIso();
  private focoPendente: string | null = null;
  // Objetos estáveis para os *ngIf do template (objeto novo a cada verificação daria NG0100)
  private pdfDe: PePdtic | null = null;
  private pdfCache: PdfDoPdtic | null = null;
  private passosVistos: unknown = null;
  private linksCache: { envio: LinkPasso | null; publicacao: LinkPasso | null; avaliacao: LinkPasso | null; etapa2: LinkPasso | null } =
    { envio: null, publicacao: null, avaliacao: null, etapa2: null };

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        this.estado = estado;
        // O órgão ganhou PDTIC (ou a trilha mudou): o formulário do registro externo sai, e o foco vai ao bloco do PDTIC
        // (o formulário tinha o foco; sem isso, ele cairia na página, F1, C11)
        if (estado?.cargaPdtic !== 'sem-pdtic' && this.formExterno) {
          this.formExterno = false;
          this.focoPendente = 'pe-inicio-pdtic-titulo';
        }
      });
    // A visão geral sempre mostra a situação atualizada
    this.estadoService.atualizarStatus(true);
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
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

  /** E8: o acompanhamento de todos os órgãos, para os papéis globais e o admin do SGDP (o papel já chegou). */
  get atalhosAcompanhamento(): typeof ATALHOS_ACOMPANHAMENTO | null {
    return this.estadoService.veTodosOsOrgaos === true ? ATALHOS_ACOMPANHAMENTO : null;
  }

  /** E8: a equipe e a consulta do órgão, na própria trilha, veem as notificações da SGDI ao órgão (só leitura). */
  get orgaoDasNotificacoes(): number | null {
    const e = this.estado;
    return e?.perfil === 'orgao' && e.orgaoVisto === null ? this.estadoService.orgaoDoPapel : null;
  }

  /** E8: a página do órgão da trilha à vista (o próprio, para o papel de órgão; o escolhido, para os papéis globais). */
  get paginaDoOrgao(): string | null {
    const e = this.estado;
    if (e?.perfil !== 'orgao') return null;
    const orgaoId = e.orgaoVisto ?? this.estadoService.orgaoDoPapel;
    return orgaoId ? rotaPaginaOrgao(orgaoId) : null;
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
    if (e?.orgaoVisto !== null) {
      return this.podeRegistrarExterno
        ? 'Quem começa o PDTIC no sistema é a equipe do órgão, na trilha dela. Como admin do SGDP, você pode registrar aqui um PDTIC já aprovado fora do sistema.'
        : 'Quem começa o PDTIC é a equipe do órgão, na trilha dela. Aqui você só lê.';
    }
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

  // ── F1 · Versões encerradas, aprovação, PDF, aguardando e revisão ─────────

  /**
   * C08: sem PDTIC atual, a versão encerrada (ou substituída) mais recente do
   * órgão, quando há uma: o texto diz que ela foi encerrada (e não que o PDTIC
   * nunca começou).
   */
  get ultimaEncerrada(): PePdtic | null {
    return this.estadoService.ultimaEncerrada;
  }

  /** As versões que o órgão já tem (o registro fora do sistema não repete uma delas, F1, C07). */
  get versoesDoOrgao(): string[] {
    return (this.estado?.versoes ?? []).map(v => v.Versao);
  }

  /** A versão que o "Começar" abre (e a sugerida no registro fora do sistema): 1.0 ou a do próximo ciclo (a maior mais um). */
  get versaoNova(): string {
    return this.estadoService.versaoNova;
  }

  /** C09: "Aprovado pelo CGTIC" só com a deliberação aprovada (o registro fora do sistema por outra instância não tem). */
  aprovadoPeloCgtic(p: PePdtic): boolean {
    return p.Deliberacao?.Situacao === 'aprovado';
  }

  /** I02: o nome do PDF pelo caminho do PDTIC ("PDF publicado" depois da publicação). */
  rotuloPdf(p: PePdtic, f: PdfDoPdtic): string {
    return rotuloPdfDoPdtic(p, f);
  }

  /** C24: "vigente" ou "vigente, em acompanhamento" (só publicada, ainda não está em acompanhamento). */
  rotuloVigente(p: PePdtic): string {
    return p.Situacao === 'em_acompanhamento' ? 'vigente, em acompanhamento' : 'vigente';
  }

  /**
   * C15: o que os passos aguardam, pelo motivo deles: um motivo só, dito no texto
   * ("3 passos aguardando: disponível depois da publicação do PDTIC"); vários, o
   * texto neutro que manda ver o motivo de cada passo.
   */
  get textoAguardando(): string {
    const passos = (this.estado?.situacao?.andamento?.Passos ?? []).filter(p => p.Situacao === 'aguardando');
    const n = passos.length;
    const inicio = n === 1 ? '1 passo aguardando' : `${n} passos aguardando`;
    const motivos = new Set(passos.map(p => (p.Motivo ?? '').trim().replace(/\.$/, '')));
    const [motivo] = [...motivos];
    if (motivos.size === 1 && motivo) return `${inicio}: ${minusculaInicial(motivo.replace(/^aguardando\s*/i, ''))}.`;
    return `${inicio} outra coisa antes. O motivo de cada um está na lista das etapas, abaixo.`;
  }

  /**
   * B12: na revisão recém-aberta, o servidor recomenda o começo da etapa 2, que
   * já vem feito da versão anterior: a caixa diz que a revisão recomeça ali.
   */
  get revisaoRecomeca(): boolean {
    const e = this.estado;
    const r = this.recomendado;
    if (!e?.pdtic?.Revisao || !r) return false;
    // O servidor diz por que recomenda esse passo (F1); sem o motivo (resposta antiga), pela situação do passo
    if (e.situacao?.andamento?.ProximoPassoMotivo?.trim()) return true;
    const s = this.status(r)?.estado;
    return s === 'feito' || s === 'externo' || s === 'nao_se_aplica';
  }

  get textoRevisaoRecomeca(): string {
    const doServidor = this.estado?.situacao?.andamento?.ProximoPassoMotivo?.trim();
    if (doServidor) return doServidor;
    const anterior = this.estado?.pdtic?.Revisao?.AnteriorVersao;
    return `A revisão recomeça no diagnóstico: os passos vêm preenchidos com os dados da versão ${anterior ?? 'anterior'}. `
      + 'Confira cada passo a partir deste e ajuste o que mudou; depois, siga até o envio ao CGTIC.';
  }

  /** Andamento dos passos (o mesmo objeto enquanto a situação não muda: vai num *ngIf). */
  get andamento(): { feitos: number; total: number; aguardando: number } | null {
    const andamento = this.estado?.situacao?.andamento ?? null;
    if (andamento !== this.andamentoDe) {
      this.andamentoDe = andamento;
      const resumo = andamento ? resumoAndamento(andamento) : null;
      this.andamentoCache = resumo && resumo.total > 0 ? resumo : null;
    }
    return this.andamentoCache;
  }
  private andamentoDe: unknown = null;
  private andamentoCache: { feitos: number; total: number; aguardando: number } | null = null;

  abrirPdtic(): void {
    if (this.abrindo || !this.podeAbrirPdtic) return;
    this.abrindo = true;
    this.estadoService.abrirPdtic().subscribe({
      next: pdtic => {
        this.abrindo = false;
        // O toast fica numa região lida pelo leitor de tela: um aviso só
        this.notificacoes.success(`PDTIC ${pdtic.Versao} aberto. Siga os passos da trilha, a partir do primeiro.`);
        // O botão "Começar o PDTIC" some: o foco vai ao título do bloco do PDTIC (F1, C11)
        this.focoPendente = 'pe-inicio-pdtic-titulo';
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
    return classeEstadoPasso(estado);
  }

  /** O selo e o motivo do passo numa frase (aguardando, atrasado, feito fora do sistema): o porquê em texto. */
  motivoDoPasso(passo: PassoNumeradoPe): string {
    const s = this.status(passo);
    return s?.motivo ? textoDoStatus(s) : '';
  }

  // ── E7 · Caminho da aprovação ─────────────────────────────────────────────

  quando(valor: string | null | undefined): string {
    return quandoPdtic(valor);
  }

  /** Aprovação e publicação: no PDTIC registrado fora do sistema, só o dia (F2, C-O2). */
  quandoMarco(p: PePdtic, valor: string | null | undefined): string {
    return quandoMarcoPdtic(p, valor);
  }

  /** "está em elaboração", "foi devolvida pelo CGTIC para ajustes" (a versão no meio da frase, F2, C-N1). */
  situacaoEmTexto(situacao: string): string {
    return situacaoDaVersaoNaFrase(situacao);
  }

  /** A revisão ainda antes do CGTIC aprovar (em elaboração, com o comitê ou devolvida): a faixa explica as duas versões. */
  revisaoEmAndamento(p: PePdtic): PePdtic['Revisao'] {
    return p.Revisao && ['em_elaboracao', 'em_aprovacao', 'devolvido'].includes(p.Situacao) ? p.Revisao : null;
  }

  /** "Resolução nº 12, de 20/09/2026" da deliberação mais recente, ou vazio. */
  ato(p: PePdtic): string {
    return p.Deliberacao ? textoAto(p.Deliberacao) : '';
  }

  /** O PDF enviado (ou o do PDTIC registrado já aprovado). */
  get pdf(): PdfDoPdtic | null {
    const p = this.estado?.pdtic ?? null;
    if (p !== this.pdfDe) {
      this.pdfDe = p;
      this.pdfCache = pdfDoPdtic(p);
    }
    return this.pdfCache;
  }

  baixarPdf(): void {
    const pdf = this.pdf;
    if (!pdf || this.baixandoPdf) return;
    this.baixandoPdf = true;
    baixarPdfDoPdtic(this.pdticService, pdf).then(mensagem => {
      this.baixandoPdf = false;
      if (mensagem) this.notificacoes.error(mensagem);
    });
  }

  /** Os passos que as faixas citam: o envio, a publicação, a avaliação do comitê e o primeiro da etapa 2. */
  get links(): { envio: LinkPasso | null; publicacao: LinkPasso | null; avaliacao: LinkPasso | null; etapa2: LinkPasso | null } {
    const passos = this.estado?.passos ?? [];
    if (passos !== this.passosVistos) {
      this.passosVistos = passos;
      const link = (achado: PassoNumeradoPe | undefined): LinkPasso | null => (achado ? { rota: achado.rota, numero: achado.numero } : null);
      this.linksCache = {
        envio: link(passos.find(p => p.doOrgao?.Tipo === 'envio')),
        publicacao: link(passos.find(p => p.doOrgao?.Tipo === 'publicacao')),
        avaliacao: link(passos.find(p => p.doOrgao?.Secoes.some(s => s.Chave === SECAO_AVALIACAO_COMITE))),
        etapa2: link(passos.find(p => p.etapa === 1))
      };
    }
    return this.linksCache;
  }

  /** A versão em revisão e a vigente (o seletor fica no alto da trilha). */
  get versoes(): { emRevisao: PePdtic; vigente: PePdtic } | null {
    return this.estadoService.versoesParaEscolher;
  }

  /** As duas versões, quando a vigente é a que está à vista (a faixa oferece voltar à revisão). */
  get vigenteAVista(): { emRevisao: PePdtic; vigente: PePdtic } | null {
    const v = this.versoes;
    return v && v.vigente.Id === this.estado?.pdtic?.Id ? v : null;
  }

  verVersao(p: PePdtic): void {
    this.estadoService.escolherVersao(p.Id);
    this.focoPendente = 'pe-inicio-pdtic-titulo';
  }

  /** Há outra versão do órgão ainda antes da publicação (uma revisão já aberta). */
  private get temRevisaoAberta(): boolean {
    const p = this.estado?.pdtic;
    return !!p && (this.estado?.versoes ?? []).some(v => v.Id !== p.Id && pdticAntesDaPublicacao(v.Situacao));
  }

  /**
   * "Encerrar o PDTIC" do administrador (do módulo ou do SGDP): na trilha de um
   * órgão, com o PDTIC vigente e a vigência terminada; o motivo é obrigatório.
   */
  get mostraEncerrarAdmin(): boolean {
    const e = this.estado;
    const p = e?.pdtic;
    return !!e && !!p && e.orgaoVisto !== null && this.estadoService.ehAdministrador && pdticVigente(p.Situacao)
      && vigenciaTerminou(p, this.hoje);
  }

  /** "Abrir a revisão" com a justificativa: a equipe do órgão sem o passo da avaliação do comitê (Básico). */
  get mostraRevisaoComJustificativa(): boolean {
    const p = this.estado?.pdtic;
    return !!p && this.estadoService.ehEquipeDoOrgao && pdticVigente(p.Situacao) && !this.temRevisaoAberta && !this.links.avaliacao;
  }

  /** A revisão se abre pelo passo da avaliação do comitê (6.3), quando ele está na trilha. */
  get revisaoPelaAvaliacao(): LinkPasso | null {
    const p = this.estado?.pdtic;
    if (!p || !this.estadoService.ehEquipeDoOrgao || !pdticVigente(p.Situacao) || this.temRevisaoAberta) return null;
    return this.links.avaliacao;
  }

  /** Rodada B: o painel de acompanhamento aparece depois da publicação (também no encerrado e no substituído, para consulta). */
  mostraPainel(p: PePdtic): boolean {
    return pdticDepoisDaPublicacao(p.Situacao);
  }

  /** O PDTIC foi encerrado pelo administrador ou a revisão foi aberta: entra no estado, e o foco volta ao bloco do PDTIC. */
  aoConcluirAcao(pdtic: PePdtic): void {
    this.estadoService.aplicarPdtic(pdtic);
    this.focoPendente = 'pe-inicio-pdtic-titulo';
  }

  // ── E7 · PDTIC aprovado fora do sistema ───────────────────────────────────

  get podeRegistrarExterno(): boolean {
    return this.estadoService.podeRegistrarExterno;
  }

  /** O órgão do registro: null (o da equipe) ou o órgão à vista (admin do SGDP). */
  get orgaoDoRegistro(): number | null {
    return this.estado?.orgaoVisto ?? null;
  }

  /** Abre o formulário (que leva o foco ao título dele); já aberto, o foco vai para lá. */
  abrirFormExterno(): void {
    if (!this.podeRegistrarExterno) return;
    if (this.formExterno) this.focoPendente = 'pe-ext-titulo';
    this.formExterno = true;
  }

  fecharFormExterno(): void {
    this.formExterno = false;
    this.focoPendente = 'pe-inicio-externo';
  }

  /** O PDTIC registrado entra no estado (já publicado), e o foco vai para o bloco do PDTIC. */
  aoRegistrarExterno(pdtic: PePdtic): void {
    this.formExterno = false;
    this.estadoService.aplicarPdtic(pdtic);
    this.focoPendente = 'pe-inicio-pdtic-titulo';
  }

  irPara(passo: PassoNumeradoPe): void {
    this.router.navigate([passo.rota], { queryParams: { passo: passo.numero } });
  }
}
