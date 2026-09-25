import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { PeChaveSituacaoPainel, PePainel } from '../../../api/planejamento/interface';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import { CHAVES_SITUACAO_PAINEL, idDoParametro } from '../shared/pe-paineis-rotulos';
import { quandoPdtic } from '../shared/pe-pdtic-rotulos';
import { PePaineisService } from '../services/pe-paineis.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { BASE_PE, rotaPaginaOrgao } from '../trilha/pe-trilhas';
import { BarraGrafico, PeGraficoBarrasComponent, SerieGrafico, TomBarra } from './pe-grafico-barras.component';

/** Um cartão com um número: o que ele conta e a lista já filtrada. */
interface CartaoPainel {
  chave: string;
  titulo: string;
  numero: number;
  texto: string;
  rota: string;
  query: Params;
}

/** Um alerta: o número, o que ele quer dizer e a lista já filtrada. */
interface AlertaPainel {
  chave: string;
  numero: number;
  singular: string;
  plural: string;
  icone: string;
  rota: string;
  query: Params;
  link: string;
}

/** Um gráfico do painel, pronto para o componente de barras. */
interface GraficoPainel {
  chave: string;
  titulo: string;
  legenda: string;
  rotuloCategoria: string;
  unidade: { singular: string; plural: string };
  series: SerieGrafico[];
  barras: BarraGrafico[];
  vazio: string;
}

const SERIE_ORGAOS: SerieGrafico[] = [{ nome: 'Órgãos', tom: 'roxo' }];
const SERIE_PDTICS: SerieGrafico[] = [{ nome: 'PDTICs', tom: 'azul' }];
const SERIES_OBJETIVOS: SerieGrafico[] = [{ nome: 'Necessidades', tom: 'roxo' }, { nome: 'Metas', tom: 'azul' }];
const SERIE_ACOES: SerieGrafico[] = [{ nome: 'Ações', tom: 'verde' }];
const SERIE_RISCOS: SerieGrafico[] = [{ nome: 'Riscos', tom: 'cinza' }];
const ORGAOS = { singular: 'órgão', plural: 'órgãos' };

const TOM_RISCO: Record<string, TomBarra> = { alto: 'vermelho', medio: 'ambar', baixo: 'verde', sem_nivel: 'cinza' };
const TOM_EXECUCAO: Record<string, TomBarra> = {
  concluida: 'verde', em_andamento: 'azul', nao_iniciada: 'ambar', cancelada: 'cinza', sem_registro: 'cinza'
};

/** Situações que os cartões somam (as chaves do painel). */
const A_CAMINHO: PeChaveSituacaoPainel[] = ['em_elaboracao', 'devolvido', 'em_aprovacao', 'aprovado'];
const PUBLICADOS: PeChaveSituacaoPainel[] = ['publicado', 'em_acompanhamento'];

/**
 * Painel dos órgãos (E8; passo 4.1 do administrador e 1.1 da SGDI): os números de
 * todos os órgãos, como estão agora (GET painel, com o filtro por nível e por
 * situação no endereço, `?nivel=` e `?situacao=`, que valem na hora e trocam a
 * entrada do histórico, como a Supervisão Contínua faz).
 *
 * - Cartões com os números (órgãos, sem PDTIC, a caminho da publicação,
 *   publicados), cada um com o link para a conformidade já filtrada.
 * - Alertas (vigência vencida, revisão vencida, ciclo atrasado, inadimplentes,
 *   deliberações aguardando), cada um com o link para a lista filtrada.
 * - Gráficos de barras em HTML e SVG, sem biblioteca (`pe-grafico-barras`): cada
 *   um com título, legenda em texto, descrição e a tabela equivalente.
 *
 * Estados vazios distintos: nenhum órgão no sistema e nenhum órgão com os filtros
 * (com "Limpar os filtros"); gráfico sem dado, com o texto dele. Falha de
 * carregamento vira mensagem na própria tela, com "Tentar de novo". Papel de órgão
 * vê um aviso (com o link para a página do próprio órgão) e a tela não consulta
 * nada: o 403 tiraria a pessoa do módulo.
 */
@Component({
  selector: 'app-pe-painel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaPlanejamentoDirective, PeGraficoBarrasComponent],
  templateUrl: './pe-painel.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PePainelComponent implements OnInit {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly paineisService = inject(PePaineisService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly base = BASE_PE;

  podeVer: boolean | null = null;
  erroPapel = false;
  /** Papel de órgão: o link para a página do próprio órgão no aviso. */
  paginaDoMeuOrgao: string | null = null;
  private iniciado = false;

  painel: PePainel | null = null;
  carregando = false;
  erro: string | null = null;
  private carga?: Subscription;

  /** Os filtros aplicados (os do endereço). */
  nivel: number | null = null;
  situacao: PeChaveSituacaoPainel | null = null;
  /** As listas da tela (o valor como texto: vazio é "todos"). */
  nivelEscolhido = '';
  situacaoEscolhida = '';

  cartoes: CartaoPainel[] = [];
  alertas: AlertaPainel[] = [];
  graficos: GraficoPainel[] = [];
  /** A soma dos alertas (zero: "nenhum alerta agora"). */
  totalAlertas = 0;

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        if (!estado || estado.carga !== 'pronta') return;
        this.erroPapel = estado.consultaPapel === 'erro';
        this.podeVer = this.estadoService.veTodosOsOrgaos;
        const meuOrgao = this.estadoService.orgaoDoPapel;
        this.paginaDoMeuOrgao = meuOrgao ? rotaPaginaOrgao(meuOrgao) : null;
        if (this.podeVer && !this.iniciado) {
          this.iniciado = true;
          // O endereço é a fonte dos filtros: a primeira leitura e as trocas (os filtros e o histórico)
          this.rota.queryParamMap
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(params => this.lerFiltros(params.get('nivel'), params.get('situacao')));
        }
      });
  }

  tentarPapelDeNovo(): void {
    this.estadoService.iniciar();
  }

  get filtrosAtivos(): boolean {
    return this.nivel !== null || this.situacao !== null;
  }

  get geradoEm(): string {
    return this.painel?.GeradoEm ? quandoPdtic(this.painel.GeradoEm) : '';
  }

  /** Os níveis e as situações do filtro (vêm na resposta do painel; antes dela, só "todos"). */
  get niveis(): { Id: number; Nome: string }[] {
    return this.painel?.Filtros.Niveis ?? [];
  }

  get situacoes(): { Chave: string; Rotulo: string }[] {
    return this.painel?.Filtros.Situacoes ?? [];
  }

  /** "Nível Avançado · Situação: Publicado", em palavras, para dizer o que está filtrado. */
  get descricaoFiltros(): string {
    const partes: string[] = [];
    if (this.nivel !== null) {
      const nome = this.painel?.Filtros?.Niveis?.find(n => n.Id === this.nivel)?.Nome;
      partes.push(`nível ${nome ?? 'escolhido'}`);
    }
    if (this.situacao !== null) {
      const rotulo = this.painel?.Filtros?.Situacoes?.find(s => s.Chave === this.situacao)?.Rotulo ?? this.situacao;
      partes.push(`situação do PDTIC ${rotulo.toLowerCase()}`);
    }
    return partes.join(' e ');
  }

  private lerFiltros(nivelBruto: string | null, situacaoBruta: string | null): void {
    const nivel = idDoParametro(nivelBruto);
    const situacao = CHAVES_SITUACAO_PAINEL.includes(situacaoBruta ?? '') ? situacaoBruta as PeChaveSituacaoPainel : null;
    const mudou = nivel !== this.nivel || situacao !== this.situacao || !this.painel;
    this.nivel = nivel;
    this.situacao = situacao;
    this.nivelEscolhido = nivel !== null ? String(nivel) : '';
    this.situacaoEscolhida = situacao ?? '';
    if (mudou && !this.carregandoOs(nivel, situacao)) this.carregar();
  }

  /** O mesmo pedido já está a caminho (a primeira leitura do endereço e a do estado chegam juntas). */
  private pedido: string | null = null;
  private carregandoOs(nivel: number | null, situacao: string | null): boolean {
    return this.carregando && this.pedido === `${nivel}:${situacao}`;
  }

  /** Mudar uma lista vale na hora: o filtro vai para o endereço (sem entrar no histórico) e o painel vem de novo. */
  aplicarFiltros(): void {
    this.navegar({
      nivel: idDoParametro(this.nivelEscolhido) !== null ? this.nivelEscolhido : null,
      situacao: this.situacaoEscolhida || null
    });
  }

  limparFiltros(): void {
    this.nivelEscolhido = '';
    this.situacaoEscolhida = '';
    this.navegar({ nivel: null, situacao: null });
  }

  private navegar(queryParams: Params): void {
    this.router.navigate([], { relativeTo: this.rota, queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }

  carregar(): void {
    const nivel = this.nivel;
    const situacao = this.situacao;
    this.carga?.unsubscribe();
    this.carregando = true;
    this.pedido = `${nivel}:${situacao}`;
    this.erro = null;
    this.carga = this.paineisService.painel({ NivelId: nivel, Situacao: situacao }).subscribe({
      next: painel => {
        this.carregando = false;
        this.pedido = null;
        this.aplicar(painel);
      },
      error: erro => {
        this.carregando = false;
        this.pedido = null;
        // 403: o interceptor já tirou a pessoa do módulo
        const mensagem = mensagemErroPe(erro, 'Não foi possível carregar o painel. Tente de novo em alguns instantes.');
        if (mensagem !== null) this.erro = mensagem;
      }
    });
  }

  private aplicar(bruto: PePainel): void {
    const painel: PePainel = {
      ...bruto,
      TotalOrgaos: bruto?.TotalOrgaos ?? 0,
      PorSituacao: bruto?.PorSituacao ?? [],
      EmElaboracaoPorEtapa: bruto?.EmElaboracaoPorEtapa ?? [],
      PorNivel: bruto?.PorNivel ?? [],
      PorObjetivoPetic: bruto?.PorObjetivoPetic ?? [],
      AcoesPorTema: bruto?.AcoesPorTema ?? [],
      RiscosPorNivel: bruto?.RiscosPorNivel ?? [],
      ExecucaoUltimoCiclo: bruto?.ExecucaoUltimoCiclo ?? [],
      Alertas: {
        VigenciaVencida: bruto?.Alertas?.VigenciaVencida ?? 0,
        RevisaoVencida: bruto?.Alertas?.RevisaoVencida ?? 0,
        CicloAtrasado: bruto?.Alertas?.CicloAtrasado ?? 0,
        Inadimplentes: bruto?.Alertas?.Inadimplentes ?? 0,
        DeliberacoesAguardando: bruto?.Alertas?.DeliberacoesAguardando ?? 0
      },
      Filtros: { Niveis: bruto?.Filtros?.Niveis ?? [], Situacoes: bruto?.Filtros?.Situacoes ?? [] }
    };
    this.painel = painel;
    this.montarCartoes(painel);
    this.montarAlertas(painel);
    this.montarGraficos(painel);
  }

  /** Os filtros do painel que a conformidade também entende (o nível e a situação). */
  private queryConformidade(extra: Params): Params {
    const query: Params = { ...extra };
    if (this.nivel !== null) query['nivel'] = String(this.nivel);
    if (this.situacao !== null && !('situacao' in extra)) query['situacao'] = this.situacao;
    return query;
  }

  private soma(painel: PePainel, chaves: readonly string[]): number {
    return painel.PorSituacao.filter(s => chaves.includes(s.Chave)).reduce((t, s) => t + (s.Quantidade ?? 0), 0);
  }

  private montarCartoes(p: PePainel): void {
    const conformidade = `${BASE_PE}/conformidade`;
    this.cartoes = [
      {
        chave: 'total', titulo: 'Órgãos', numero: p.TotalOrgaos,
        texto: this.filtrosAtivos ? 'com os filtros escolhidos' : 'no sistema',
        rota: conformidade, query: this.queryConformidade({})
      },
      {
        chave: 'sem', titulo: 'Sem PDTIC', numero: this.soma(p, ['sem_pdtic']),
        texto: 'ainda não começaram o PDTIC no sistema',
        rota: conformidade, query: this.queryConformidade({ situacao: 'sem_pdtic' })
      },
      {
        chave: 'caminho', titulo: 'PDTIC a caminho', numero: this.soma(p, A_CAMINHO),
        texto: 'em elaboração, devolvido, com o CGTIC ou aprovado sem publicar',
        rota: conformidade, query: this.queryConformidade({ situacao: A_CAMINHO.join(',') })
      },
      {
        chave: 'publicados', titulo: 'PDTIC publicado', numero: this.soma(p, PUBLICADOS),
        texto: 'publicado ou em acompanhamento',
        rota: conformidade, query: this.queryConformidade({ situacao: PUBLICADOS.join(',') })
      }
    ];
  }

  private montarAlertas(p: PePainel): void {
    const conformidade = `${BASE_PE}/conformidade`;
    const a = p.Alertas;
    this.alertas = [
      {
        chave: 'vigencia', numero: a.VigenciaVencida, icone: 'event_busy',
        singular: 'órgão com a vigência do PDTIC vencida', plural: 'órgãos com a vigência do PDTIC vencida',
        rota: conformidade, query: this.queryConformidade({ alerta: 'vigencia' }), link: 'Ver quais'
      },
      {
        chave: 'revisao', numero: a.RevisaoVencida, icone: 'update',
        singular: 'órgão com a revisão do PDTIC vencida', plural: 'órgãos com a revisão do PDTIC vencida',
        rota: conformidade, query: this.queryConformidade({ alerta: 'revisao' }), link: 'Ver quais'
      },
      {
        chave: 'ciclo', numero: a.CicloAtrasado, icone: 'schedule',
        singular: 'órgão com ciclo de acompanhamento atrasado', plural: 'órgãos com ciclo de acompanhamento atrasado',
        rota: conformidade, query: this.queryConformidade({ alerta: 'ciclo' }), link: 'Ver quais'
      },
      {
        chave: 'inadimplentes', numero: a.Inadimplentes, icone: 'report',
        singular: 'órgão inadimplente', plural: 'órgãos inadimplentes',
        rota: `${BASE_PE}/inadimplencia`, query: { situacao: 'inadimplente' }, link: 'Ver as inadimplências'
      },
      {
        chave: 'deliberacoes', numero: a.DeliberacoesAguardando, icone: 'gavel',
        singular: 'envio aguardando a deliberação do CGTIC', plural: 'envios aguardando a deliberação do CGTIC',
        rota: `${BASE_PE}/cgtic/recebidos`, query: {}, link: 'Ver o que chegou ao comitê'
      }
    ];
    this.totalAlertas = this.alertas.reduce((t, x) => t + x.numero, 0);
  }

  private montarGraficos(p: PePainel): void {
    this.graficos = [
      {
        chave: 'situacao', titulo: 'Órgãos por situação do PDTIC', rotuloCategoria: 'Situação do PDTIC', unidade: ORGAOS,
        legenda: 'Cada barra é uma situação do PDTIC atual de cada órgão; o número é a quantidade de órgãos.',
        series: SERIE_ORGAOS,
        barras: p.PorSituacao.map(s => ({ chave: s.Chave, rotulo: s.Rotulo || s.Chave, valores: [s.Quantidade] })),
        vazio: 'Nenhum órgão para contar.'
      },
      {
        chave: 'etapa', titulo: 'PDTICs em elaboração, por etapa', rotuloCategoria: 'Etapa da trilha', unidade: { singular: 'PDTIC', plural: 'PDTICs' },
        legenda: 'Em que etapa da trilha está cada PDTIC em elaboração: a etapa do próximo passo recomendado.',
        series: SERIE_PDTICS,
        // A etapa 0 é a dos PDTICs sem próximo passo (o servidor manda "Sem próximo passo" no título)
        barras: p.EmElaboracaoPorEtapa.map(e => ({
          chave: `etapa-${e.Etapa}`, rotulo: e.Etapa > 0 ? `Etapa ${e.Etapa} · ${e.Titulo}` : e.Titulo, valores: [e.Quantidade]
        })),
        vazio: 'Nenhum PDTIC em elaboração agora.'
      },
      {
        chave: 'nivel', titulo: 'Órgãos por nível de maturidade', rotuloCategoria: 'Nível', unidade: ORGAOS,
        legenda: 'O nível de maturidade diz os passos e os campos que o órgão preenche; o número é a quantidade de órgãos.',
        series: SERIE_ORGAOS,
        barras: p.PorNivel.map(n => ({ chave: `nivel-${n.NivelId}`, rotulo: n.Nome, valores: [n.Quantidade] })),
        vazio: 'Nenhum órgão para contar.'
      },
      {
        chave: 'objetivos', titulo: 'Necessidades e metas por objetivo do PETIC-DF', rotuloCategoria: 'Objetivo estratégico',
        unidade: { singular: 'item', plural: 'itens' },
        legenda: 'Quantas necessidades e quantas metas dos PDTICs estão ligadas a cada objetivo estratégico do PETIC-DF vigente.',
        series: SERIES_OBJETIVOS,
        barras: p.PorObjetivoPetic.map(o => ({
          chave: `objetivo-${o.RegistroId}`,
          rotulo: [o.Codigo, o.Texto].filter(Boolean).join(' · ') || 'Objetivo sem texto',
          valores: [o.Necessidades, o.Metas]
        })),
        vazio: 'Ainda não há necessidades nem metas ligadas aos objetivos do PETIC-DF vigente.'
      },
      {
        chave: 'temas', titulo: 'Ações por tema', rotuloCategoria: 'Tema', unidade: { singular: 'ação', plural: 'ações' },
        legenda: 'As ações dos planos de ação dos PDTICs, pelo tema (art. 12, § 2º, V, VI e IX).',
        series: SERIE_ACOES,
        barras: p.AcoesPorTema.map(t => ({ chave: `tema-${t.Valor}`, rotulo: t.Rotulo || t.Valor, valores: [t.Quantidade] })),
        vazio: 'Ainda não há ações com tema nos PDTICs.'
      },
      {
        chave: 'riscos', titulo: 'Riscos por nível', rotuloCategoria: 'Nível do risco', unidade: { singular: 'risco', plural: 'riscos' },
        legenda: 'Os riscos dos planos de riscos dos PDTICs, pelo nível. A cor só acompanha o nome do nível.',
        series: SERIE_RISCOS,
        barras: p.RiscosPorNivel.map(r => ({
          chave: `risco-${r.Nivel}`, rotulo: r.Rotulo || r.Nivel, valores: [r.Quantidade], tom: TOM_RISCO[r.Nivel] ?? 'cinza'
        })),
        vazio: 'Ainda não há riscos cadastrados nos PDTICs.'
      },
      {
        chave: 'execucao', titulo: 'Execução das ações no último ciclo', rotuloCategoria: 'Situação da ação', unidade: { singular: 'ação', plural: 'ações' },
        legenda: 'A situação de cada ação no último ciclo de monitoramento com dado de cada órgão. "Sem registro" é a ação que ainda não '
          + 'teve a situação informada. A cor só acompanha o nome.',
        series: SERIE_ACOES,
        barras: p.ExecucaoUltimoCiclo.map(x => ({
          chave: `execucao-${x.Situacao}`, rotulo: x.Rotulo || x.Situacao, valores: [x.Quantidade], tom: TOM_EXECUCAO[x.Situacao] ?? 'cinza'
        })),
        vazio: 'Ainda não há ciclos de monitoramento com dado.'
      }
    ];
  }

  porChave(_: number, x: { chave: string }): string {
    return x.chave;
  }

  porNivel(_: number, n: { Id: number }): number {
    return n.Id;
  }

  porSituacao(_: number, s: { Chave: string }): string {
    return s.Chave;
  }
}
