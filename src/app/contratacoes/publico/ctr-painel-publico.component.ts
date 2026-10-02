import { Component, DestroyRef, ElementRef, OnInit, PLATFORM_ID, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CtrPublicoService } from '../services/ctr-publico.service';
import { CtrContratacaoPublica } from '../../../api/contratacoes/interface';
import { CtrEscolhaMultiplaComponent, OpcaoEscolha } from './ctr-escolha-multipla.component';
import { CtrIncorporarComponent } from './ctr-incorporar.component';
import { CtrGraficoTiposComponent, ItemGraficoTipo } from './ctr-grafico-tipos.component';
import { CAMINHO_PAINEL_PUBLICO, FiltrosPainelPublico, MENSAGEM_ALTURA, parametrosDosFiltros } from './painel-publico';

type Campo = 'orgao' | 'objeto' | 'tipo' | 'data';
type Faceta = 'orgao' | 'tipo' | 'data' | null;

interface Linha extends CtrContratacaoPublica {
  /** Posição na lista que veio da API: a chave da seleção na tabela. */
  id: number;
}

interface Chip {
  rotulo: string;
  tirar: () => void;
  /** O chip da seleção da tabela, que não mexe nos filtros. */
  selecao?: boolean;
}

const POR_PAGINA = 10;

/**
 * Painel público da Supervisão Contínua das Contratações (/transparencia-contratacoes), aberto
 * e sem login, como a transparência da IA. Mostra os processos de supervisão contínua, em
 * análise e com contrato assinado, sem o valor (pedido de 2026-10-02: o sigiloso é o valor,
 * não a contratação): três filtros (órgão, tipo e o período da chegada à SGDI à assinatura),
 * dois cartões (órgãos e contratações), o gráfico por tipo e a tabela.
 *
 * - Os filtros se combinam, e cada um mostra só o que existe com os outros, com a quantidade.
 * - O gráfico é a lista do filtro de tipo desenhada: conta as contratações de cada tipo pelos
 *   outros filtros, e clicar numa coluna escolhe ou tira o tipo.
 * - Marcar contratações na tabela faz os cartões e o gráfico contarem só elas (a tabela
 *   continua com todas; retorno do usuário sobre o mock, em 2026-10-02).
 * - Na tela, "contratações" no lugar de "processos" (mesmo retorno): "60 contratações",
 *   "46 com assinatura".
 * - Os filtros vão no endereço (`orgao` e `tipo` repetidos, `de` e `ate`), para o link valer.
 * - Em /transparencia-contratacoes/incorporar é a mesma tela para outro site pôr num iframe:
 *   sem o cabeçalho, com um título curto e o link da página inteira; a altura vai por
 *   postMessage para o script opcional da página de fora.
 *
 * Os dados vêm só no navegador: no servidor a página sai com o "Carregando", sem o cache do
 * SSR guardar a lista no HTML.
 */
@Component({
  selector: 'app-ctr-painel-publico',
  standalone: true,
  imports: [CommonModule, CtrEscolhaMultiplaComponent, CtrIncorporarComponent, CtrGraficoTiposComponent],
  templateUrl: './ctr-painel-publico.component.html'
})
export class CtrPainelPublicoComponent implements OnInit {
  private readonly servico = inject(CtrPublicoService);
  private readonly rota = inject(ActivatedRoute);
  private readonly local = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @ViewChild('raiz', { static: true }) private raiz!: ElementRef<HTMLElement>;

  /** Versão para o iframe de outro site (rota .../incorporar). */
  readonly incorporado = !!this.rota.snapshot.data['incorporado'];

  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly linhas = signal<Linha[]>([]);
  readonly atualizadoEm = signal<string | null>(null);

  readonly orgaos = signal<ReadonlySet<string>>(new Set<string>());
  readonly tipos = signal<ReadonlySet<string>>(new Set<string>());
  /** Inclusão no portfólio (a chegada à SGDI) a partir de (yyyy-MM-dd). */
  readonly de = signal('');
  /** Assinatura do contrato até (yyyy-MM-dd); com ele, só entram os assinados. */
  readonly ate = signal('');
  readonly marcados = signal<ReadonlySet<number>>(new Set<number>());
  readonly ordem = signal<{ campo: Campo; desc: boolean }>({ campo: 'data', desc: true });
  readonly pagina = signal(1);
  readonly incorporarAberto = signal(false);
  /** Texto da região viva (leitor de tela). */
  readonly anuncio = signal('');

  private readonly inteiro = new Intl.NumberFormat('pt-BR');

  /** Nome de cada órgão pela sigla: o do processo mais recente (o nome é texto livre). */
  private readonly nomesOrgaos = computed(() => {
    const nomes = new Map<string, string>();
    for (const l of this.linhas()) if (!nomes.has(l.OrgaoSigla)) nomes.set(l.OrgaoSigla, l.OrgaoNome);
    return nomes;
  });

  readonly temFiltro = computed(() => this.orgaos().size > 0 || this.tipos().size > 0 || !!this.de() || !!this.ate());
  readonly podeLimpar = computed(() => this.temFiltro() || this.marcados().size > 0);

  readonly filtradas = computed(() => this.linhas().filter(l => this.passa(l, null)));

  readonly opcoesOrgao = computed(() => this.opcoes('orgao'));
  readonly opcoesTipo = computed(() => this.opcoes('tipo'));

  /** As datas também respondem aos outros filtros: o mínimo e o máximo do que existe. */
  readonly limitesDatas = computed(() => {
    const outras = this.linhas().filter(l => this.passa(l, 'data'));
    const chegadas = outras.map(l => l.ChegadaSgdi).filter((d): d is string => !!d).sort();
    const assinaturas = outras.map(l => l.DataAssinaturaContrato).filter((d): d is string => !!d).sort();
    const de = this.de(), ate = this.ate();
    const ultimaChegada = chegadas[chegadas.length - 1] ?? '';
    const primeiraAssinatura = assinaturas[0] ?? '';
    return {
      deMin: chegadas[0] ?? '',
      deMax: ate && (!ultimaChegada || ate < ultimaChegada) ? ate : ultimaChegada,
      ateMin: de && (!primeiraAssinatura || de > primeiraAssinatura) ? de : primeiraAssinatura,
      ateMax: assinaturas[assinaturas.length - 1] ?? '',
      dica: !outras.length ? 'Nenhuma contratação com os outros filtros.' : this.dicaDatas(chegadas[0], assinaturas[assinaturas.length - 1])
    };
  });

  readonly ordenadas = computed(() => {
    const { campo, desc } = this.ordem();
    const chave = (l: Linha): string =>
      campo === 'orgao' ? l.OrgaoSigla
        : campo === 'objeto' ? l.Objeto
        : campo === 'tipo' ? l.CategoriaObjeto
        : l.ChegadaSgdi ?? '';
    return [...this.filtradas()].sort((a, b) => {
      // A data é a chegada à SGDI; sem ela, o processo fica no fim nos dois sentidos
      if (campo === 'data' && !a.ChegadaSgdi !== !b.ChegadaSgdi) return a.ChegadaSgdi ? -1 : 1;
      let r = chave(a).localeCompare(chave(b), 'pt-BR');
      if (r === 0) r = (a.DataAssinaturaContrato ?? '9999').localeCompare(b.DataAssinaturaContrato ?? '9999');
      return desc ? -r : r;
    });
  });

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.ordenadas().length / POR_PAGINA)));
  readonly paginaAtual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  readonly inicioPagina = computed(() => (this.paginaAtual() - 1) * POR_PAGINA);
  readonly visiveis = computed(() => this.ordenadas().slice(this.inicioPagina(), this.inicioPagina() + POR_PAGINA));

  /** Botões de página: o primeiro, o último e os vizinhos da atual; nulo é a reticência. */
  readonly botoesPagina = computed<(number | null)[]>(() => {
    const total = this.totalPaginas(), atual = this.paginaAtual();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const paginas = [...new Set([1, total, atual - 1, atual, atual + 1])].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
    const botoes: (number | null)[] = [];
    paginas.forEach((p, i) => {
      if (i > 0 && p - paginas[i - 1] > 1) botoes.push(null);
      botoes.push(p);
    });
    return botoes;
  });

  /** Os cartões: com processos marcados na tabela, só eles; senão, tudo o que os filtros deixam. */
  readonly totais = computed(() => {
    const marcados = this.marcados();
    const base = marcados.size ? this.filtradas().filter(l => marcados.has(l.id)) : this.filtradas();
    return {
      selecao: marcados.size > 0,
      orgaos: new Set(base.map(l => l.OrgaoSigla)).size,
      processos: base.length,
      assinados: base.filter(l => !!l.DataAssinaturaContrato).length
    };
  });

  readonly cartoes = computed(() => {
    const t = this.totais();
    const filtro = this.temFiltro();
    return [
      {
        rotulo: 'Órgãos', icone: 'apartment', numero: this.inteiro.format(t.orgaos),
        contexto: t.selecao ? 'das contratações marcadas' : filtro ? 'com contratações nos filtros' : 'com contratações na supervisão contínua'
      },
      {
        rotulo: 'Contratações', icone: 'description', numero: this.inteiro.format(t.processos),
        contexto: (t.selecao ? 'marcadas na tabela; ' : filtro ? `de ${this.inteiro.format(this.linhas().length)} no total; ` : '')
          + `${this.inteiro.format(t.assinados)} com assinatura`
      }
    ];
  });

  /**
   * O gráfico, da maior quantidade para a menor: a lista do filtro de tipo (a quantidade pelos
   * outros filtros); com contratações marcadas na tabela, só elas, como nos cartões. O tipo
   * escolhido fica, mesmo com zero, para dar para tirá-lo pela coluna.
   */
  readonly itensDoGrafico = computed<ItemGraficoTipo[]>(() => {
    const marcados = this.marcados();
    let itens: ItemGraficoTipo[];
    if (marcados.size) {
      const contagem = new Map<string, number>();
      for (const l of this.filtradas()) {
        if (marcados.has(l.id)) contagem.set(l.CategoriaObjeto, (contagem.get(l.CategoriaObjeto) ?? 0) + 1);
      }
      this.tipos().forEach(t => { if (!contagem.has(t)) contagem.set(t, 0); });
      itens = [...contagem.entries()].map(([tipo, quantidade]) => ({ tipo, quantidade }));
    } else {
      itens = this.opcoesTipo().map(o => ({ tipo: o.valor, quantidade: o.quantidade }));
    }
    return itens.sort((a, b) => b.quantidade - a.quantidade || a.tipo.localeCompare(b.tipo, 'pt-BR'));
  });

  readonly chips = computed<Chip[]>(() => {
    const chips: Chip[] = [];
    const porNome = (a: string, b: string) => a.localeCompare(b, 'pt-BR');
    [...this.orgaos()].sort(porNome).forEach(o => chips.push({ rotulo: `Órgão: ${o}`, tirar: () => this.alternarOrgao(o) }));
    [...this.tipos()].sort(porNome).forEach(t => chips.push({ rotulo: `Tipo: ${t}`, tirar: () => this.alternarTipo(t) }));
    if (this.de()) chips.push({ rotulo: `Inclusão no portfólio a partir de ${this.dataBr(this.de())}`, tirar: () => this.definirDe('') });
    if (this.ate()) chips.push({ rotulo: `Assinatura até ${this.dataBr(this.ate())}`, tirar: () => this.definirAte('') });
    const n = this.marcados().size;
    if (n) chips.push({ rotulo: `${this.plural(n, 'contratação marcada', 'contratações marcadas')} na tabela`, tirar: () => this.limparSelecao(), selecao: true });
    return chips;
  });

  readonly filtrosAtuais = computed<FiltrosPainelPublico>(() => ({
    orgaos: [...this.orgaos()], tipos: [...this.tipos()], de: this.de(), ate: this.ate()
  }));

  readonly resumoFiltros = computed(() => {
    const partes: string[] = [];
    const lista = (s: ReadonlySet<string>) => [...s].sort((a, b) => a.localeCompare(b, 'pt-BR')).join(', ');
    if (this.orgaos().size) partes.push(`órgão: ${lista(this.orgaos())}`);
    if (this.tipos().size) partes.push(`tipo: ${lista(this.tipos())}`);
    if (this.de()) partes.push(`inclusão no portfólio a partir de ${this.dataBr(this.de())}`);
    if (this.ate()) partes.push(`assinatura até ${this.dataBr(this.ate())}`);
    return partes.join('; ');
  });

  /** A página inteira com os filtros de agora (o link do quadro incorporado). */
  readonly enderecoTelaCheia = computed(() => {
    const consulta = parametrosDosFiltros(this.filtrosAtuais()).toString();
    return CAMINHO_PAINEL_PUBLICO + (consulta ? '?' + consulta : '');
  });

  ngOnInit(): void {
    this.lerFiltrosDoEndereco();
    if (!this.noNavegador) return;
    this.carregar();
    if (this.incorporado && window.parent !== window) this.avisarAlturaAoSiteDeFora();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.servico.painel().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: painel => {
        this.linhas.set((painel.Contratacoes ?? []).map((c, i) => ({ ...c, id: i + 1 })));
        this.atualizadoEm.set(painel.AtualizadoEm ?? null);
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
        this.erro.set(true);
      }
    });
  }

  // ── Filtros ───────────────────────────────────────────────────────────────

  alternarOrgao(sigla: string): void {
    this.orgaos.set(alternado(this.orgaos(), sigla));
    this.depoisDoFiltro();
  }

  alternarTipo(tipo: string): void {
    this.tipos.set(alternado(this.tipos(), tipo));
    this.depoisDoFiltro();
  }

  limparOrgaos(): void {
    this.orgaos.set(new Set<string>());
    this.depoisDoFiltro();
  }

  limparTipos(): void {
    this.tipos.set(new Set<string>());
    this.depoisDoFiltro();
  }

  definirDe(valor: string): void {
    this.de.set(dataValida(valor));
    this.depoisDoFiltro();
  }

  definirAte(valor: string): void {
    this.ate.set(dataValida(valor));
    this.depoisDoFiltro();
  }

  limparTudo(): void {
    this.orgaos.set(new Set<string>());
    this.tipos.set(new Set<string>());
    this.de.set('');
    this.ate.set('');
    this.marcados.set(new Set<number>());
    this.depoisDoFiltro();
    this.anunciar(`Filtros limpos: ${this.plural(this.linhas().length, 'contratação', 'contratações')}.`);
  }

  /** Limpar desabilita o próprio botão: o foco vai para o primeiro filtro. */
  limparTudoPeloBotao(): void {
    this.limparTudo();
    this.focar('#ctr-pub-orgao-botao');
  }

  /** O chip some com o clique: o foco vai para o próximo chip ou, sem nenhum, para o primeiro filtro. */
  tirarChip(chip: Chip): void {
    chip.tirar();
    this.focar('[data-chip]', '#ctr-pub-orgao-botao');
  }

  readonly avisoSelecao = computed(() => {
    const n = this.marcados().size;
    return `${this.plural(n, 'contratação marcada', 'contratações marcadas')}: os cartões e o gráfico mostram só ${n === 1 ? 'ela' : 'elas'}.`;
  });

  // ── Tabela ────────────────────────────────────────────────────────────────

  marcado(id: number): boolean {
    return this.marcados().has(id);
  }

  alternarLinha(id: number): void {
    this.marcados.set(alternado(this.marcados(), id));
    const n = this.marcados().size;
    this.anunciar(n
      ? `Cartões e gráfico com ${this.plural(n, 'contratação marcada', 'contratações marcadas')}.`
      : 'Cartões e gráfico com todas as contratações da tabela.');
  }

  limparSelecao(): void {
    this.marcados.set(new Set<number>());
    this.anunciar('Cartões e gráfico com todas as contratações da tabela.');
  }

  /** "Limpar seleção" some com o clique: o foco vai para o título da tabela. */
  limparSelecaoPeloBotao(): void {
    this.limparSelecao();
    this.focar('#ctr-pub-titulo-tabela');
  }

  ordenarPor(campo: Campo): void {
    const atual = this.ordem();
    this.ordem.set(atual.campo === campo ? { campo, desc: !atual.desc } : { campo, desc: campo === 'data' });
    this.pagina.set(1);
  }

  ordenarPeloSeletor(valor: string): void {
    const [campo, sentido] = valor.split('-') as [Campo, string];
    this.ordem.set({ campo, desc: sentido === 'desc' });
    this.pagina.set(1);
  }

  ariaSort(campo: Campo): string | null {
    const o = this.ordem();
    return o.campo === campo ? (o.desc ? 'descending' : 'ascending') : null;
  }

  seta(campo: Campo): string {
    const o = this.ordem();
    return o.campo !== campo ? 'unfold_more' : o.desc ? 'arrow_downward' : 'arrow_upward';
  }

  irParaPagina(p: number): void {
    this.pagina.set(Math.min(Math.max(1, p), this.totalPaginas()));
  }

  porId(_: number, l: Linha): number {
    return l.id;
  }

  // ── Formatação ────────────────────────────────────────────────────────────

  dataBr(iso: string | null): string {
    return iso ? iso.slice(0, 10).split('-').reverse().join('/') : '-';
  }

  // ── Interno ───────────────────────────────────────────────────────────────

  /** O processo passa pelos filtros; `exceto` deixa um de fora, para cada filtro mostrar o que existe com os outros. */
  private passa(l: Linha, exceto: Faceta): boolean {
    const orgaos = this.orgaos(), tipos = this.tipos();
    if (exceto !== 'orgao' && orgaos.size && !orgaos.has(l.OrgaoSigla)) return false;
    if (exceto !== 'tipo' && tipos.size && !tipos.has(l.CategoriaObjeto)) return false;
    if (exceto !== 'data') {
      const de = this.de(), ate = this.ate();
      if (de && (!l.ChegadaSgdi || l.ChegadaSgdi < de)) return false;
      // Com o "até", só entram os assinados (o processo em análise ainda não tem a data)
      if (ate && (!l.DataAssinaturaContrato || l.DataAssinaturaContrato > ate)) return false;
    }
    return true;
  }

  /** Opções de um filtro com a quantidade de processos pelos outros filtros; a escolhida fica, mesmo com zero. */
  private opcoes(qual: 'orgao' | 'tipo'): OpcaoEscolha[] {
    const escolhidos = qual === 'orgao' ? this.orgaos() : this.tipos();
    const contagem = new Map<string, number>();
    for (const l of this.linhas()) {
      if (!this.passa(l, qual)) continue;
      const chave = qual === 'orgao' ? l.OrgaoSigla : l.CategoriaObjeto;
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
    }
    escolhidos.forEach(v => { if (!contagem.has(v)) contagem.set(v, 0); });
    return [...contagem.entries()].map(([valor, quantidade]) => ({
      valor,
      rotulo: valor,
      detalhe: qual === 'orgao' ? this.nomesOrgaos().get(valor) : undefined,
      quantidade
    }));
  }

  /** Depois de mudar um filtro: a marcação da tabela só guarda o que continua, volta à página 1 e grava no endereço. */
  private depoisDoFiltro(): void {
    const ids = new Set(this.filtradas().map(l => l.id));
    const marcados = [...this.marcados()].filter(id => ids.has(id));
    if (marcados.length !== this.marcados().size) this.marcados.set(new Set(marcados));
    this.pagina.set(1);
    const n = this.filtradas().length;
    this.anunciar(n ? `${this.plural(n, 'contratação encontrada', 'contratações encontradas')}.` : 'Nenhuma contratação com esses filtros.');
    if (this.noNavegador) {
      this.local.replaceState(this.local.path().split('?')[0], parametrosDosFiltros(this.filtrosAtuais()).toString());
    }
  }

  private lerFiltrosDoEndereco(): void {
    const q = this.rota.snapshot.queryParamMap;
    const valores = (nome: string) => q.getAll(nome).map(v => v.trim()).filter(Boolean);
    this.orgaos.set(new Set(valores('orgao')));
    this.tipos.set(new Set(valores('tipo')));
    this.de.set(dataValida(q.get('de')));
    this.ate.set(dataValida(q.get('ate')));
  }

  /** No iframe: a cada mudança de tamanho, a altura do painel vai para a página de fora. */
  private avisarAlturaAoSiteDeFora(): void {
    if (typeof ResizeObserver === 'undefined') return;
    const raiz = this.raiz.nativeElement;
    const observador = new ResizeObserver(() => {
      window.parent.postMessage({ [MENSAGEM_ALTURA]: Math.ceil(raiz.getBoundingClientRect().height) }, '*');
    });
    observador.observe(raiz);
    this.destroyRef.onDestroy(() => observador.disconnect());
  }

  private focar(...seletores: string[]): void {
    setTimeout(() => {
      const raiz = this.raiz.nativeElement;
      for (const seletor of seletores) {
        const alvo = raiz.querySelector<HTMLElement>(seletor);
        if (alvo) {
          alvo.focus();
          return;
        }
      }
    });
  }

  private anunciar(texto: string): void {
    // Esvaziar e escrever depois: o mesmo texto duas vezes seguidas também é lido
    this.anuncio.set('');
    setTimeout(() => this.anuncio.set(texto), 120);
  }

  /** O que existe com os outros filtros: a primeira chegada e a última assinatura, quando há. */
  private dicaDatas(primeiraChegada: string | undefined, ultimaAssinatura: string | undefined): string {
    const partes = [
      primeiraChegada ? `inclusão no portfólio desde ${this.dataBr(primeiraChegada)}` : '',
      ultimaAssinatura ? `assinatura até ${this.dataBr(ultimaAssinatura)}` : ''
    ].filter(Boolean);
    return partes.length ? `Com os outros filtros, há contratações com ${partes.join(' e ')}.` : 'As contratações com os outros filtros ainda não têm datas.';
  }

  private plural(n: number, um: string, varios: string): string {
    return `${this.inteiro.format(n)} ${n === 1 ? um : varios}`;
  }
}

function alternado<T>(conjunto: ReadonlySet<T>, valor: T): Set<T> {
  const novo = new Set(conjunto);
  if (novo.has(valor)) novo.delete(valor); else novo.add(valor);
  return novo;
}

function dataValida(valor: string | null | undefined): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor ?? '') ? valor! : '';
}
