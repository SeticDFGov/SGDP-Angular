import { Component, DestroyRef, ElementRef, OnInit, PLATFORM_ID, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CtrPublicoService } from '../services/ctr-publico.service';
import { CtrContratacaoPublica } from '../../../api/contratacoes/interface';
import { CtrEscolhaMultiplaComponent, OpcaoEscolha } from './ctr-escolha-multipla.component';
import { CtrIncorporarComponent } from './ctr-incorporar.component';
import { CAMINHO_PAINEL_PUBLICO, FiltrosPainelPublico, MENSAGEM_ALTURA, parametrosDosFiltros } from './painel-publico';

type Campo = 'orgao' | 'objeto' | 'tipo' | 'data' | 'valor';
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
 * e sem login, como a transparência da IA. Mostra as contratações com contrato assinado dos
 * processos de supervisão contínua: três filtros (órgão, tipo e o período da chegada à SGDI
 * à assinatura), três cartões (órgãos, processos e valor estimado) e a tabela.
 *
 * - Os filtros se combinam, e cada um mostra só o que existe com os outros, com a quantidade.
 * - Marcar processos na tabela faz os cartões somarem só eles (a tabela continua com todos).
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
  imports: [CommonModule, CtrEscolhaMultiplaComponent, CtrIncorporarComponent],
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
  /** Chegada à SGDI a partir de (yyyy-MM-dd). */
  readonly de = signal('');
  /** Assinatura do contrato até (yyyy-MM-dd). */
  readonly ate = signal('');
  readonly marcados = signal<ReadonlySet<number>>(new Set<number>());
  readonly ordem = signal<{ campo: Campo; desc: boolean }>({ campo: 'data', desc: true });
  readonly pagina = signal(1);
  readonly incorporarAberto = signal(false);
  /** Texto da região viva (leitor de tela). */
  readonly anuncio = signal('');

  private readonly moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  private readonly umaCasa = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
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
    const assinaturas = outras.map(l => l.DataAssinaturaContrato).sort();
    const de = this.de(), ate = this.ate();
    const ultimaChegada = chegadas[chegadas.length - 1] ?? '';
    const primeiraAssinatura = assinaturas[0] ?? '';
    return {
      deMin: chegadas[0] ?? '',
      deMax: ate && (!ultimaChegada || ate < ultimaChegada) ? ate : ultimaChegada,
      ateMin: de && (!primeiraAssinatura || de > primeiraAssinatura) ? de : primeiraAssinatura,
      ateMax: assinaturas[assinaturas.length - 1] ?? '',
      dica: !outras.length ? 'Nenhum processo com os outros filtros.'
        : chegadas.length
          ? `Com os outros filtros, há processos com chegada desde ${this.dataBr(chegadas[0])} e assinatura até ${this.dataBr(assinaturas[assinaturas.length - 1])}.`
          : `Com os outros filtros, há processos com assinatura até ${this.dataBr(assinaturas[assinaturas.length - 1])}.`
    };
  });

  readonly ordenadas = computed(() => {
    const { campo, desc } = this.ordem();
    const chave = (l: Linha): string | number =>
      campo === 'orgao' ? l.OrgaoSigla
        : campo === 'objeto' ? l.Objeto
        : campo === 'tipo' ? l.CategoriaObjeto
        : campo === 'valor' ? l.ValorEstimado ?? -1
        : l.DataAssinaturaContrato;
    return [...this.filtradas()].sort((a, b) => {
      const x = chave(a), y = chave(b);
      let r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR');
      if (r === 0) r = a.DataAssinaturaContrato.localeCompare(b.DataAssinaturaContrato);
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
    const comValor = base.filter(l => l.ValorEstimado !== null);
    return {
      selecao: marcados.size > 0,
      orgaos: new Set(base.map(l => l.OrgaoSigla)).size,
      processos: base.length,
      valor: comValor.reduce((soma, l) => soma + (l.ValorEstimado ?? 0), 0),
      semValor: base.length - comValor.length
    };
  });

  readonly cartoes = computed(() => {
    const t = this.totais();
    const contexto = (selecao: string, filtro: string, tudo: string) => t.selecao ? selecao : this.temFiltro() ? filtro : tudo;
    const semValor = t.semValor ? ` · ${this.plural(t.semValor, 'processo sem valor informado', 'processos sem valor informado')}` : '';
    return [
      {
        rotulo: 'Órgãos', icone: 'apartment', valor: this.inteiro.format(t.orgaos),
        contexto: contexto('dos processos marcados', 'com processos nos filtros', 'com contratos assinados')
      },
      {
        rotulo: 'Processos', icone: 'description', valor: this.inteiro.format(t.processos),
        contexto: contexto('marcados na tabela', `de ${this.inteiro.format(this.linhas().length)} no total`, 'com contrato assinado')
      },
      {
        rotulo: 'Valor estimado total', icone: 'payments', valor: this.moedaCurta(t.valor),
        contexto: this.moeda.format(t.valor) + semValor
      }
    ];
  });

  readonly chips = computed<Chip[]>(() => {
    const chips: Chip[] = [];
    const porNome = (a: string, b: string) => a.localeCompare(b, 'pt-BR');
    [...this.orgaos()].sort(porNome).forEach(o => chips.push({ rotulo: `Órgão: ${o}`, tirar: () => this.alternarOrgao(o) }));
    [...this.tipos()].sort(porNome).forEach(t => chips.push({ rotulo: `Tipo: ${t}`, tirar: () => this.alternarTipo(t) }));
    if (this.de()) chips.push({ rotulo: `Chegada a partir de ${this.dataBr(this.de())}`, tirar: () => this.definirDe('') });
    if (this.ate()) chips.push({ rotulo: `Assinatura até ${this.dataBr(this.ate())}`, tirar: () => this.definirAte('') });
    const n = this.marcados().size;
    if (n) chips.push({ rotulo: `${this.plural(n, 'processo marcado', 'processos marcados')} na tabela`, tirar: () => this.limparSelecao(), selecao: true });
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
    if (this.de()) partes.push(`chegada a partir de ${this.dataBr(this.de())}`);
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
    this.anunciar(`Filtros limpos: ${this.plural(this.linhas().length, 'processo', 'processos')}.`);
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
    return `${this.plural(n, 'processo marcado', 'processos marcados')}: os cartões mostram só ${n === 1 ? 'ele' : 'eles'}.`;
  });

  // ── Tabela ────────────────────────────────────────────────────────────────

  marcado(id: number): boolean {
    return this.marcados().has(id);
  }

  alternarLinha(id: number): void {
    this.marcados.set(alternado(this.marcados(), id));
    const n = this.marcados().size;
    this.anunciar(n
      ? `Cartões com ${this.plural(n, 'processo marcado', 'processos marcados')}.`
      : 'Cartões com todos os processos da tabela.');
  }

  limparSelecao(): void {
    this.marcados.set(new Set<number>());
    this.anunciar('Cartões com todos os processos da tabela.');
  }

  ordenarPor(campo: Campo): void {
    const atual = this.ordem();
    this.ordem.set(atual.campo === campo ? { campo, desc: !atual.desc } : { campo, desc: campo === 'data' || campo === 'valor' });
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

  valor(l: Linha): string {
    return l.ValorEstimado === null ? 'Não informado' : this.moeda.format(l.ValorEstimado);
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
      if (ate && l.DataAssinaturaContrato > ate) return false;
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
    this.anunciar(n ? `${this.plural(n, 'processo encontrado', 'processos encontrados')}.` : 'Nenhum processo com esses filtros.');
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

  private moedaCurta(v: number): string {
    const escala = (n: number, um: string, varios: string) => {
      const r = Math.round(n * 10) / 10;
      return `R$ ${this.umaCasa.format(r)} ${r < 2 ? um : varios}`;
    };
    if (v >= 1e9) return escala(v / 1e9, 'bilhão', 'bilhões');
    if (v >= 1e6) return escala(v / 1e6, 'milhão', 'milhões');
    if (v >= 1e4) return `R$ ${this.umaCasa.format(Math.round(v / 100) / 10)} mil`;
    return this.moeda.format(v);
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
