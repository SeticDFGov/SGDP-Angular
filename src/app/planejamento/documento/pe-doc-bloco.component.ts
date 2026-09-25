import {
  AfterViewChecked, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, PLATFORM_ID, SimpleChanges, inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  PeDocBloco, PeDocCapitulo, PeDocItemLista, PeDocLinha, PeDocMarcador, PeDocTabela, PeDocTextoRico, PeFluxoDefinicao
} from '../../../api/planejamento/interface';
import { AcessibilidadeService } from '../../core/acessibilidade/acessibilidade.service';
import { semCarregamento } from '../../core/carregamento/sem-carregamento';
import { NotificationService } from '../../core/services/notification.service';
import { PeFluxoDescricaoComponent } from '../fluxos/pe-fluxo-descricao.component';
import { PeFluxoDesenhoComponent } from '../fluxos/pe-fluxo-desenho.component';
import { PeDocumentoService } from '../services/pe-documento.service';
import { PeFluxosService } from '../services/pe-fluxos.service';
import { mensagemErroPe } from '../shared/pe-erros';
import { DicionarioFluxo, dicionarioPadrao, normalizarDefinicao, numerosDoServidor } from '../shared/pe-fluxo-rotulos';
import {
  AlvoDocumento, MARCADORES_PADRAO, PassoLinkDoc, TIPOS_BLOCO_ACOMPANHAMENTO, descricaoMarcador, rotuloTipoBloco, secaoDoMarcador,
  textoMarcador, tituloComNumero
} from '../shared/pe-documento-rotulos';
import { juntar } from '../shared/pe-modelo-rotulos';
import { quandoEQuem } from '../shared/pe-referenciais-rotulos';
import { PeEditorTextoRicoComponent } from '../shared/texto-rico/pe-editor-texto-rico.component';
import { PeTextoRicoLeituraDirective } from '../shared/texto-rico/pe-texto-rico-leitura.directive';
import { CLASSES_TEXTO_RICO, docParaEnvio, docVazio, normalizarDocumento } from '../shared/texto-rico/pe-texto-rico-doc';

/** Espera depois da última tecla antes de salvar sozinho. */
const ESPERA_SALVAR_MS = 1200;

/**
 * salvo: nada pendente · pendente: mudou e ainda não foi · salvando · erro: o
 * servidor recusou ou a rede falhou (a mudança continua pendente).
 */
type SituacaoSalvar = 'salvo' | 'pendente' | 'salvando' | 'erro';

/** Texto vazio como vai para a API: o servidor guarda o bloco em branco para o órgão. */
const DOC_VAZIO: PeDocTextoRico = { type: 'doc', content: [{ type: 'paragraph' }] };

/** Marcadores sem valor de um bloco, juntos pelo passo onde o dado se preenche. */
interface GrupoSemValor {
  chave: string;
  descricoes: string;
  passo: PassoLinkDoc | null;
}

interface QuadranteSwot {
  titulo: string;
  itens: string[];
}

/**
 * Um grupo de um bloco do acompanhamento, pronto para a tela (E7 rodada B): a
 * tabela (do grupo ou montada com as colunas e as linhas dele), a lista ou o texto.
 */
interface GrupoAcompanhamento {
  chave: string;
  /** Null no bloco de uma tabela só (o título dela fica na legenda). */
  titulo: string | null;
  texto: string | null;
  tabela: PeDocTabela | null;
  temCodigo: boolean;
  itens: PeDocItemLista[];
  vazio: boolean;
}

/**
 * Um bloco da prévia do documento do PDTIC.
 *
 * - Texto: mostra o texto resolvido (os marcadores trocados pelos dados, os sem
 *   valor em destaque e o aviso com o link para o passo onde se preenchem). Para
 *   quem edita, o clique no bloco (ou o botão "Editar o texto") abre ali mesmo o
 *   editor da E4, com o texto bruto (os marcadores como texto) e a lista dos
 *   marcadores para inserir. O texto se salva sozinho um pouco depois da última
 *   tecla, ao fechar e quando outro bloco abre; a situação ("Salvo às 14:32")
 *   fica à vista. "Voltar ao texto do modelo" apaga a cópia do órgão, e "o modelo
 *   mudou" mostra a comparação com "Usar o texto do modelo".
 * - Tabela de uma seção, lista das ações de um tema e matriz SWOT: só leitura,
 *   com o link para o passo onde os dados se editam.
 * - Fluxo (E6): o desenho que o servidor manda (o SVG vira uma imagem, sem rodar
 *   nada), com zoom e rolagem pelo teclado; a descrição em texto, em lista
 *   numerada, que busca o fluxo do órgão só quando o bloco da descrição abre; e o
 *   link para o passo onde o órgão adapta os fluxos.
 * - E7 rodada B, nos relatórios do acompanhamento: as ações do ciclo por
 *   situação, as metas por resultado, os riscos que ocorreram e as medições, só
 *   leitura, em grupos (cada um com o título e a tabela) ou numa tabela só, com o
 *   link para o passo onde os dados se editam (no RA, já no ciclo do relatório).
 *   O texto se grava no documento do alvo (o PDTIC, o RA ou o RR).
 *
 * Quem decide se o editor está aberto é a prévia (`aberto`): um bloco de cada
 * vez. O bloco avisa a prévia do que ainda não foi salvo (`pendente`).
 */
@Component({
  selector: 'app-pe-doc-bloco',
  standalone: true,
  imports: [
    CommonModule, RouterModule, PeEditorTextoRicoComponent, PeTextoRicoLeituraDirective, PeFluxoDesenhoComponent,
    PeFluxoDescricaoComponent
  ],
  templateUrl: './pe-doc-bloco.component.html',
  // Elemento de bloco: o espaço entre os blocos da página vale para ele
  host: { class: 'block' }
})
export class PeDocBlocoComponent implements OnChanges, AfterViewChecked, OnDestroy {
  private readonly documentoService = inject(PeDocumentoService);
  private readonly fluxosService = inject(PeFluxosService);
  private readonly notificacoes = inject(NotificationService);
  private readonly acessibilidade = inject(AcessibilidadeService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) bloco!: PeDocBloco;
  @Input({ required: true }) capitulo!: PeDocCapitulo;
  /** O PDTIC (os fluxos do órgão para a descrição em texto). */
  @Input({ required: true }) pdticId!: number;
  /** E7 rodada B: o documento onde o texto se grava (sem ele, o documento do PDTIC). */
  @Input() alvo: AlvoDocumento | null = null;
  @Input() podeEditar = false;
  /** O editor deste bloco está aberto (a prévia abre um de cada vez). */
  @Input() aberto = false;
  /** Onde se preenche cada seção (link "no passo N.M"). */
  @Input() passosPorSecao: ReadonlyMap<string, PassoLinkDoc> = new Map();
  /** O passo dos dados de uma tabela, lista ou matriz (link "editar os dados no passo N.M"). */
  @Input() passoDados: PassoLinkDoc | null = null;
  @Input() marcadores: readonly PeDocMarcador[] = MARCADORES_PADRAO;

  /** Pede à prévia para abrir o editor deste bloco. */
  @Output() readonly abrir = new EventEmitter<void>();
  /** Pede à prévia para fechar o editor (o texto já foi salvo). */
  @Output() readonly fechar = new EventEmitter<void>();
  /** O servidor devolveu o bloco de novo (texto salvo, texto do modelo de volta). */
  @Output() readonly atualizado = new EventEmitter<PeDocBloco>();
  /** Há texto mudado ainda não salvo (ou salvando). */
  @Output() readonly pendente = new EventEmitter<boolean>();

  readonly classes = CLASSES_TEXTO_RICO;
  readonly exemploMarcador = textoMarcador('orgao.nome');

  /** O documento que o editor recebe ao abrir (não muda enquanto se escreve). */
  valorInicial: PeDocTextoRico | null = null;
  situacaoSalvar: SituacaoSalvar = 'salvo';
  salvoEm: Date | null = null;
  erroSalvar: string | null = null;
  voltando = false;
  mantendo = false;
  comparando = false;

  gruposSemValor: GrupoSemValor[] = [];
  quadrantes: QuadranteSwot[] = [];
  temCodigo = false;
  /** E7 rodada B: os grupos (ou a tabela só) de um bloco do acompanhamento; vazio quando os dados não vieram. */
  gruposAcompanhamento: GrupoAcompanhamento[] = [];

  /** O fluxo do órgão para a descrição em texto (buscado quando o bloco da descrição abre). */
  defFluxo: PeFluxoDefinicao | null = null;
  numerosFluxo: ReadonlyMap<string, string> | null = null;
  dicionarioFluxo: DicionarioFluxo = dicionarioPadrao();
  carregandoFluxo = false;
  erroFluxo: string | null = null;
  private chaveFluxo: string | null = null;

  private rascunho: PeDocTextoRico | null = null;
  private versaoRascunho = 0;
  private versaoSalva = 0;
  private salvando = false;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  /** Fechar assim que o texto terminar de salvar ("Pronto" ou Esc). */
  private fecharDepois = false;
  /** O editor fechou por pedido deste bloco: o foco volta ao botão "Editar o texto". */
  private devolverFoco = false;
  private focoPendente: string | null = null;
  private avisadoPendente = false;
  private destruido = false;

  // ── Identificação ─────────────────────────────────────────────────────────

  get idBase(): string {
    return `pe-doc-bloco-${this.bloco.Id}`;
  }

  get idBotaoEditar(): string {
    return `${this.idBase}-editar`;
  }

  get idRotulo(): string {
    return `${this.idBase}-rotulo`;
  }

  get idAjuda(): string {
    return `${this.idBase}-ajuda`;
  }

  get tituloCapitulo(): string {
    return tituloComNumero(this.capitulo);
  }

  /** Os títulos do texto ficam abaixo do título do capítulo (h3 no capítulo, h4 no subcapítulo). */
  get nivelTitulo(): number {
    return this.capitulo.Nivel === 2 ? 5 : 4;
  }

  get dicaSemValor(): string {
    return 'dado ainda não preenchido: sai em branco no PDF';
  }

  get quantosSemValor(): number {
    return this.bloco.MarcadoresSemValor?.length ?? 0;
  }

  get editadoEm(): string {
    return quandoEQuem(this.bloco.EditadoEm, this.bloco.EditadoPor);
  }

  get textoLinkDados(): string {
    const p = this.passoDados;
    if (!p) return '';
    // O inventário de IA vem do PGIA: no passo ele só se lê
    if (this.bloco.Tabela?.SecaoChave === 'pgia_sistemas') return `Ver no passo ${p.numero} (o inventário vem do PGIA)`;
    return this.podeEditar ? `Editar os dados no passo ${p.numero}` : `Ver os dados no passo ${p.numero}`;
  }

  get iconeLinkDados(): string {
    return this.podeEditar && this.bloco.Tabela?.SecaoChave !== 'pgia_sistemas' ? 'edit_note' : 'visibility';
  }

  /** O texto da situação, à vista no editor ("Salvo às 14:32"). */
  get textoSituacao(): string {
    switch (this.situacaoSalvar) {
      case 'pendente': return 'Mudanças ainda não salvas. O texto se salva sozinho em instantes.';
      case 'salvando': return 'Salvando...';
      case 'erro': return '';
      default: return this.salvoEm ? `Salvo às ${this.hora(this.salvoEm)}.` : 'Nenhuma mudança ainda.';
    }
  }

  get iconeSituacao(): string {
    switch (this.situacaoSalvar) {
      case 'pendente': return 'edit_note';
      case 'salvando': return 'sync';
      case 'erro': return 'error';
      default: return 'cloud_done';
    }
  }

  /** O que está no editor ficou sem texto (salva assim mesmo: no PDF, o bloco sai em branco). */
  get rascunhoVazio(): boolean {
    return this.versaoRascunho > 0 && docVazio(this.rascunho);
  }

  /** Seção de formulário (um registro): a tabela vira rótulo e valor. */
  get ehFormulario(): boolean {
    return this.bloco.Tabela?.SecaoTipo === 'formulario';
  }

  /** E7 rodada B: bloco de dados do acompanhamento (ações por situação, metas por resultado, riscos, medições). */
  get acompanhamento(): boolean {
    return TIPOS_BLOCO_ACOMPANHAMENTO.has(this.bloco.Tipo);
  }

  get tituloAcompanhamento(): string {
    return rotuloTipoBloco(this.bloco.Tipo);
  }

  /** O que o grupo vazio diz ("Nenhuma ação neste grupo."). */
  get vazioDoGrupo(): string {
    switch (this.bloco.Tipo) {
      case 'acoes_por_situacao': return 'Nenhuma ação neste grupo.';
      case 'metas_por_resultado': return 'Nenhuma meta neste grupo.';
      case 'riscos_ocorridos': return 'Nenhum risco ocorreu.';
      case 'medicoes': return 'Nenhuma medição registrada.';
      default: return 'Nada neste grupo.';
    }
  }

  /** O tipo que esta tela sabe mostrar (os demais saem só no PDF). */
  get tipoConhecido(): boolean {
    const t = this.bloco.Tipo;
    return t === 'texto' || t === 'tabela_secao' || t === 'lista_tema' || t === 'matriz_swot' || t === 'fluxo' || this.acompanhamento;
  }

  /** O documento onde o texto se grava: o alvo da prévia ou, sem ele, o documento do PDTIC. */
  private get alvoDoTexto(): AlvoDocumento {
    return this.alvo ?? { tipo: 'pdtic', pdticId: this.pdticId };
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['bloco'] || mudancas['passosPorSecao']) this.montarLeitura();
    const aberto = mudancas['aberto'];
    if (aberto && !aberto.firstChange && aberto.previousValue !== aberto.currentValue) {
      if (this.aberto) this.comecarEdicao();
      // A prévia fechou (outro bloco abriu, ou o fechar pedido aqui): salva o que faltou, fora da detecção de mudanças
      else setTimeout(() => this.terminarEdicao());
    } else if (aberto?.firstChange && this.aberto) {
      this.comecarEdicao();
    }
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (this.temporizador) clearTimeout(this.temporizador);
    // O bloco saiu da tela com texto pendente: o pedido segue sem a tela
    if (this.temMudanca() && !this.salvando) this.enviar();
  }

  // ── Leitura ───────────────────────────────────────────────────────────────

  private montarLeitura(): void {
    const b = this.bloco;
    // Marcadores sem valor, pelo passo onde se preenchem
    const grupos = new Map<string, { chaves: string[]; passo: PassoLinkDoc | null }>();
    for (const chave of b.MarcadoresSemValor ?? []) {
      const secao = secaoDoMarcador(chave);
      const passo = secao ? this.passosPorSecao.get(secao) ?? null : null;
      const id = passo?.rota ?? '-';
      const grupo = grupos.get(id) ?? { chaves: [], passo };
      grupo.chaves.push(chave);
      grupos.set(id, grupo);
    }
    this.gruposSemValor = [...grupos.entries()].map(([id, g]) => {
      // Só a primeira letra de cada uma muda (as siglas, como TIC e SGTIC, ficam)
      const descricoes = juntar(g.chaves.map(c => {
        const d = descricaoMarcador(c, this.marcadores);
        return d.charAt(0).toLowerCase() + d.slice(1);
      }));
      return { chave: id, descricoes: descricoes.charAt(0).toUpperCase() + descricoes.slice(1), passo: g.passo };
    });

    this.temCodigo = !!b.Tabela?.Linhas.some(l => !!l.Codigo);
    this.gruposAcompanhamento = this.acompanhamento ? this.montarGrupos(b) : [];
    const s = b.Swot;
    this.quadrantes = s ? [
      { titulo: 'Forças', itens: s.Forcas ?? [] },
      { titulo: 'Fraquezas', itens: s.Fraquezas ?? [] },
      { titulo: 'Oportunidades', itens: s.Oportunidades ?? [] },
      { titulo: 'Ameaças', itens: s.Ameacas ?? [] }
    ] : [];

    // Outro fluxo no bloco: a descrição que já veio era do anterior
    if ((b.Fluxo?.Chave ?? null) !== this.chaveFluxo) {
      this.chaveFluxo = b.Fluxo?.Chave ?? null;
      this.defFluxo = null;
      this.numerosFluxo = null;
      this.erroFluxo = null;
    }
  }

  /**
   * Os grupos de um bloco do acompanhamento (E7 rodada B). O contrato não fixa a
   * forma: vale `Grupos` (cada um com a `Tabela`, ou com `Colunas` e `Linhas`, ou
   * com `Itens`) ou, sem grupos, a `Tabela` do bloco. Nada disso: vazio (a tela
   * diz que os dados não vieram).
   */
  private montarGrupos(b: PeDocBloco): GrupoAcompanhamento[] {
    if (Array.isArray(b.Grupos) && b.Grupos.length > 0) {
      return b.Grupos.map((g, i) => {
        const soltas = Array.isArray(g.Colunas) || Array.isArray(g.Linhas);
        const tabela: PeDocTabela | null = g.Tabela ?? (soltas
          ? { SecaoChave: g.Chave ?? '', SecaoTitulo: g.Titulo, Colunas: g.Colunas ?? [], Linhas: g.Linhas ?? [], Vazia: !(g.Linhas ?? []).length }
          : null);
        const itens = Array.isArray(g.Itens) ? g.Itens : [];
        const linhas = tabela?.Linhas ?? [];
        return {
          chave: g.Chave || `g${i}`,
          titulo: g.Titulo || null,
          texto: g.Texto?.trim() || null,
          tabela: tabela && linhas.length > 0 ? tabela : null,
          temCodigo: linhas.some(l => !!l.Codigo),
          itens,
          vazio: linhas.length === 0 && itens.length === 0
        };
      });
    }
    const t = b.Tabela;
    if (!t) return [];
    const linhas = t.Linhas ?? [];
    return [{
      chave: 'tabela', titulo: null, texto: null, tabela: linhas.length > 0 ? t : null, temCodigo: linhas.some(l => !!l.Codigo),
      itens: [], vazio: linhas.length === 0
    }];
  }

  // ── Fluxo ─────────────────────────────────────────────────────────────────

  /** Texto alternativo curto do desenho (a descrição completa fica no bloco logo abaixo). */
  get altFluxo(): string {
    const nome = this.bloco.Fluxo?.Nome ?? '';
    return `Desenho do fluxo ${nome}. A descrição em texto, em lista numerada, está logo abaixo do desenho.`;
  }

  get textoLinkFluxo(): string {
    const p = this.passoDados;
    if (!p) return '';
    return this.podeEditar ? `Ajustar o fluxo no passo ${p.numero}` : `Ver o fluxo no passo ${p.numero}`;
  }

  /**
   * A descrição em texto: o fluxo do órgão (a cópia dele ou o modelo) e os nomes
   * do dicionário, buscados só quando o bloco da descrição abre.
   */
  carregarDescricaoFluxo(): void {
    const fluxo = this.bloco.Fluxo;
    if (!fluxo || this.carregandoFluxo || this.defFluxo) return;
    const chave = fluxo.Chave;
    this.carregandoFluxo = true;
    this.erroFluxo = null;
    this.fluxosService.dicionarioDoPdtic(this.pdticId).subscribe(dicionario => this.dicionarioFluxo = dicionario);
    this.fluxosService.fluxo(this.pdticId, chave).subscribe({
      next: resposta => {
        this.carregandoFluxo = false;
        if (this.chaveFluxo !== chave) return;
        const def = normalizarDefinicao(resposta.Definicao);
        const numeros = numerosDoServidor(def);
        this.defFluxo = def;
        this.numerosFluxo = numeros.size ? numeros : null;
      },
      error: erro => {
        this.carregandoFluxo = false;
        // 403: o interceptor já tirou a pessoa do módulo
        const mensagem = mensagemErroPe(erro, 'Não foi possível carregar a descrição do fluxo.');
        if (mensagem !== null) this.erroFluxo = mensagem;
      }
    });
  }

  porChave(_: number, g: { chave: string }): string {
    return g.chave;
  }

  /** O texto formatado de uma célula (colunas de texto rico), ou null (a célula mostra o texto pronto). */
  rico(linha: PeDocLinha, chave: string): PeDocTextoRico | null {
    // Conferência barata (roda a cada detecção de mudanças): o documento vazio a leitura mostra como "-"
    const doc = linha.Ricos?.[chave] ?? null;
    return doc && typeof doc === 'object' ? doc : null;
  }

  porIndice(i: number): number {
    return i;
  }

  // ── Abrir e fechar o editor ───────────────────────────────────────────────

  /** O clique no texto abre o editor (menos num link do texto, que abre o endereço). */
  aoClicar(evento: MouseEvent): void {
    if (!this.podeEditar || this.aberto) return;
    const alvo = evento.target as HTMLElement | null;
    if (alvo?.closest('a, button')) return;
    this.abrir.emit();
  }

  pedirEdicao(): void {
    if (this.podeEditar && !this.aberto) this.abrir.emit();
  }

  private comecarEdicao(): void {
    const doc = normalizarDocumento(this.bloco.TextoBruto);
    this.valorInicial = doc;
    this.rascunho = doc;
    this.versaoRascunho = 0;
    this.versaoSalva = 0;
    this.situacaoSalvar = 'salvo';
    this.salvoEm = null;
    this.erroSalvar = null;
    this.fecharDepois = false;
    this.devolverFoco = false;
  }

  private terminarEdicao(): void {
    if (this.destruido) return;
    if (this.temMudanca()) this.salvar();
    if (this.devolverFoco) {
      this.devolverFoco = false;
      this.focoPendente = this.idBotaoEditar;
    }
  }

  /** "Pronto" (ou Esc): salva o que falta e fecha; com erro, fica aberto mostrando o erro. */
  pronto(): void {
    if (this.situacaoSalvar === 'erro' && !this.salvando) {
      this.salvar();
      this.fecharDepois = true;
      return;
    }
    if (this.salvando || this.temMudanca()) {
      this.fecharDepois = true;
      if (!this.salvando) this.salvar();
      return;
    }
    if (this.salvoEm) this.acessibilidade.anunciar('Texto salvo.');
    this.devolverFoco = true;
    this.fechar.emit();
  }

  /** Esc no editor sem painel aberto (o painel do link ou da imagem fecha antes). */
  aoEsc(evento: Event): void {
    evento.stopPropagation();
    this.pronto();
  }

  // ── Salvar sozinho ────────────────────────────────────────────────────────

  aoMudarTexto(doc: PeDocTextoRico | null): void {
    this.rascunho = doc;
    this.versaoRascunho++;
    this.erroSalvar = null;
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
    if (!this.salvando) this.situacaoSalvar = 'pendente';
    this.avisarPendente();
    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      this.salvar();
    }, ESPERA_SALVAR_MS);
  }

  tentarDeNovo(): void {
    this.salvar();
  }

  /** O rascunho mudou depois do último envio. */
  private temMudanca(): boolean {
    return this.versaoRascunho > this.versaoSalva;
  }

  private salvar(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
    if (this.salvando) return;
    if (!this.temMudanca()) {
      if (this.fecharDepois) this.concluirFechamento();
      return;
    }
    this.enviar();
  }

  private enviar(): void {
    // Sem texto, vai o documento vazio: o bloco sai em branco (para voltar ao modelo, há o botão)
    const texto = docParaEnvio(this.rascunho) ?? DOC_VAZIO;
    const versao = this.versaoRascunho;
    this.salvando = true;
    this.situacaoSalvar = 'salvando';
    this.avisarPendente();
    // Segundo plano: a situação do texto ("Salvando...", "Salvo às") é o sinal
    this.documentoService.salvarBloco(this.alvoDoTexto, this.bloco.Id, texto, semCarregamento()).subscribe({
      next: novo => {
        this.salvando = false;
        this.versaoSalva = Math.max(this.versaoSalva, versao);
        this.salvoEm = new Date();
        this.erroSalvar = null;
        this.atualizado.emit(novo);
        if (this.destruido) return;
        if (this.temMudanca()) {
          // Escreveram enquanto salvava: salva de novo em seguida
          this.situacaoSalvar = 'pendente';
          this.avisarPendente();
          this.temporizador = setTimeout(() => {
            this.temporizador = null;
            this.salvar();
          }, this.fecharDepois ? 0 : ESPERA_SALVAR_MS);
          return;
        }
        this.situacaoSalvar = 'salvo';
        this.avisarPendente();
        if (this.fecharDepois) this.concluirFechamento();
      },
      error: erro => {
        this.salvando = false;
        this.fecharDepois = false;
        if (this.destruido) return;
        const mensagem = mensagemErroPe(erro, 'Não foi possível salvar o texto. Confira a conexão e tente de novo.');
        this.situacaoSalvar = 'erro';
        this.erroSalvar = mensagem ?? 'Não foi possível salvar o texto.';
        this.avisarPendente();
      }
    });
  }

  private concluirFechamento(): void {
    this.fecharDepois = false;
    if (!this.aberto) return;
    this.acessibilidade.anunciar('Texto salvo.');
    this.devolverFoco = true;
    this.fechar.emit();
  }

  /** A prévia fica sabendo quando passa a haver (ou deixa de haver) texto não salvo. */
  private avisarPendente(): void {
    const agora = this.salvando || this.temMudanca() || (this.situacaoSalvar === 'erro');
    if (agora === this.avisadoPendente) return;
    this.avisadoPendente = agora;
    this.pendente.emit(agora);
  }

  private hora(data: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(data.getHours())}:${pad(data.getMinutes())}`;
  }

  // ── Texto do modelo ───────────────────────────────────────────────────────

  /** Apaga o texto do órgão: o bloco volta a seguir o modelo. */
  voltarAoModelo(): void {
    if (this.voltando || this.salvando || !this.podeEditar) return;
    const aviso = this.bloco.ModeloMudou
      ? 'Usar o texto do modelo? O texto que o órgão escreveu neste bloco vai se perder.'
      : 'Voltar ao texto do modelo? O texto que o órgão escreveu neste bloco vai se perder.';
    if (!confirm(aviso)) return;
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
    this.voltando = true;
    this.documentoService.voltarAoModelo(this.alvoDoTexto, this.bloco.Id).subscribe({
      next: novo => {
        this.voltando = false;
        // O que estava no editor foi descartado junto com a cópia do órgão
        this.versaoSalva = this.versaoRascunho;
        this.situacaoSalvar = 'salvo';
        this.comparando = false;
        this.avisarPendente();
        this.atualizado.emit(novo);
        const texto = 'O bloco voltou ao texto do modelo.';
        this.notificacoes.success(texto);
        this.acessibilidade.anunciar(texto);
        if (this.aberto) {
          this.devolverFoco = true;
          this.fechar.emit();
        }
      },
      error: erro => {
        this.voltando = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível voltar ao texto do modelo. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  /** "O modelo mudou": o órgão fica com o texto dele (gravar de novo tira o aviso). */
  manterTextoDoOrgao(): void {
    const texto = docParaEnvio(this.bloco.TextoBruto);
    if (this.mantendo || !texto || !this.podeEditar) return;
    this.mantendo = true;
    this.documentoService.salvarBloco(this.alvoDoTexto, this.bloco.Id, texto).subscribe({
      next: novo => {
        this.mantendo = false;
        this.comparando = false;
        this.atualizado.emit(novo);
        const mensagem = 'O órgão ficou com o texto dele neste bloco.';
        this.notificacoes.success(mensagem);
        this.acessibilidade.anunciar(mensagem);
      },
      error: erro => {
        this.mantendo = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível gravar a escolha. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }
}
