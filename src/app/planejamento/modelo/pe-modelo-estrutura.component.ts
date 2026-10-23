import { AfterViewChecked, Component, DestroyRef, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, from, of } from 'rxjs';
import { catchError, concatMap, map } from 'rxjs/operators';
import {
  PeCampoModelo, PeConfigCampo, PeEscopoSecao, PeEtapaModelo, PeModelo, PeNivel, PeOpcaoModelo,
  PePassoModelo, PeSecaoModelo, PeSituacao, PeTipoCampo, PeTipoSecao
} from '../../../api/planejamento/interface';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { AcessibilidadeService } from '../../core/acessibilidade/acessibilidade.service';
import { NotificationService } from '../../core/services/notification.service';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { PeHistoricoComponent } from '../shared/pe-historico.component';
import { PeOpcoesEditorComponent } from '../shared/pe-opcoes-editor.component';
import { CampoParaCalculo, PeConfigCampoComponent, SecaoParaLigar } from '../shared/pe-config-campo.component';
import {
  ESCOPOS_FORA_DO_PDTIC, EXPLICACAO_CAMPO_TRAVADO, LARGURAS, OpcaoRotulo, SITUACOES, TIPOS_CAMPO, TIPOS_SECAO,
  citacaoTravado, configPadrao, configParaEnvio, corSituacao, descricaoCampo, errosDoConfig, errosDoConfigNoServidor, rotuloEscopo,
  rotuloSituacao, rotuloTipoCampo, rotuloTipoPasso, tipoComOpcoes
} from '../shared/pe-modelo-rotulos';
import { PeConfirmacaoService } from '../shared/pe-confirmacao.service';
import {
  ItemComSituacao, campoNaoDesliga, campoTravadoPorSi, modeloOrdenado, nomesDoModelo, situacaoNoNivel, todasAsSecoes
} from '../shared/pe-modelo-arvore';
import { mensagemErroPe } from '../shared/pe-erros';
import { PeModeloService, PeTipoItemModelo } from '../services/pe-modelo.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { rotuloGuia } from '../trilha/pe-trilhas';

type TipoLinha = 'etapa' | 'passo' | 'secao' | 'campo';
type TipoComSituacao = Exclude<TipoLinha, 'etapa'>;

const API: Record<TipoComSituacao, PeTipoItemModelo> = { passo: 'passos', secao: 'secoes', campo: 'campos' };

const ROTULO_TIPO: Record<TipoLinha, string> = { etapa: 'a etapa', passo: 'o passo', secao: 'a seção', campo: 'o campo' };

/** Situação mudada na tela e ainda não salva (o mapa inteiro do item, ou a situação geral fora do PDTIC). */
interface Pendente {
  tipo: TipoComSituacao;
  id: number;
  nome: string;
  niveis?: Record<string, PeSituacao>;
  geral?: PeSituacao;
}

/** Formulário da janela de edição (um só, com os campos de todos os tipos). */
interface FormEdicao {
  tipo: TipoLinha;
  novo: boolean;
  somenteLeitura: boolean;
  etapa: PeEtapaModelo | null;
  passo: PePassoModelo | null;
  secao: PeSecaoModelo | null;
  campo: PeCampoModelo | null;
  /** Seção nova fora do PDTIC. */
  escopo: PeEscopoSecao | null;
  titulo: string;
  descricao: string;
  oQueFazer: string;
  baseLegal: string;
  referenciaGuia: string;
  aceitaNaoSeAplica: boolean;
  ajuda: string;
  tipoSecao: PeTipoSecao;
  prefixoCodigo: string;
  noDocumento: boolean;
  naPlanilha: boolean;
  rotulo: string;
  tipoCampo: PeTipoCampo;
  config: PeConfigCampo;
  largura: string;
  tentou: boolean;
  /** F1 (A14): os erros do 400 na configuração, pela chave do config ("max", "secao"...). */
  errosServidor?: Record<string, string>;
  /** F1 (A14): a mensagem do 400 que não é de um campo da configuração (fica no resumo da janela). */
  mensagemServidor?: string | null;
}

/**
 * O "o que fazer" do passo é opcional (revisão dos textos de 2026-10-20: fica vazio
 * quando o título já diz tudo). Vazio vai ao servidor como este valor: ponto único
 * para trocar por null se o servidor passar a preferir.
 */
export const O_QUE_FAZER_VAZIO: string | null = '';

function oQueFazerParaEnvio(texto: string): string | null {
  return texto.trim() || O_QUE_FAZER_VAZIO;
}

/** Tamanhos que a tela aceita (o servidor confere de novo). */
export const LIMITES_MODELO = {
  titulo: 300,
  oQueFazer: 2000,
  baseLegal: 300,
  referencia: 100,
  ajuda: 2000,
  rotulo: 200,
  descricao: 1000,
  prefixo: 3
} as const;

/**
 * Editor do modelo (passo 1.2 do administrador do módulo): a árvore etapas,
 * passos, seções e campos, com a situação de cada item em cada nível lado a
 * lado (uma tabela de verdade, com os níveis no cabeçalho), no molde de uma
 * matriz. Também as seções fora do PDTIC (PETIC-DF e referenciais do DF), com a
 * situação geral no lugar dos níveis.
 *
 * - Situação: mudar a lista não grava sozinho (a seta do teclado mudaria o valor
 *   a cada toque); as mudanças ficam marcadas e a barra do pé da tela salva todas
 *   ou desfaz. Travado (conteúdo mínimo do art. 12, § 2º) e o campo principal da
 *   seção travada não têm a opção "Desligado".
 * - Janela de edição: título, o que fazer, base legal, referência do guia, ajuda,
 *   rótulo, tipo e configuração do campo, opções das listas, largura, se aparece
 *   no documento e na planilha, e o histórico do item. Item que veio do guia ou do
 *   decreto não muda de tipo; só o que o administrador criou pode ser apagado
 *   (exclusão lógica: os dados dos órgãos ficam guardados).
 * - Ordem com os botões subir e descer; criar passo (de dados), seção e campo.
 * - "O que mudou no modelo": o histórico geral.
 * - Endereço com `?item=campo-123` abre a árvore até o item e põe o foco nele.
 */
@Component({
  selector: 'app-pe-modelo-estrutura',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, CitaPlanejamentoDirective, DialogoDirective,
    PeHistoricoComponent, PeOpcoesEditorComponent, PeConfigCampoComponent
  ],
  templateUrl: './pe-modelo-estrutura.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeModeloEstruturaComponent implements OnInit, AfterViewChecked {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly modeloService = inject(PeModeloService);
  private readonly notificacoes = inject(NotificationService);
  private readonly acessibilidade = inject(AcessibilidadeService);
  private readonly confirmacao = inject(PeConfirmacaoService);
  private readonly rota = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly situacoes = SITUACOES;
  readonly tiposCampo = TIPOS_CAMPO;
  readonly tiposSecao = TIPOS_SECAO;
  readonly larguras: OpcaoRotulo[] = LARGURAS;
  readonly escoposFora = ESCOPOS_FORA_DO_PDTIC;
  readonly limites = LIMITES_MODELO;
  readonly explicacaoCampoTravado = EXPLICACAO_CAMPO_TRAVADO;

  pode: boolean | null = null;
  erroPapel = false;
  private iniciado = false;

  modelo: PeModelo | null = null;
  niveis: PeNivel[] = [];
  carregando = false;
  erroCarga = false;
  incluirExcluidos = false;

  /** Ramos abertos (`etapa:1`, `passo:10`, `secao:100`). */
  abertos = new Set<string>();
  pendentes = new Map<string, Pendente>();
  salvandoSituacoes = false;
  movendo = false;
  apagando: string | null = null;

  edicao: FormEdicao | null = null;
  salvando = false;
  /** O histórico só carrega quando a pessoa abre o bloco. */
  historicoGeralAberto = false;
  historicoItemAberto = false;

  /** Seções que um campo de ligação pode apontar, e os campos da seção em edição (cálculo). */
  secoesParaLigar: SecaoParaLigar[] = [];
  camposParaCalculo: CampoParaCalculo[] = [];

  private indice = new Map<string, ItemComSituacao>();
  private ancestrais = new Map<string, string[]>();
  /** Irmãos (na ordem) e pai de cada item: as linhas da tabela só passam o item ao modelo da linha. */
  private parentes = new Map<string, { irmaos: ItemComSituacao[]; pai: PeEtapaModelo | PePassoModelo | PeSecaoModelo | null }>();
  private focoPendente: string | null = null;
  private itemPedido: string | null = null;

  ngOnInit(): void {
    this.itemPedido = this.rota.snapshot.queryParamMap.get('item');
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        if (!estado || estado.carga !== 'pronta') return;
        this.pode = this.estadoService.podeConfigurar;
        this.erroPapel = estado.consultaPapel === 'erro';
        if (this.pode && !this.iniciado) {
          this.iniciado = true;
          this.carregar();
        }
      });
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.scrollIntoView({ block: 'center' });
    alvo.focus();
  }

  tentarDeNovo(): void {
    this.estadoService.iniciar();
  }

  // ── Carga ─────────────────────────────────────────────────────────────────

  carregar(depois?: () => void): void {
    this.carregando = true;
    this.erroCarga = false;
    this.modeloService.modelo(this.incluirExcluidos).subscribe({
      next: modelo => {
        this.aplicarModelo(modelo);
        this.carregando = false;
        depois?.();
      },
      error: () => {
        this.carregando = false;
        this.erroCarga = true;
      }
    });
  }

  alternarExcluidos(): void {
    this.carregar();
  }

  private aplicarModelo(bruto: PeModelo): void {
    const primeiraCarga = !this.modelo;
    this.modelo = modeloOrdenado(bruto);
    this.niveis = this.modelo.Niveis;
    this.indexar();
    if (primeiraCarga) {
      // Começa com as etapas abertas (os passos à vista) e os passos fechados
      for (const etapa of this.modelo.Etapas) this.abertos.add(this.chave('etapa', etapa.Id));
      if (this.itemPedido) {
        this.revelar(this.itemPedido.replace('-', ':'));
        this.itemPedido = null;
      }
    }
    // Mudança pendente de item que sumiu (apagado em outra aba) não tem mais onde salvar
    for (const [chave] of this.pendentes) {
      if (!this.indice.has(chave)) this.pendentes.delete(chave);
    }
  }

  private indexar(): void {
    this.indice = new Map();
    this.ancestrais = new Map();
    this.parentes = new Map();
    const m = this.modelo;
    if (!m) return;
    for (const etapa of m.Etapas) {
      const ke = this.chave('etapa', etapa.Id);
      for (const passo of etapa.Passos) {
        const kp = this.chave('passo', passo.Id);
        this.indice.set(kp, passo);
        this.ancestrais.set(kp, [ke]);
        this.parentes.set(kp, { irmaos: etapa.Passos, pai: etapa });
        for (const secao of passo.Secoes) this.indexarSecao(secao, [ke, kp], passo.Secoes, passo);
      }
    }
    for (const secao of m.SecoesForaDoPdtic) this.indexarSecao(secao, [], m.SecoesForaDoPdtic, null);
  }

  private indexarSecao(secao: PeSecaoModelo, acima: string[], irmas: PeSecaoModelo[], passo: PePassoModelo | null): void {
    const ks = this.chave('secao', secao.Id);
    this.indice.set(ks, secao);
    this.ancestrais.set(ks, acima);
    this.parentes.set(ks, { irmaos: irmas, pai: passo });
    for (const campo of secao.Campos) {
      const kc = this.chave('campo', campo.Id);
      this.indice.set(kc, campo);
      this.ancestrais.set(kc, [...acima, ks]);
      this.parentes.set(kc, { irmaos: secao.Campos, pai: secao });
    }
  }

  /** Nome do item na tela (título ou rótulo). */
  nomeDe(item: ItemComSituacao | PeEtapaModelo): string {
    return 'Rotulo' in item ? item.Rotulo : item.Titulo;
  }

  private pai(tipo: TipoComSituacao, item: ItemComSituacao) {
    return this.parentes.get(this.chave(tipo, item.Id))?.pai ?? null;
  }

  irmaos(tipo: TipoComSituacao, item: ItemComSituacao): ItemComSituacao[] {
    return this.parentes.get(this.chave(tipo, item.Id))?.irmaos ?? [];
  }

  posicaoDe(tipo: TipoComSituacao, item: ItemComSituacao): number {
    return this.irmaos(tipo, item).indexOf(item);
  }

  /** Seção de um campo (a linha do campo só conhece o campo). */
  secaoDoCampo(campo: PeCampoModelo): PeSecaoModelo | null {
    return this.pai('campo', campo) as PeSecaoModelo | null;
  }

  /** Abre a janela de edição do item certo, com o pai dele. */
  editar(tipo: TipoComSituacao, item: ItemComSituacao): void {
    const pai = this.pai(tipo, item);
    if (tipo === 'passo' && pai) this.editarPasso(item as PePassoModelo, pai as PeEtapaModelo);
    else if (tipo === 'secao') this.editarSecao(item as PeSecaoModelo, pai as PePassoModelo | null);
    else if (tipo === 'campo' && pai) this.editarCampo(item as PeCampoModelo, pai as PeSecaoModelo);
  }

  /** Abre a árvore até o item e põe o foco no botão de editar dele. */
  private revelar(chave: string): void {
    for (const acima of this.ancestrais.get(chave) ?? []) this.abertos.add(acima);
    const [tipo, id] = chave.split(':');
    this.focoPendente = `pe-editar-${tipo}-${id}`;
  }

  // ── Árvore ────────────────────────────────────────────────────────────────

  chave(tipo: TipoLinha, id: number): string {
    return `${tipo}:${id}`;
  }

  aberto(tipo: TipoLinha, id: number): boolean {
    return this.abertos.has(this.chave(tipo, id));
  }

  alternar(tipo: TipoLinha, id: number): void {
    const k = this.chave(tipo, id);
    if (this.abertos.has(k)) this.abertos.delete(k);
    else this.abertos.add(k);
  }

  abrirTudo(): void {
    for (const [chave] of this.ancestrais) {
      if (!chave.startsWith('campo:')) this.abertos.add(chave);
    }
    for (const etapa of this.modelo?.Etapas ?? []) this.abertos.add(this.chave('etapa', etapa.Id));
  }

  fecharTudo(): void {
    this.abertos = new Set((this.modelo?.Etapas ?? []).map(e => this.chave('etapa', e.Id)));
  }

  porId(_: number, item: { Id: number }): number {
    return item.Id;
  }

  // ── Situação por nível ────────────────────────────────────────────────────

  /** O valor que a lista mostra: a mudança pendente, senão o gravado. */
  situacaoNaTela(tipo: TipoComSituacao, item: ItemComSituacao, nivelId: number): PeSituacao {
    return this.pendentes.get(this.chave(tipo, item.Id))?.niveis?.[String(nivelId)] ?? situacaoNoNivel(item, nivelId);
  }

  celulaMudou(tipo: TipoComSituacao, item: ItemComSituacao, nivelId: number): boolean {
    const p = this.pendentes.get(this.chave(tipo, item.Id));
    return !!p?.niveis && p.niveis[String(nivelId)] !== situacaoNoNivel(item, nivelId);
  }

  linhaMudou(tipo: TipoComSituacao, item: ItemComSituacao): boolean {
    return this.pendentes.has(this.chave(tipo, item.Id));
  }

  mudarSituacao(tipo: TipoComSituacao, item: ItemComSituacao, nivelId: number, valor: PeSituacao): void {
    const k = this.chave(tipo, item.Id);
    const gravado = this.mapaGravado(item);
    const novo = { ...gravado, ...(this.pendentes.get(k)?.niveis ?? {}), [String(nivelId)]: valor };
    const igual = Object.keys(gravado).every(id => gravado[id] === novo[id]);
    if (igual) this.pendentes.delete(k);
    else this.pendentes.set(k, { tipo, id: item.Id, nome: this.nomeDe(item), niveis: novo });
  }

  geralNaTela(tipo: TipoComSituacao, item: PeSecaoModelo | PeCampoModelo): PeSituacao {
    return this.pendentes.get(this.chave(tipo, item.Id))?.geral ?? item.SituacaoGeral ?? 'desligado';
  }

  mudarGeral(tipo: TipoComSituacao, item: PeSecaoModelo | PeCampoModelo, valor: PeSituacao): void {
    const k = this.chave(tipo, item.Id);
    if (valor === (item.SituacaoGeral ?? 'desligado')) this.pendentes.delete(k);
    else this.pendentes.set(k, { tipo, id: item.Id, nome: this.nomeDe(item), geral: valor });
  }

  /** Situação gravada em todos os níveis (sem registro, desligado). */
  private mapaGravado(item: ItemComSituacao): Record<string, PeSituacao> {
    const mapa: Record<string, PeSituacao> = {};
    for (const n of this.niveis) mapa[String(n.Id)] = situacaoNoNivel(item, n.Id);
    return mapa;
  }

  classeSituacao(valor: PeSituacao, mudou: boolean): string {
    return `${corSituacao(valor)} ${mudou ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'}`;
  }

  /**
   * Campo travado por si (o tema das ações, com os três temas do decreto), e não
   * por ser o principal de uma seção travada: ganha o cadeado e a explicação.
   */
  travadoPorSi(campo: PeCampoModelo): boolean {
    const secao = this.secaoDoCampo(campo);
    return !!secao && campoTravadoPorSi(campo, secao);
  }

  /** Passo e seção travados não desligam; nem o campo principal da seção travada, nem o campo travado. */
  naoDesliga(tipo: TipoComSituacao, item: ItemComSituacao): boolean {
    if (tipo === 'passo') return (item as PePassoModelo).Travado;
    if (tipo === 'secao') return (item as PeSecaoModelo).Travada;
    const secao = this.secaoDoCampo(item as PeCampoModelo);
    return !!secao && campoNaoDesliga(item as PeCampoModelo, secao);
  }

  citacao(inciso: string | null): string {
    return citacaoTravado(inciso);
  }

  get quantasPendentes(): number {
    return this.pendentes.size;
  }

  descartarSituacoes(): void {
    if (this.salvandoSituacoes) return;
    this.pendentes = new Map();
    this.acessibilidade.anunciar('Mudanças de situação desfeitas.');
    // A barra sai da tela com o botão: o foco vai para a tabela (F1, A05)
    this.focoPendente = 'pe-estrutura-tabela';
  }

  /** Grava as situações mudadas, uma a uma; o que falhar continua marcado. */
  salvarSituacoes(): void {
    if (this.salvandoSituacoes || !this.pendentes.size) return;
    this.salvandoSituacoes = true;
    const resultados: { nome: string; erro?: string | null }[] = [];
    // Um a um, na ordem; o resultado de cada um é juntado aqui (sem toArray, que traria mais código ao pacote inicial)
    from([...this.pendentes.values()]).pipe(concatMap(p => this.gravarSituacao(p))).subscribe({
      next: resultado => resultados.push(resultado),
      complete: () => {
        this.salvandoSituacoes = false;
        // Tudo salvo: a barra sai da tela com o botão, e o foco vai para a tabela (F1, A05)
        if (!this.pendentes.size) this.focoPendente = 'pe-estrutura-tabela';
        const falhas = resultados.filter(r => r.erro !== undefined);
        const certas = resultados.length - falhas.length;
        if (certas > 0) {
          this.notificacoes.success(certas === 1 ? '1 item salvo. A mudança já vale para os órgãos.' : `${certas} itens salvos. As mudanças já valem para os órgãos.`);
        }
        const comMensagem = falhas.filter(f => f.erro);
        if (comMensagem.length) {
          this.notificacoes.error(`Não foi possível salvar ${comMensagem.length === 1 ? 'um item' : comMensagem.length + ' itens'}: `
            + comMensagem.map(f => `${f.nome} (${f.erro})`).join('; '));
        }
      }
    });
  }

  private gravarSituacao(p: Pendente): Observable<{ nome: string; erro?: string | null }> {
    const corpo = p.geral ? { SituacaoGeral: p.geral } : { Niveis: p.niveis };
    return this.modeloService.definirSituacoes<ItemComSituacao>(API[p.tipo], p.id, corpo).pipe(
      map(resposta => {
        const k = this.chave(p.tipo, p.id);
        const item = this.indice.get(k);
        if (item && p.geral) {
          // Só seção e campo (fora do PDTIC) têm a situação geral
          const comGeral = item as PeSecaoModelo | PeCampoModelo;
          comGeral.SituacaoGeral = (resposta as Partial<PeSecaoModelo> | null)?.SituacaoGeral ?? p.geral;
        } else if (item) {
          item.Niveis = resposta?.Niveis ?? p.niveis ?? item.Niveis;
        }
        this.pendentes.delete(k);
        return { nome: p.nome };
      }),
      // null: 403 (o interceptor já tirou a pessoa da tela)
      catchError(erro => of({ nome: p.nome, erro: mensagemErroPe(erro, 'erro no servidor') }))
    );
  }

  /** Guarda de rota: com mudança de situação não salva, ela pergunta antes de sair (F1, A04). */
  podeSair(): boolean {
    return !this.pendentes.size;
  }

  textoSaida(): string {
    return 'Há mudanças de situação não salvas. Se sair agora, elas se perdem.';
  }

  // ── Ordem ─────────────────────────────────────────────────────────────────

  /**
   * Troca o item com o vizinho e grava a ordem dos irmãos. Com os itens apagados
   * à vista, a ordem não muda (os botões ficam desligados).
   */
  mover(tipo: TipoComSituacao, item: ItemComSituacao, delta: -1 | 1): void {
    const lista = this.irmaos(tipo, item);
    const indice = lista.indexOf(item);
    const nome = this.nomeDe(item);
    const destino = indice + delta;
    if (this.movendo || this.incluirExcluidos || indice < 0 || destino < 0 || destino >= lista.length) return;
    const atual = lista[indice];
    const nova = [...lista];
    [nova[indice], nova[destino]] = [nova[destino], atual];
    const ids = nova.map(i => i.Id);
    this.movendo = true;
    this.modeloService.ordenar(API[tipo], ids).subscribe({
      next: () => {
        this.movendo = false;
        lista.splice(0, lista.length, ...nova);
        lista.forEach((item, i) => item.Ordem = i + 1);
        // O foco volta ao botão usado; na ponta da lista ele fica desligado, e o foco vai ao outro
        const naPonta = destino === 0 || destino === lista.length - 1;
        const botao = naPonta ? (delta < 0 ? 'descer' : 'subir') : (delta < 0 ? 'subir' : 'descer');
        this.focoPendente = lista.length > 1 ? `pe-${botao}-${tipo}-${atual.Id}` : null;
        this.acessibilidade.anunciar(`${nome} agora na posição ${destino + 1} de ${lista.length}.`);
      },
      error: erro => {
        this.movendo = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível mudar a ordem. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  // ── Apagar ────────────────────────────────────────────────────────────────

  apagar(tipo: TipoComSituacao, item: ItemComSituacao): void {
    if (item.Sistema || item.Excluido || this.apagando) return;
    const nome = this.nomeDe(item);
    const onde = tipo === 'campo' ? 'do formulário, das tabelas, do documento e das planilhas' : 'do passo a passo, do documento e das planilhas';
    const filhos = tipo === 'passo' ? ' As seções e os campos dele saem junto.' : tipo === 'secao' ? ' Os campos dela saem junto.' : '';
    this.confirmacao.perguntar({
      titulo: `Apagar ${ROTULO_TIPO[tipo]} "${nome}"?`,
      texto: `Sai ${onde} de todos os órgãos.${filhos} Os dados que os órgãos já preencheram ficam guardados.`,
      sim: 'Apagar',
      perigo: true
    }).then(sim => {
      if (sim) this.apagarSim(tipo, item, nome);
    });
  }

  private apagarSim(tipo: TipoComSituacao, item: ItemComSituacao, nome: string): void {
    const k = this.chave(tipo, item.Id);
    // Depois de apagar, o foco vai para o "Editar" do item de cima (o botão de apagar sai da tela; F1, A05)
    const pai = this.pai(tipo, item);
    const tipoPai = tipo === 'campo' ? 'secao' : tipo === 'secao' ? 'passo' : 'etapa';
    const alvoFoco = pai ? `pe-editar-${tipoPai}-${pai.Id}` : 'pe-estrutura-tabela-fora';
    this.apagando = k;
    this.modeloService.apagar(API[tipo], item.Id).subscribe({
      next: () => {
        this.apagando = null;
        this.pendentes.delete(k);
        this.notificacoes.success(`${ROTULO_TIPO[tipo].charAt(0).toUpperCase() + ROTULO_TIPO[tipo].slice(1)} "${nome}" foi apagad${tipo === 'passo' || tipo === 'campo' ? 'o' : 'a'}.`);
        this.carregar(() => this.focoPendente = alvoFoco);
      },
      error: erro => {
        this.apagando = null;
        const mensagem = mensagemErroPe(erro, 'Não foi possível apagar. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  // ── Janela de edição ──────────────────────────────────────────────────────

  private formVazio(tipo: TipoLinha, novo: boolean): FormEdicao {
    this.historicoItemAberto = false;
    return {
      tipo, novo, somenteLeitura: false, etapa: null, passo: null, secao: null, campo: null, escopo: null,
      titulo: '', descricao: '', oQueFazer: '', baseLegal: '', referenciaGuia: '', aceitaNaoSeAplica: false,
      ajuda: '', tipoSecao: 'formulario', prefixoCodigo: '', noDocumento: true, naPlanilha: true,
      rotulo: '', tipoCampo: 'texto_curto', config: configPadrao('texto_curto'), largura: '', tentou: false
    };
  }

  editarEtapa(etapa: PeEtapaModelo): void {
    this.edicao = { ...this.formVazio('etapa', false), etapa, titulo: etapa.Titulo, descricao: etapa.Descricao ?? '' };
  }

  editarPasso(passo: PePassoModelo, etapa: PeEtapaModelo): void {
    this.edicao = {
      ...this.formVazio('passo', false), etapa, passo, somenteLeitura: passo.Excluido,
      titulo: passo.Titulo, oQueFazer: passo.OQueFazer ?? '', baseLegal: passo.BaseLegal ?? '',
      referenciaGuia: passo.ReferenciaGuia ?? '', aceitaNaoSeAplica: passo.AceitaNaoSeAplica
    };
  }

  editarSecao(secao: PeSecaoModelo, passo: PePassoModelo | null): void {
    this.edicao = {
      ...this.formVazio('secao', false), passo, secao, somenteLeitura: secao.Excluido,
      titulo: secao.Titulo, ajuda: secao.Ajuda ?? '', tipoSecao: secao.Tipo, prefixoCodigo: secao.PrefixoCodigo ?? '',
      noDocumento: secao.NoDocumento, naPlanilha: secao.NaPlanilha
    };
  }

  editarCampo(campo: PeCampoModelo, secao: PeSecaoModelo): void {
    this.prepararListas(secao, campo);
    this.edicao = {
      ...this.formVazio('campo', false), secao, campo, somenteLeitura: campo.Excluido || secao.Excluido,
      rotulo: campo.Rotulo, ajuda: campo.Ajuda ?? '', tipoCampo: campo.Tipo,
      // A configuração gravada, sem acrescentar padrões: abrir e salvar não muda o que não foi mexido
      config: JSON.parse(JSON.stringify(campo.Config ?? {})) as PeConfigCampo,
      largura: campo.Largura ?? '', noDocumento: campo.NoDocumento, naPlanilha: campo.NaPlanilha
    };
  }

  novoPasso(etapa: PeEtapaModelo): void {
    this.edicao = { ...this.formVazio('passo', true), etapa };
  }

  novaSecao(passo: PePassoModelo): void {
    this.edicao = { ...this.formVazio('secao', true), passo };
  }

  novaSecaoFora(): void {
    this.edicao = { ...this.formVazio('secao', true), escopo: 'petic' };
  }

  novoCampo(secao: PeSecaoModelo): void {
    this.prepararListas(secao, null);
    this.edicao = { ...this.formVazio('campo', true), secao };
  }

  /** Tipo novo, configuração do tipo novo. */
  trocarTipoCampo(tipo: PeTipoCampo): void {
    if (!this.edicao) return;
    this.edicao.tipoCampo = tipo;
    this.edicao.config = configPadrao(tipo);
  }

  fecharEdicao(): void {
    if (!this.salvando) this.edicao = null;
  }

  private prepararListas(secao: PeSecaoModelo, campo: PeCampoModelo | null): void {
    const m = this.modelo;
    this.secoesParaLigar = m
      ? todasAsSecoes(m).filter(s => !s.Excluido && s.Id !== secao.Id && s.Escopo === secao.Escopo)
        .map(s => ({ chave: s.Chave, titulo: s.Titulo }))
      : [];
    this.camposParaCalculo = secao.Campos
      .filter(c => !c.Excluido && c.Id !== campo?.Id)
      .map(c => ({ chave: c.Chave, rotulo: c.Rotulo, tipo: c.Tipo }));
  }

  get tituloEdicao(): string {
    const e = this.edicao;
    if (!e) return '';
    if (e.novo) {
      if (e.tipo === 'passo') return `Novo passo na etapa "${e.etapa?.Titulo ?? ''}"`;
      if (e.tipo === 'secao') return e.passo ? `Nova seção no passo "${e.passo.Titulo}"` : 'Nova seção fora do PDTIC';
      return `Novo campo na seção "${e.secao?.Titulo ?? ''}"`;
    }
    const nome = e.tipo === 'etapa' ? e.etapa?.Titulo : e.tipo === 'passo' ? e.passo?.Titulo : e.tipo === 'secao' ? e.secao?.Titulo : e.campo?.Rotulo;
    return `${e.somenteLeitura ? 'Consultar' : 'Editar'} ${ROTULO_TIPO[e.tipo]} "${nome ?? ''}"`;
  }

  /** Item do sistema (do guia ou do decreto) não muda de tipo. */
  get tipoBloqueado(): boolean {
    const e = this.edicao;
    if (!e || e.novo) return false;
    return e.tipo === 'secao' ? !!e.secao?.Sistema : e.tipo === 'campo' ? !!e.campo?.Sistema : true;
  }

  get entidadeHistorico(): { entidade: string; id: number } | null {
    const e = this.edicao;
    if (!e || e.novo) return null;
    if (e.tipo === 'etapa' && e.etapa) return { entidade: 'etapa', id: e.etapa.Id };
    if (e.tipo === 'passo' && e.passo) return { entidade: 'passo', id: e.passo.Id };
    if (e.tipo === 'secao' && e.secao) return { entidade: 'secao', id: e.secao.Id };
    if (e.tipo === 'campo' && e.campo) return { entidade: 'campo', id: e.campo.Id };
    return null;
  }

  get comOpcoes(): boolean {
    return !!this.edicao && tipoComOpcoes(this.edicao.tipoCampo);
  }

  /** O que falta para salvar, em linguagem simples (só depois da primeira tentativa). */
  get errosEdicao(): string[] {
    const e = this.edicao;
    if (!e || !e.tentou) return [];
    const erros: string[] = [];
    if (e.tipo === 'etapa' || e.tipo === 'passo' || e.tipo === 'secao') {
      if (!e.titulo.trim()) erros.push('Escreva o título.');
    }
    if (e.tipo === 'secao' && e.tipoSecao === 'tabela' && !/^[A-Z]{1,3}$/.test(e.prefixoCodigo.trim())) {
      erros.push('Numa tabela, o prefixo do código é obrigatório: de 1 a 3 letras maiúsculas (ex.: N, para N01, N02...).');
    }
    if (e.tipo === 'campo') {
      if (!e.rotulo.trim()) erros.push('Escreva o rótulo do campo.');
      // A faixa de cada configuração, com as mensagens do servidor, e os erros que o servidor mandou (F1, A14)
      erros.push(...Object.values(this.errosConfig));
      if (e.tipoCampo === 'ligacao_secao' && !e.config.secao && !this.errosConfig['secao']) erros.push('Escolha a seção ligada.');
      if (e.tipoCampo === 'arquivo' && !(e.config.tipos ?? []).length) erros.push('Marque ao menos um tipo de arquivo.');
      if (e.tipoCampo === 'calculado') {
        const n = (e.config.campos ?? []).length;
        const dois = e.config.calculo === 'subtracao' || e.config.calculo === 'nivel_risco';
        if (dois ? n !== 2 : n < 2) erros.push(dois ? 'Marque os dois campos do cálculo.' : 'Marque ao menos dois campos para o cálculo.');
      }
    }
    if (e.mensagemServidor) erros.push(e.mensagemServidor);
    return erros;
  }

  /**
   * Os erros da configuração do campo em edição, pela chave (a conferência da tela e
   * o 400; F1, A14). O mesmo objeto enquanto o conteúdo não muda: é a entrada do
   * componente da configuração (objeto novo a cada verificação daria NG0100).
   */
  get errosConfig(): Record<string, string> {
    const e = this.edicao;
    const erros = !e || !e.tentou || e.tipo !== 'campo' ? {} : { ...errosDoConfig(e.tipoCampo, e.config), ...(e.errosServidor ?? {}) };
    const chave = JSON.stringify(erros);
    if (chave !== this.errosConfigCache.chave) this.errosConfigCache = { chave, valor: erros };
    return this.errosConfigCache.valor;
  }

  private errosConfigCache: { chave: string; valor: Record<string, string> } = { chave: '{}', valor: {} };

  campoInvalido(nome: 'titulo' | 'rotulo' | 'prefixo'): boolean {
    const e = this.edicao;
    if (!e || !e.tentou) return false;
    switch (nome) {
      case 'titulo': return !e.titulo.trim();
      case 'rotulo': return !e.rotulo.trim();
      case 'prefixo': return e.tipoSecao === 'tabela' && !/^[A-Z]{1,3}$/.test(e.prefixoCodigo.trim());
    }
  }

  digitarPrefixo(valor: string): void {
    if (this.edicao) this.edicao.prefixoCodigo = (valor ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, LIMITES_MODELO.prefixo);
  }

  salvarEdicao(): void {
    const e = this.edicao;
    if (!e || this.salvando || e.somenteLeitura) return;
    e.tentou = true;
    // O que o servidor disse na tentativa anterior sai: a conferência é refeita com o que está na tela
    e.errosServidor = {};
    e.mensagemServidor = null;
    if (this.errosEdicao.length) {
      this.focoPendente = 'pe-edicao-erros';
      return;
    }
    const texto = (v: string) => v.trim() || null;
    let pedido: Observable<unknown>;
    let depois: (resposta: unknown) => void;

    switch (e.tipo) {
      case 'etapa': {
        const etapa = e.etapa!;
        pedido = this.modeloService.atualizarEtapa(etapa.Id, { Titulo: e.titulo.trim(), Descricao: texto(e.descricao), Ordem: etapa.Ordem });
        depois = r => {
          const resp = r as Partial<PeEtapaModelo> | null;
          etapa.Titulo = resp?.Titulo ?? e.titulo.trim();
          etapa.Descricao = resp?.Descricao !== undefined ? resp.Descricao : texto(e.descricao);
          this.fecharComAviso(`Etapa "${etapa.Titulo}" salva.`);
        };
        break;
      }
      case 'passo': {
        if (e.novo) {
          pedido = this.modeloService.criarPasso({
            EtapaId: e.etapa!.Id, Titulo: e.titulo.trim(), OQueFazer: oQueFazerParaEnvio(e.oQueFazer), BaseLegal: texto(e.baseLegal)
          });
          depois = r => this.depoisDeCriar('passo', r as PePassoModelo,
            'Passo criado. Ele nasce opcional no último nível da lista e desligado nos demais: ligue nos níveis que vão usá-lo e crie as seções dele.');
        } else {
          const passo = e.passo!;
          pedido = this.modeloService.atualizarPasso(passo.Id, {
            Titulo: e.titulo.trim(), OQueFazer: oQueFazerParaEnvio(e.oQueFazer), BaseLegal: texto(e.baseLegal),
            ReferenciaGuia: texto(e.referenciaGuia), AceitaNaoSeAplica: e.aceitaNaoSeAplica
          });
          depois = r => {
            const resp = (r ?? {}) as Partial<PePassoModelo>;
            passo.Titulo = resp.Titulo ?? e.titulo.trim();
            passo.OQueFazer = resp.OQueFazer !== undefined ? resp.OQueFazer : oQueFazerParaEnvio(e.oQueFazer);
            passo.BaseLegal = resp.BaseLegal !== undefined ? resp.BaseLegal : texto(e.baseLegal);
            passo.ReferenciaGuia = resp.ReferenciaGuia !== undefined ? resp.ReferenciaGuia : texto(e.referenciaGuia);
            passo.AceitaNaoSeAplica = resp.AceitaNaoSeAplica ?? e.aceitaNaoSeAplica;
            this.fecharComAviso(`Passo "${passo.Titulo}" salvo. A mudança já vale para os órgãos.`);
          };
        }
        break;
      }
      case 'secao': {
        const prefixo = e.tipoSecao === 'tabela' ? texto(e.prefixoCodigo) : null;
        if (e.novo) {
          pedido = this.modeloService.criarSecao({
            PassoId: e.passo?.Id ?? null, Escopo: e.passo ? null : e.escopo,
            Titulo: e.titulo.trim(), Ajuda: texto(e.ajuda), Tipo: e.tipoSecao, PrefixoCodigo: prefixo
          });
          depois = r => this.depoisDeCriar('secao', r as PeSecaoModelo, e.passo
            ? 'Seção criada. Ela nasce desligada em todos os níveis: ligue nos níveis que vão usá-la e crie os campos dela.'
            : 'Seção criada. Ela nasce desligada: mude a situação dela quando quiser usá-la e crie os campos dela.');
        } else {
          const secao = e.secao!;
          pedido = this.modeloService.atualizarSecao(secao.Id, {
            Titulo: e.titulo.trim(), Ajuda: texto(e.ajuda), Tipo: e.tipoSecao, PrefixoCodigo: prefixo,
            NoDocumento: e.noDocumento, NaPlanilha: e.naPlanilha
          });
          depois = r => {
            const resp = (r ?? {}) as Partial<PeSecaoModelo>;
            secao.Titulo = resp.Titulo ?? e.titulo.trim();
            secao.Ajuda = resp.Ajuda !== undefined ? resp.Ajuda : texto(e.ajuda);
            secao.Tipo = resp.Tipo ?? e.tipoSecao;
            secao.PrefixoCodigo = resp.PrefixoCodigo !== undefined ? resp.PrefixoCodigo : prefixo;
            secao.NoDocumento = resp.NoDocumento ?? e.noDocumento;
            secao.NaPlanilha = resp.NaPlanilha ?? e.naPlanilha;
            this.fecharComAviso(`Seção "${secao.Titulo}" salva. A mudança já vale para os órgãos.`);
          };
        }
        break;
      }
      case 'campo': {
        const config = configParaEnvio(e.tipoCampo, e.config);
        if (e.novo) {
          pedido = this.modeloService.criarCampo({
            SecaoId: e.secao!.Id, Rotulo: e.rotulo.trim(), Ajuda: texto(e.ajuda), Tipo: e.tipoCampo, Config: config
          });
          const lista = tipoComOpcoes(e.tipoCampo);
          depois = r => this.depoisDeCriar('campo', r as PeCampoModelo, lista
            ? 'Campo criado. Inclua as opções da lista e, depois, ligue o campo nos níveis que vão usá-lo: ele nasce desligado.'
            : 'Campo criado. Ele nasce desligado em todos os níveis: ligue nos níveis que vão usá-lo.', lista);
        } else {
          const campo = e.campo!;
          pedido = this.modeloService.atualizarCampo(campo.Id, {
            Rotulo: e.rotulo.trim(), Ajuda: texto(e.ajuda), Tipo: e.tipoCampo, Config: config,
            Largura: texto(e.largura), NoDocumento: e.noDocumento, NaPlanilha: e.naPlanilha
          });
          depois = r => {
            const resp = (r ?? {}) as Partial<PeCampoModelo>;
            campo.Rotulo = resp.Rotulo ?? e.rotulo.trim();
            campo.Ajuda = resp.Ajuda !== undefined ? resp.Ajuda : texto(e.ajuda);
            campo.Tipo = resp.Tipo ?? e.tipoCampo;
            campo.Config = resp.Config !== undefined ? resp.Config : config;
            campo.Largura = resp.Largura !== undefined ? resp.Largura : texto(e.largura);
            campo.NoDocumento = resp.NoDocumento ?? e.noDocumento;
            campo.NaPlanilha = resp.NaPlanilha ?? e.naPlanilha;
            this.fecharComAviso(`Campo "${campo.Rotulo}" salvo. A mudança já vale para os órgãos.`);
          };
        }
        break;
      }
    }

    this.salvando = true;
    pedido.subscribe({
      next: resposta => {
        this.salvando = false;
        depois(resposta);
      },
      error: erro => {
        this.salvando = false;
        // F1 (A14): o 400 fica na janela (no resumo e no campo da configuração), com o foco no resumo
        const falha = erro as { status?: number; error?: { Message?: string; Campos?: Record<string, string> } } | null;
        if (falha?.status === 400 && this.edicao === e) {
          const doConfig = errosDoConfigNoServidor(falha.error?.Campos);
          e.errosServidor = doConfig;
          e.mensagemServidor = Object.keys(doConfig).length ? null
            : (falha.error?.Message || 'O servidor não aceitou os dados. Confira e tente de novo.');
          this.focoPendente = 'pe-edicao-erros';
          return;
        }
        const mensagem = mensagemErroPe(erro, 'Não foi possível salvar. Confira os dados e tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  private fecharComAviso(mensagem: string): void {
    this.edicao = null;
    this.notificacoes.success(mensagem);
  }

  /**
   * Item criado: recarrega o modelo (o servidor dá a chave, a ordem e a situação
   * inicial), abre a árvore até ele e põe o foco nele. Campo de lista reabre a
   * janela, para incluir as opções.
   */
  private depoisDeCriar(tipo: TipoComSituacao, criado: { Id: number } | null, mensagem: string, reabrir = false): void {
    this.edicao = null;
    this.notificacoes.success(mensagem);
    this.carregar(() => {
      if (!criado?.Id) return;
      const k = this.chave(tipo, criado.Id);
      if (tipo !== 'campo') this.abertos.add(k);
      this.revelar(k);
      if (reabrir) {
        const campo = this.indice.get(k) as PeCampoModelo | undefined;
        const secaoChave = this.ancestrais.get(k)?.slice(-1)[0];
        const secao = secaoChave ? this.indice.get(secaoChave) as PeSecaoModelo | undefined : undefined;
        if (campo && secao) this.editarCampo(campo, secao);
      }
    });
  }

  /** As opções mudaram na janela: o campo do modelo acompanha. */
  opcoesMudaram(opcoes: PeOpcaoModelo[]): void {
    if (this.edicao?.campo) this.edicao.campo.Opcoes = opcoes;
  }

  // ── Textos ────────────────────────────────────────────────────────────────

  /** Como o campo se responde, com os nomes da seção ligada e dos campos do cálculo. */
  descricaoDoCampo(campo: PeCampoModelo): string {
    return this.modelo ? descricaoCampo(campo, nomesDoModelo(this.modelo, this.secaoDoCampo(campo))) : '';
  }

  /** "a etapa Prepare o PDTIC", "o passo...", "a seção..." (nome do botão de abrir e fechar). */
  rotuloRamo(tipo: TipoLinha, item: ItemComSituacao | PeEtapaModelo): string {
    const nome = this.nomeDe(item);
    return tipo === 'etapa' ? `a etapa ${nome}` : tipo === 'passo' ? `o passo ${nome}` : `a seção ${nome}`;
  }

  guia(referencia: string | null): string {
    return rotuloGuia(referencia ?? undefined);
  }

  rotuloTipoPasso(tipo: string): string {
    return rotuloTipoPasso(tipo);
  }

  rotuloTipoCampo(tipo: string): string {
    return rotuloTipoCampo(tipo);
  }

  rotuloEscopo(escopo: string): string {
    return rotuloEscopo(escopo);
  }

  rotuloSituacao(situacao: string): string {
    return rotuloSituacao(situacao);
  }

  /** De onde o item veio, no alto da janela: do guia ou do decreto, ou criado pelo administrador. */
  get origemEdicao(): string | null {
    const e = this.edicao;
    if (!e || e.novo || e.tipo === 'etapa') return null;
    const item = e.tipo === 'passo' ? e.passo : e.tipo === 'secao' ? e.secao : e.campo;
    if (!item) return null;
    return item.Sistema
      ? 'Veio do guia ou do decreto: dá para mudar o texto e a situação, mas não o tipo, e não dá para apagar.'
      : 'Criado pelo administrador: dá para mudar tudo e apagar (os dados dos órgãos ficam guardados).';
  }

  /** Nome do item de uma linha do histórico geral. */
  readonly nomeItem = (entidade: string, id: number): string | null => {
    if (entidade === 'nivel') return this.niveis.find(n => n.Id === id)?.Nome ?? null;
    if (entidade === 'etapa') return this.modelo?.Etapas.find(e => e.Id === id)?.Titulo ?? null;
    const item = this.indice.get(`${entidade}:${id}`);
    if (!item) return null;
    return 'Rotulo' in item ? item.Rotulo : item.Titulo;
  };
}
