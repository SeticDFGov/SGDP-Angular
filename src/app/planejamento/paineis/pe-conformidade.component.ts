import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import {
  PeConformidade, PeConformidadeOrgao, PeFormatoPlanilha, PeGrupoConformidade, PeItemConformidade
} from '../../../api/planejamento/interface';
import { NotificationService } from '../../core/services/notification.service';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import { mensagemErroDownload, salvarResposta } from '../shared/pe-download';
import {
  classeSituacaoInadimplencia, iconeSituacaoInadimplencia, rotuloSituacaoInadimplencia
} from '../shared/pe-inadimplencia-rotulos';
import {
  FiltroConformidade, GRUPOS_CONFORMIDADE, GrupoConformidade, ITENS_CONFORMIDADE_PADRAO, MarcaAtendimento, atendeQuando,
  contarGrupos, filtrarSemGrupo, filtroConformidadeDaUrl, filtroConformidadeVazio, grupoConformidade, marcaAtendimento,
  orgaosEmOrdem, parametrosConformidade, rotuloAlerta, rotuloSituacaoDoOrgao, textoPercentualConformidade
} from '../shared/pe-paineis-rotulos';
import { hojeIso, textoData } from '../shared/registros/pe-valores';
import { PePaineisService } from '../services/pe-paineis.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { BASE_PE, rotaPaginaOrgao } from '../trilha/pe-trilhas';

/** Uma etiqueta do filtro aplicado, com o que tirar ao clicar no "×". */
interface FiltroAtivo {
  chave: keyof FiltroConformidade;
  texto: string;
}

/**
 * Conformidade dos órgãos (E8; passo 4.2 do administrador e 1.2 da SGDI; a
 * Secretaria do CGTIC e o admin do SGDP também veem): uma linha por órgão, uma
 * coluna por item de TIC (a marca com texto e ícone, nunca só a cor; o detalhe na
 * dica da célula e na linha "Detalhes", que abre e fecha), o percentual, o grupo,
 * a inadimplência em aberto e o link para a página do órgão.
 *
 * - Resumo dos grupos (alta, média e baixa conformidade), que também filtra.
 * - Filtros no endereço: `grupo`, `nivel` (vai ao servidor, `NivelId`), `busca`
 *   (sigla ou nome, sem caixa e sem acento), `situacao` (as chaves do painel,
 *   separadas por vírgula) e `alerta` (os alertas do painel). Os links do painel
 *   chegam por eles. Grupo, busca, situação e alerta a tela aplica sobre a lista
 *   que chegou: o resumo conta os três grupos da lista que passa nos outros filtros.
 * - Planilha em CSV e XLSX (uma linha por órgão, uma coluna por item).
 *
 * Estados vazios distintos (nenhum órgão no sistema; nenhum com os filtros, com
 * "Limpar os filtros"); falha de carregamento como mensagem na tela. Papel de
 * órgão vê um aviso e a tela não consulta nada (o 403 tiraria a pessoa do módulo).
 */
@Component({
  selector: 'app-pe-conformidade',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaPlanejamentoDirective],
  templateUrl: './pe-conformidade.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeConformidadeComponent implements OnInit {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly paineisService = inject(PePaineisService);
  private readonly notificacoes = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly base = BASE_PE;
  readonly grupos = GRUPOS_CONFORMIDADE;

  podeVer: boolean | null = null;
  erroPapel = false;
  paginaDoMeuOrgao: string | null = null;
  private iniciado = false;

  dados: PeConformidade | null = null;
  carregando = false;
  erro: string | null = null;
  private carga?: Subscription;
  /** O nível da lista que está na tela (undefined: nenhuma carga ainda). */
  private nivelCarregado: number | null | undefined = undefined;

  /** Os filtros aplicados (os do endereço). */
  filtro: FiltroConformidade = filtroConformidadeVazio();
  buscaDigitada = '';
  nivelEscolhido = '';
  /** Os níveis que os órgãos têm (da lista de órgãos que a moldura já carrega). */
  niveis: { Id: number; Nome: string }[] = [];

  itens: PeItemConformidade[] = [];
  /** O que cada item pede, para a lista que abre antes da tabela (a frase do servidor ou a do front). */
  explicacoes: { chave: string; rotulo: string; base: string; atende: string }[] = [];
  linhas: PeConformidadeOrgao[] = [];
  contagem: Record<PeGrupoConformidade, number> = { alta: 0, media: 0, baixa: 0 };
  filtrosAtivos: FiltroAtivo[] = [];
  /** Órgãos com a linha "Detalhes" aberta. */
  private abertos = new Set<number>();
  /** As marcas de cada linha, pela chave do item (montadas uma vez por carga). */
  private marcas = new Map<number, Record<string, MarcaAtendimento>>();

  baixando: PeFormatoPlanilha | null = null;

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
          this.estadoService.orgaos$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(orgaos => this.montarNiveis(orgaos ?? []));
          this.rota.queryParamMap
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(params => this.lerFiltros(filtroConformidadeDaUrl(nome => params.get(nome))));
        }
      });
  }

  tentarPapelDeNovo(): void {
    this.estadoService.iniciar();
  }

  /** Níveis sem repetir, em ordem alfabética, e o do endereço mesmo que a lista ainda não o tenha. */
  private montarNiveis(orgaos: { NivelId: number; NivelNome: string }[]): void {
    const mapa = new Map<number, string>();
    for (const o of orgaos) {
      if (o.NivelId && !mapa.has(o.NivelId)) mapa.set(o.NivelId, o.NivelNome);
    }
    this.niveis = [...mapa.entries()].map(([Id, Nome]) => ({ Id, Nome }))
      .sort((a, b) => a.Nome.localeCompare(b.Nome, 'pt-BR'));
    this.filtrosAtivos = this.descreverFiltros();
  }

  private lerFiltros(filtro: FiltroConformidade): void {
    this.filtro = filtro;
    this.buscaDigitada = filtro.busca;
    this.nivelEscolhido = filtro.nivel !== null ? String(filtro.nivel) : '';
    if (filtro.nivel !== this.nivelCarregado) this.carregar();
    else this.aplicarFiltros();
  }

  carregar(): void {
    const nivel = this.filtro.nivel;
    this.carga?.unsubscribe();
    this.carregando = true;
    this.erro = null;
    this.carga = this.paineisService.conformidade({ NivelId: nivel }).subscribe({
      next: dados => {
        this.carregando = false;
        this.nivelCarregado = nivel;
        this.dados = { Itens: dados?.Itens ?? [], Resumo: dados?.Resumo ?? { Alta: 0, Media: 0, Baixa: 0 }, Orgaos: dados?.Orgaos ?? [] };
        // Sem os itens na resposta, os seis da especificação (a linha de cada órgão diz quais vieram)
        this.itens = this.dados.Itens.length ? this.dados.Itens : [...ITENS_CONFORMIDADE_PADRAO];
        this.explicacoes = this.itens.map(i => ({ chave: i.Chave, rotulo: i.Rotulo, base: i.Base, atende: atendeQuando(i) }));
        this.marcas.clear();
        for (const o of this.dados.Orgaos) {
          const porItem: Record<string, MarcaAtendimento> = {};
          for (const item of this.itens) porItem[item.Chave] = marcaAtendimento(o.Itens?.[item.Chave]);
          this.marcas.set(o.OrgaoId, porItem);
        }
        this.aplicarFiltros();
      },
      error: erro => {
        this.carregando = false;
        // 403: o interceptor já tirou a pessoa do módulo
        const mensagem = mensagemErroPe(erro, 'Não foi possível carregar a conformidade dos órgãos. Tente de novo em alguns instantes.');
        if (mensagem !== null) this.erro = mensagem;
      }
    });
  }

  /** Busca, situação, alerta e grupo, sobre a lista que chegou (o nível já veio filtrado do servidor). */
  private aplicarFiltros(): void {
    const semGrupo = orgaosEmOrdem(filtrarSemGrupo(this.dados?.Orgaos ?? [], this.filtro));
    this.contagem = contarGrupos(semGrupo);
    this.linhas = this.filtro.grupo ? semGrupo.filter(o => o.Grupo === this.filtro.grupo) : semGrupo;
    this.filtrosAtivos = this.descreverFiltros();
  }

  private descreverFiltros(): FiltroAtivo[] {
    const f = this.filtro;
    const ativos: FiltroAtivo[] = [];
    if (f.grupo) ativos.push({ chave: 'grupo', texto: grupoConformidade(f.grupo)?.rotulo ?? f.grupo });
    if (f.nivel !== null) {
      const nome = this.niveis.find(n => n.Id === f.nivel)?.Nome;
      ativos.push({ chave: 'nivel', texto: nome ? `Nível ${nome}` : 'Nível escolhido' });
    }
    if (f.busca) ativos.push({ chave: 'busca', texto: `Órgão: "${f.busca}"` });
    if (f.situacoes.length) {
      ativos.push({ chave: 'situacoes', texto: `Situação do PDTIC: ${f.situacoes.map(s => rotuloSituacaoDoOrgao(s)).join(' ou ')}` });
    }
    if (f.alerta) ativos.push({ chave: 'alerta', texto: rotuloAlerta(f.alerta) });
    return ativos;
  }

  // ── Filtros no endereço ───────────────────────────────────────────────────

  private navegar(filtro: FiltroConformidade): void {
    this.router.navigate([], {
      relativeTo: this.rota, queryParams: parametrosConformidade(filtro), queryParamsHandling: 'merge', replaceUrl: true
    });
  }

  buscar(): void {
    const busca = this.buscaDigitada.trim().slice(0, 100);
    if (busca !== this.filtro.busca) this.navegar({ ...this.filtro, busca });
  }

  escolherNivel(): void {
    const nivel = /^\d+$/.test(this.nivelEscolhido) ? Number(this.nivelEscolhido) : null;
    if (nivel !== this.filtro.nivel) this.navegar({ ...this.filtro, nivel });
  }

  /** O cartão do grupo liga e desliga o filtro. */
  alternarGrupo(g: GrupoConformidade): void {
    this.navegar({ ...this.filtro, grupo: this.filtro.grupo === g.valor ? null : g.valor });
  }

  tirarFiltro(chave: keyof FiltroConformidade): void {
    const novo: FiltroConformidade = { ...this.filtro };
    switch (chave) {
      case 'grupo': novo.grupo = null; break;
      case 'nivel': novo.nivel = null; break;
      case 'busca': novo.busca = ''; break;
      case 'situacoes': novo.situacoes = []; break;
      case 'alerta': novo.alerta = null; break;
    }
    this.navegar(novo);
  }

  limparFiltros(): void {
    this.navegar(filtroConformidadeVazio());
  }

  // ── Linhas ────────────────────────────────────────────────────────────────

  marca(o: PeConformidadeOrgao, item: PeItemConformidade): MarcaAtendimento {
    return this.marcas.get(o.OrgaoId)?.[item.Chave] ?? marcaAtendimento(null);
  }

  /** A dica da célula: o item, a resposta e o detalhe do servidor. */
  dica(o: PeConformidadeOrgao, item: PeItemConformidade): string {
    const detalhe = o.Itens?.[item.Chave]?.Detalhe?.trim();
    const texto = `${item.Rotulo}: ${this.marca(o, item).texto}`;
    return detalhe ? `${texto}. ${detalhe}` : texto;
  }

  detalhe(o: PeConformidadeOrgao, item: PeItemConformidade): string {
    return o.Itens?.[item.Chave]?.Detalhe?.trim() || '';
  }

  percentual(o: PeConformidadeOrgao): string {
    return textoPercentualConformidade(o);
  }

  grupo(o: PeConformidadeOrgao): GrupoConformidade | null {
    return grupoConformidade(o.Grupo);
  }

  pdtic(o: PeConformidadeOrgao): string {
    if (!o.PdticId) return 'Sem PDTIC';
    return [o.PdticVersao ? `PDTIC ${o.PdticVersao}` : 'PDTIC', rotuloSituacaoDoOrgao(o.PdticSituacao)].join(' · ');
  }

  pagina(o: PeConformidadeOrgao): string {
    return rotaPaginaOrgao(o.OrgaoId);
  }

  rotuloInadimplencia(o: PeConformidadeOrgao): string {
    return rotuloSituacaoInadimplencia(o.Inadimplencia?.Situacao);
  }

  classeInadimplencia(o: PeConformidadeOrgao): string {
    return classeSituacaoInadimplencia(o.Inadimplencia?.Situacao);
  }

  iconeInadimplencia(o: PeConformidadeOrgao): string {
    return iconeSituacaoInadimplencia(o.Inadimplencia?.Situacao);
  }

  /** "prazo até 30/09/2026" (vencido: "prazo vencido em ..."), só na notificação em aberto. */
  prazoInadimplencia(o: PeConformidadeOrgao): string {
    const i = o.Inadimplencia;
    if (!i || i.Situacao !== 'notificado' || !i.Prazo) return '';
    return i.Prazo < hojeIso() ? `prazo vencido em ${textoData(i.Prazo)}` : `prazo até ${textoData(i.Prazo)}`;
  }

  aberto(o: PeConformidadeOrgao): boolean {
    return this.abertos.has(o.OrgaoId);
  }

  alternarDetalhes(o: PeConformidadeOrgao): void {
    if (this.abertos.has(o.OrgaoId)) this.abertos.delete(o.OrgaoId);
    else this.abertos.add(o.OrgaoId);
  }

  get colunas(): number {
    return this.itens.length + 4;
  }

  get semOrgaos(): boolean {
    return !!this.dados && this.dados.Orgaos.length === 0 && this.filtro.nivel === null;
  }

  get comFiltros(): boolean {
    return this.filtrosAtivos.length > 0;
  }

  // ── Planilha ──────────────────────────────────────────────────────────────

  baixar(formato: PeFormatoPlanilha): void {
    if (this.baixando) return;
    this.baixando = formato;
    const f = this.filtro;
    this.paineisService.planilhaConformidade(formato, { Grupo: f.grupo, NivelId: f.nivel, Filtro: f.busca }).subscribe({
      next: resposta => {
        this.baixando = null;
        salvarResposta(resposta, `PDTIC_conformidade_${hojeIso()}.${formato}`);
      },
      error: erro => {
        this.baixando = null;
        mensagemErroDownload(erro, 'Não foi possível gerar a planilha da conformidade. Tente de novo.').then(m => {
          if (m) this.notificacoes.error(m);
        });
      }
    });
  }

  porOrgao(_: number, o: PeConformidadeOrgao): number {
    return o.OrgaoId;
  }

  porItem(_: number, i: PeItemConformidade): string {
    return i.Chave;
  }

  porExplicacao(_: number, e: { chave: string }): string {
    return e.chave;
  }

  porValor(_: number, g: { valor: string }): string {
    return g.valor;
  }

  porChave(_: number, f: FiltroAtivo): string {
    return f.chave;
  }

  porNivel(_: number, n: { Id: number }): number {
    return n.Id;
  }
}
