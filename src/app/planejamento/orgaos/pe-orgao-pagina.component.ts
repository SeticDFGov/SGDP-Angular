import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import {
  PeAndamentoEtapa, PeAprovacaoResumo, PeCiclo, PeComentarioAberto, PeConformidadeOrgao, PeDeliberacao, PeDocumentoResumo,
  PeFaltaNivel, PeInadimplencia, PeNaoSeAplicaResumo, PeNivelAlcancado, PePdtic, PeResumoOrgao
} from '../../../api/planejamento/interface';
import { NotificationService } from '../../core/services/notification.service';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import { mensagemErroDownload, salvarResposta } from '../shared/pe-download';
import { baixarPdfDoPdtic } from '../shared/pe-pdf-pdtic';
import {
  classeSituacaoCiclo, ciclosEmOrdem, iconeSituacaoCiclo, periodoCiclo, rotuloSituacaoCiclo
} from '../shared/pe-ciclos-rotulos';
import {
  classeSituacaoInadimplencia, iconeSituacaoInadimplencia, inadimplenciaVigente, rotuloSituacaoInadimplencia
} from '../shared/pe-inadimplencia-rotulos';
import {
  GrupoConformidade, MarcaAtendimento, grupoConformidade, idDoParametro, itensDaLinha, marcaAtendimento, nomeDocumentoReserva,
  rotuloDecisao, rotuloSituacaoDocumento, rotuloTipoDocumento, textoPercentualConformidade
} from '../shared/pe-paineis-rotulos';
import { classeSituacaoPdtic, quandoMarcoPdtic, quandoPdtic, rotuloSituacaoPdtic } from '../shared/pe-pdtic-rotulos';
import {
  classeSituacaoDeliberacao, deliberacaoRegistradaFora, rotuloSituacaoDeliberacao, textoAto, textoVigencia
} from '../shared/pe-referenciais-rotulos';
import { nomeDeQuem, textoData } from '../shared/registros/pe-valores';
import { PePaineisService } from '../services/pe-paineis.service';
import { PePdticService } from '../services/pe-pdtic.service';
import { PeRegistrosService } from '../services/pe-registros.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { BASE_PE, PassoNumeradoPe, rotaPaginaOrgao } from '../trilha/pe-trilhas';
import { PeInadimplenciaDetalheComponent } from '../inadimplencia/pe-inadimplencia-detalhe.component';
import { PeNivelPdticComponent } from '../pdtic/pe-nivel-pdtic.component';
import { MOTIVO_NIVEL_NAO_CALCULADO } from '../shared/pe-niveis-rotulos';

/** O título da rota (a tela troca pelo título com a sigla quando o órgão chega). */
const TITULO_PAGINA = 'Página do órgão';

/** Um item da conformidade na página: o rótulo, a base, a marca e o detalhe. */
interface ItemConformidadePagina {
  chave: string;
  rotulo: string;
  base: string;
  /** O que o item pede, numa frase. */
  atende: string;
  marca: MarcaAtendimento;
  detalhe: string;
}

/**
 * Página do órgão (E8; a partir da conformidade, do painel, da lista dos órgãos e
 * da árvore do PETIC-DF): tudo do órgão num lugar só (GET orgaos/{id}/resumo).
 *
 * - Cabeçalho: a situação e a versão do PDTIC, o nível, a conformidade e a
 *   notificação em aberto, e os links para o PDTIC em leitura (a trilha do órgão),
 *   o documento (o passo do documento na trilha), a planilha completa, a árvore do
 *   PETIC-DF e as notificações do órgão.
 * - O PDTIC e as versões; o nível com o histórico; o andamento por etapa (com o
 *   próximo passo); a conformidade item a item (texto e ícone, o detalhe e a base
 *   com a dica); o "não se aplica" com as justificativas; os comentários abertos
 *   (com o link para o passo); as aprovações; as deliberações do CGTIC (com o PDF
 *   enviado); os documentos gerados (baixar); os ciclos; as notificações da SGDI.
 *
 * Os papéis globais e o admin do SGDP veem a de qualquer órgão; a equipe e a
 * consulta do órgão, só a do próprio órgão (outro endereço mostra um aviso e a
 * tela não consulta: o 403 tiraria a pessoa do módulo). Tudo só para ler.
 *
 * F3: no modo livre (`Nivel.Modo` do resumo), o nível alcançado no cabeçalho e o
 * quadro "Nível do PDTIC" com o que falta para o próximo nível (cada passo abre o
 * passo a passo do órgão nele); no andamento por etapa, os validados pela equipe.
 */
@Component({
  selector: 'app-pe-orgao-pagina',
  standalone: true,
  imports: [CommonModule, RouterModule, CitaPlanejamentoDirective, PeInadimplenciaDetalheComponent, PeNivelPdticComponent],
  templateUrl: './pe-orgao-pagina.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeOrgaoPaginaComponent implements OnInit {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly paineisService = inject(PePaineisService);
  private readonly pdticService = inject(PePdticService);
  private readonly registrosService = inject(PeRegistrosService);
  private readonly notificacoes = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly titulo = inject(Title);
  private readonly destroyRef = inject(DestroyRef);

  readonly base = BASE_PE;

  /** O órgão do endereço (null: endereço sem um número de órgão). */
  orgaoId: number | null = null;
  /** Pode ver este órgão: papel global ou admin do SGDP; papel de órgão, só o próprio. */
  podeVer: boolean | null = null;
  /** Papel de órgão: a página é do próprio órgão (os links levam à trilha dele). */
  ehPapelDeOrgao = false;
  veTodos = false;
  erroPapel = false;
  paginaDoMeuOrgao: string | null = null;

  resumo: PeResumoOrgao | null = null;
  carregando = false;
  erro: string | null = null;
  naoEncontrado = false;
  private carga?: Subscription;
  private carregado: number | null = null;

  // Partes prontas para a tela (montadas uma vez por carga)
  itensConformidade: ItemConformidadePagina[] = [];
  ciclos: PeCiclo[] = [];
  inadimplencias: PeInadimplencia[] = [];
  historicoAberto = false;
  /** F3: o modo livre (do resumo) e o nível alcançado (o mesmo objeto por carga: vai num *ngIf e num input). */
  modoLivre = false;
  nivelAlcancado: PeNivelAlcancado | null = null;
  /** B: o andamento traz os validados pela equipe (a API nova). */
  temValidados = false;
  /**
   * F3 (correções): o andamento conta só os obrigatórios em `Feitos` e `Total` e traz
   * os `OpcionaisFeitos` (a API nova); sem o campo, conta todos os passos, como antes.
   */
  andamentoPorObrigatorio = false;
  baixando: string | null = null;

  ngOnInit(): void {
    this.rota.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.orgaoId = idDoParametro(params.get('id'));
        this.avaliar();
      });
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.avaliar());
  }

  /** Quem vê o quê: com o papel conhecido e o órgão do endereço, carrega (uma vez por órgão). */
  private avaliar(): void {
    const estado = this.estadoService.atual;
    if (!estado || estado.carga !== 'pronta') return;
    this.erroPapel = estado.consultaPapel === 'erro';
    this.veTodos = this.estadoService.veTodosOsOrgaos === true;
    this.ehPapelDeOrgao = this.estadoService.ehPapelDeOrgao;
    const meuOrgao = this.estadoService.orgaoDoPapel;
    this.paginaDoMeuOrgao = meuOrgao ? rotaPaginaOrgao(meuOrgao) : null;
    if (this.orgaoId === null) {
      this.podeVer = null;
      return;
    }
    if (estado.consultaPapel === 'carregando') return;
    this.podeVer = this.veTodos || (this.ehPapelDeOrgao && meuOrgao === this.orgaoId);
    if (this.podeVer && this.carregado !== this.orgaoId) this.carregar();
  }

  tentarPapelDeNovo(): void {
    this.estadoService.iniciar();
  }

  carregar(): void {
    const orgaoId = this.orgaoId;
    if (orgaoId === null) return;
    this.carga?.unsubscribe();
    this.carregado = orgaoId;
    this.carregando = true;
    this.erro = null;
    this.naoEncontrado = false;
    this.carga = this.paineisService.resumoOrgao(orgaoId).subscribe({
      next: resumo => {
        this.carregando = false;
        if (this.orgaoId !== orgaoId) return;
        this.aplicar(resumo);
      },
      error: erro => {
        this.carregando = false;
        // 403: o interceptor já tirou a pessoa do módulo
        const mensagem = mensagemErroPe(erro, 'Não foi possível carregar a página do órgão. Tente de novo em alguns instantes.');
        if (mensagem === null) return;
        this.carregado = null;
        if ((erro as { status?: number } | null)?.status === 404) this.naoEncontrado = true;
        else this.erro = mensagem;
      }
    });
  }

  private aplicar(bruto: PeResumoOrgao): void {
    const resumo: PeResumoOrgao = {
      ...bruto,
      Nivel: {
        ...bruto?.Nivel,
        Id: bruto?.Nivel?.Id ?? null, Nome: bruto?.Nivel?.Nome ?? null, Padrao: bruto?.Nivel?.Padrao === true,
        Historico: bruto?.Nivel?.Historico ?? []
      },
      Versoes: bruto?.Versoes ?? [],
      Andamento: bruto?.Andamento ?? [],
      NaoSeAplica: bruto?.NaoSeAplica ?? [],
      ComentariosAbertos: bruto?.ComentariosAbertos ?? [],
      Aprovacoes: bruto?.Aprovacoes ?? [],
      Deliberacoes: bruto?.Deliberacoes ?? [],
      Documentos: bruto?.Documentos ?? [],
      Ciclos: bruto?.Ciclos ?? [],
      Inadimplencias: bruto?.Inadimplencias ?? []
    };
    this.resumo = resumo;
    const linha = resumo.Conformidade;
    this.itensConformidade = linha
      ? itensDaLinha(linha.Itens).map(i => ({
        chave: i.Chave,
        rotulo: i.Rotulo,
        base: i.Base,
        atende: i.AtendeQuando,
        marca: marcaAtendimento(linha.Itens?.[i.Chave]),
        detalhe: linha.Itens?.[i.Chave]?.Detalhe?.trim() ?? ''
      }))
      : [];
    // F3: o modo e o nível alcançado (sem o modo, o definido: tudo como antes)
    const n = resumo.Nivel;
    this.modoLivre = n.Modo === 'livre';
    this.nivelAlcancado = this.modoLivre
      ? {
        Modo: 'livre', AlcancadoId: n.AlcancadoId ?? null, AlcancadoNome: n.AlcancadoNome ?? null, ProximoId: n.ProximoId ?? null,
        ProximoNome: n.ProximoNome ?? null, Faltam: n.Faltam ?? [],
        // O resumo não traz o motivo do nível não calculado: no PDTIC registrado fora do sistema, o do servidor
        Motivo: n.Motivo ?? (!n.AlcancadoNome?.trim() && resumo.Pdtic?.RegistradoExternamente ? MOTIVO_NIVEL_NAO_CALCULADO : null)
      }
      : null;
    this.temValidados = resumo.Andamento.some(a => typeof a.Validados === 'number');
    this.andamentoPorObrigatorio = resumo.Andamento.some(a => typeof a.OpcionaisFeitos === 'number');
    this.ciclos = ciclosEmOrdem(resumo.Ciclos);
    this.inadimplencias = [...resumo.Inadimplencias]
      .sort((a, b) => Number(inadimplenciaVigente(b.Situacao)) - Number(inadimplenciaVigente(a.Situacao)));
    this.historicoAberto = false;
    this.aplicarTitulo(resumo.Orgao?.Sigla);
  }

  /** O título da aba com a sigla ("Página do órgão SES · Governança Estratégica · SGDP"). */
  private aplicarTitulo(sigla: string | null | undefined): void {
    const atual = this.titulo.getTitle();
    if (sigla && atual.startsWith(TITULO_PAGINA) && !atual.startsWith(`${TITULO_PAGINA} ${sigla}`)) {
      this.titulo.setTitle(`${TITULO_PAGINA} ${sigla}${atual.slice(TITULO_PAGINA.length)}`);
    }
  }

  // ── Cabeçalho ─────────────────────────────────────────────────────────────

  get sigla(): string {
    return this.resumo?.Orgao?.Sigla ?? '';
  }

  get pdtic(): PePdtic | null {
    return this.resumo?.Pdtic ?? null;
  }

  get conformidade(): PeConformidadeOrgao | null {
    return this.resumo?.Conformidade ?? null;
  }

  get grupo(): GrupoConformidade | null {
    return grupoConformidade(this.conformidade?.Grupo);
  }

  get percentual(): string {
    const c = this.conformidade;
    return c ? textoPercentualConformidade(c) : '-';
  }

  /** A notificação em aberto mais importante: a inadimplência registrada, senão a notificação. */
  get vigente(): PeInadimplencia | null {
    return this.inadimplencias.find(i => i.Situacao === 'inadimplente')
      ?? this.inadimplencias.find(i => i.Situacao === 'notificado') ?? null;
  }

  rotuloSituacaoPdtic(s: string | null | undefined): string {
    return s ? rotuloSituacaoPdtic(s) : 'Sem PDTIC';
  }

  classeSituacaoPdtic(s: string | null | undefined): string {
    return classeSituacaoPdtic(s);
  }

  vigencia(p: PePdtic): string {
    return textoVigencia(p);
  }

  quando(valor: string | null | undefined): string {
    return quandoPdtic(valor);
  }

  /** Aprovação e publicação: no PDTIC registrado fora do sistema, só o dia (F2, C-O2). */
  quandoMarco(p: PePdtic, valor: string | null | undefined): string {
    return quandoMarcoPdtic(p, valor);
  }

  /** "Aprovado pelo CGTIC" só com a deliberação aprovada: o registrado fora do sistema por outra instância diz só "Aprovado" (como a visão geral, F1, C09). */
  rotuloAprovado(p: PePdtic): string {
    return p.RegistradoExternamente && p.Deliberacao?.Situacao !== 'aprovado' ? 'Aprovado' : 'Aprovado pelo CGTIC';
  }

  /** O nome de quem fez (sem ele, o e-mail): F1, C19. */
  readonly nomeDeQuem = nomeDeQuem;

  /** F1 (A21): "Básico (padrão)" quando o nível era o padrão, ou o órgão voltou a ele. */
  nivelDoHistorico(nome: string | null | undefined, padrao: boolean | null | undefined): string {
    if (!nome?.trim()) return padrao === false ? '-' : 'Nível padrão';
    return padrao && !nome.includes('(padrão)') ? `${nome} (padrão)` : nome;
  }

  /** F1 (C40): a deliberação nasceu do registro de um PDTIC aprovado fora do sistema (não houve envio). */
  registradaFora(d: PeDeliberacao): boolean {
    return deliberacaoRegistradaFora(d);
  }

  /** A decisão: na registrada fora do sistema, a data do ato (F1, C40); nas outras, quando foi registrada. */
  decididaEm(d: PeDeliberacao): string {
    if (this.registradaFora(d)) return d.AtoData ? textoData(d.AtoData) : this.quando(d.DecididoEm);
    return this.quando(d.DecididoEm);
  }

  rotuloInadimplencia(i: PeInadimplencia): string {
    return rotuloSituacaoInadimplencia(i.Situacao, i.SituacaoRotulo);
  }

  classeInadimplencia(i: PeInadimplencia): string {
    return classeSituacaoInadimplencia(i.Situacao);
  }

  iconeInadimplencia(i: PeInadimplencia): string {
    return iconeSituacaoInadimplencia(i.Situacao);
  }

  // ── Andamento ─────────────────────────────────────────────────────────────

  /**
   * "2 de 3" (a API anterior, todos os passos) ou, com a API nova, como na visão geral,
   * os obrigatórios: "2 de 3 obrigatórios", "1 de 1 obrigatório" ou "Nenhum obrigatório".
   */
  resolvidos(a: PeAndamentoEtapa): string {
    if (!this.andamentoPorObrigatorio) return `${a.Feitos} de ${a.Total}`;
    if (a.Total === 0) return 'Nenhum obrigatório';
    return `${a.Feitos} de ${a.Total} ${a.Total === 1 ? 'obrigatório' : 'obrigatórios'}`;
  }

  /** F3 (correções): "1 opcional feito" ou "2 opcionais feitos", só quando houver (senão, vazio). */
  opcionaisFeitos(a: PeAndamentoEtapa): string {
    const n = this.andamentoPorObrigatorio ? a.OpcionaisFeitos ?? 0 : 0;
    if (n <= 0) return '';
    return n === 1 ? '1 opcional feito' : `${n} opcionais feitos`;
  }

  // ── Trilha, documento e planilha ──────────────────────────────────────────

  /** A trilha do órgão (a do próprio órgão, para o papel de órgão; só para ler, para os demais), na visão geral. */
  verTrilha(): void {
    this.abrirNaTrilha(null);
  }

  /** A prévia do documento, no passo do documento da trilha do órgão. */
  verDocumento(): void {
    this.abrirNaTrilha(p => p.doOrgao?.Tipo === 'documento');
  }

  /** O passo do próximo passo recomendado. */
  abrirProximoPasso(numero: string): void {
    this.abrirNaTrilha(p => p.numero === numero);
  }

  /** F3: um passo que falta para o próximo nível (pelo id do passo; senão, pelo número). */
  abrirPassoQueFalta(f: PeFaltaNivel): void {
    this.abrirNaTrilha(p => p.doOrgao?.Id === f.PassoId || (!!f.PassoNumero && p.numero === f.PassoNumero));
  }

  /** F3: o nível alcançado no cabeçalho, em palavras. */
  get textoNivelAlcancado(): string {
    const n = this.nivelAlcancado;
    if (!n) return '-';
    if (n.AlcancadoNome?.trim()) return n.AlcancadoNome.trim();
    return n.Motivo?.trim() ? 'Não calculado' : 'Sem nível alcançado';
  }

  /** O passo do comentário (pelo id do passo; senão, pelo número). */
  abrirPassoDoComentario(c: PeComentarioAberto): void {
    this.abrirNaTrilha(p => p.doOrgao?.Id === c.PassoId || (!!c.PassoNumero && p.numero === c.PassoNumero));
  }

  /**
   * Abre a trilha do órgão e, com `escolher`, o passo que ele escolhe. Para os
   * papéis globais a trilha do órgão chega depois: a moldura tira esta tela do ar
   * enquanto carrega, então quem espera é uma assinatura que se desfaz sozinha
   * (como o "Ver o documento" da lista dos PDTICs). Se a pessoa for para outra tela
   * antes, fica onde está.
   */
  private abrirNaTrilha(escolher: ((p: PassoNumeradoPe) => boolean) | null): void {
    const orgaoId = this.orgaoId;
    if (orgaoId === null) return;
    const router = this.router;
    const atual = this.estadoService.atual;
    const irAoPasso = (passos: PassoNumeradoPe[]) => {
      const passo = escolher ? passos.find(escolher) : null;
      if (passo) router.navigate([passo.rota], { queryParams: { passo: passo.numero } });
      else router.navigate([BASE_PE]);
    };
    const jaEstaNaTrilha = atual?.carga === 'pronta' && atual.perfil === 'orgao'
      && (atual.orgaoVisto === orgaoId || (this.ehPapelDeOrgao && atual.orgaoVisto === null));
    if (jaEstaNaTrilha) {
      irAoPasso(atual!.passos);
      return;
    }
    if (this.ehPapelDeOrgao) {
      router.navigate([BASE_PE]);
      return;
    }
    const estadoService = this.estadoService;
    estadoService.verOrgao(orgaoId);
    router.navigate([BASE_PE]);
    if (!escolher) return;
    let feito = false;
    const assinatura = estadoService.estado$.subscribe(estado => {
      if (feito || !estado || estado.orgaoVisto !== orgaoId || (estado.carga !== 'pronta' && estado.carga !== 'erro-trilha')) return;
      feito = true;
      const passo = estado.carga === 'pronta' ? estado.passos.find(escolher) : null;
      if (passo && router.url.split('?')[0] === BASE_PE) router.navigate([passo.rota], { queryParams: { passo: passo.numero } });
      setTimeout(() => assinatura.unsubscribe());
    });
  }

  /** O XLSX do PDTIC com uma aba por seção e a aba Leia-me. */
  baixarPlanilha(): void {
    const p = this.pdtic;
    if (!p || this.baixando) return;
    this.baixando = 'planilha';
    this.registrosService.planilhaCompleta({ tipo: 'pdtic', id: p.Id }).subscribe({
      next: resposta => {
        this.baixando = null;
        salvarResposta(resposta, `PDTIC_${p.OrgaoSigla}_completa.xlsx`);
      },
      error: erro => {
        this.baixando = null;
        mensagemErroDownload(erro, 'Não foi possível gerar a planilha completa. Tente de novo.').then(m => {
          if (m) this.notificacoes.error(m);
        });
      }
    });
  }

  // ── Deliberações e documentos ─────────────────────────────────────────────

  rotuloDeliberacao(d: PeDeliberacao): string {
    return rotuloSituacaoDeliberacao(d.Situacao);
  }

  classeDeliberacao(d: PeDeliberacao): string {
    return classeSituacaoDeliberacao(d.Situacao);
  }

  ato(d: PeDeliberacao): string {
    return textoAto(d) || '-';
  }

  baixarPdfEnviado(d: PeDeliberacao): void {
    const doc = d.Documento;
    if (!doc || this.baixando) return;
    this.baixando = `deliberacao-${d.Id}`;
    baixarPdfDoPdtic(this.pdticService, { pdticId: doc.PdticId || d.ObjetoId, numero: doc.Numero, sigla: this.sigla, versao: d.VersaoObjeto })
      .then(mensagem => {
        this.baixando = null;
        if (mensagem) this.notificacoes.error(mensagem);
      });
  }

  rotuloDocumento(d: PeDocumentoResumo): string {
    return rotuloTipoDocumento(d.Tipo, d.Rotulo);
  }

  situacaoDocumento(d: PeDocumentoResumo): string {
    return rotuloSituacaoDocumento(d.Situacao);
  }

  chaveDocumento(d: PeDocumentoResumo): string {
    return `${d.Tipo}-${d.Numero}-${d.GeradoEm ?? ''}`;
  }

  baixarDocumento(d: PeDocumentoResumo): void {
    if (this.baixando) return;
    this.baixando = this.chaveDocumento(d);
    this.paineisService.baixarDocumento(d.Url).subscribe({
      next: resposta => {
        this.baixando = null;
        salvarResposta(resposta, nomeDocumentoReserva(this.sigla, d.Tipo, d.Numero));
      },
      error: erro => {
        this.baixando = null;
        mensagemErroDownload(erro, 'Não foi possível baixar o documento. Tente de novo.').then(m => {
          if (m) this.notificacoes.error(m);
        });
      }
    });
  }

  // ── Aprovações, ciclos ────────────────────────────────────────────────────

  decisao(a: PeAprovacaoResumo): string {
    return rotuloDecisao(a.Decisao);
  }

  tipoCiclo(c: PeCiclo): string {
    return c.Tipo === 'avaliacao' ? 'Avaliação intermediária' : 'Monitoramento';
  }

  periodo(c: PeCiclo): string {
    return periodoCiclo(c);
  }

  rotuloCiclo(c: PeCiclo): string {
    return rotuloSituacaoCiclo(c.Situacao);
  }

  classeCiclo(c: PeCiclo): string {
    return classeSituacaoCiclo(c.Situacao);
  }

  iconeCiclo(c: PeCiclo): string {
    return iconeSituacaoCiclo(c.Situacao);
  }

  // ── trackBy ───────────────────────────────────────────────────────────────

  porIndice(i: number): number {
    return i;
  }

  porId(_: number, x: { Id: number }): number {
    return x.Id;
  }

  porEtapa(_: number, a: PeAndamentoEtapa): number {
    return a.Etapa;
  }

  porChave(_: number, x: { chave: string }): string {
    return x.chave;
  }

  porNaoSeAplica(i: number, n: PeNaoSeAplicaResumo): string {
    return `${n.PassoNumero ?? i}`;
  }

  porDocumento(_: number, d: PeDocumentoResumo): string {
    return `${d.Tipo}-${d.Numero}-${d.GeradoEm ?? ''}`;
  }
}
