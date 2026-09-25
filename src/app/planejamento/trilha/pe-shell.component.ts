import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { PeOrgaoNivel, PePdtic } from '../../../api/planejamento/interface';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import {
  classeEstadoPasso, corIconeEstadoPasso, iconeEstadoPasso, rotuloSituacaoPdtic, textoDoStatus
} from '../shared/pe-pdtic-rotulos';
import { EstadoTrilhaPe, PeTrilhaEstadoService, valorVisaoOrgao } from './pe-trilha-estado.service';
import { EstadoPassoPe, StatusPassoPe } from './pe-trilha-status.service';
import {
  BASE_PE, EtapaTrilhaPe, PERFIS_CENTRAIS_PE, PassoNumeradoPe, ROTULOS_PERFIL_TRILHA_PE,
  passoDaUrl, rotuloGuia
} from './pe-trilhas';

interface OpcaoVisao {
  valor: string;
  rotulo: string;
}

/**
 * Moldura de todas as telas da Governança Estratégica, no molde da trilha do PGIA
 * (`pgia/trilha/pgia-shell.component.ts`): a trilha numerada do papel fica sempre
 * à vista (etapas 1, 2, 3... e os passos da etapa aberta, 2.1, 2.2...), com o que
 * fazer, a base legal e a atividade do guia. O conteúdo troca embaixo, e "Passo
 * anterior"/"Próximo passo" seguem a ordem da trilha.
 *
 * É a rota-mãe do módulo: trocar de passo não recria a trilha. O `citaPlanejamento`
 * fica só na seção da trilha, nunca no elemento que contém o `router-outlet`
 * (cada tela tem o seu no raiz; dois no mesmo texto duplicariam os chips).
 * Sem papel ou sem conseguir consultar o papel, a moldura mostra o aviso no lugar
 * da trilha e não abre tela nenhuma.
 *
 * "Ver a trilha de" (admin do SGDP e papéis globais): escolher e confirmar no
 * botão "Ver" (mudar a lista não troca a trilha sozinha, o que numa lista com os
 * órgãos faria uma consulta a cada seta do teclado). A trilha de um órgão fica
 * só para ler, com a faixa que diz de quem é e o botão para voltar.
 *
 * E7: a situação de cada passo inclui aguardando, atrasado e feito fora do
 * sistema, sempre com o motivo em texto (no nome do link do passo e ao lado do
 * selo do passo aberto), e, com uma revisão em andamento, a escolha entre a
 * versão em revisão e a vigente (dois botões com `aria-pressed`).
 */
@Component({
  selector: 'app-pe-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaPlanejamentoDirective],
  templateUrl: './pe-shell.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly estadoService = inject(PeTrilhaEstadoService);

  readonly base = BASE_PE;

  estado: EstadoTrilhaPe | null = null;
  rotaAtual = '';
  passoAtual: PassoNumeradoPe | null = null;
  /** Etapa aberta na barra (a do passo atual, ou a escolhida pelo usuário). */
  etapaAberta: number | null = null;

  /** Opções do "Ver a trilha de" (papéis globais e admin do SGDP), refeitas quando o estado ou os órgãos mudam. */
  opcoesCentrais: OpcaoVisao[] = [];
  opcoesOrgaos: OpcaoVisao[] = [];
  /** O órgão à vista ainda não está na lista (lista carregando ou sem ele): a opção dele entra assim mesmo. */
  opcaoOrgaoAvulsa: OpcaoVisao | null = null;
  /** Aviso no lugar dos órgãos quando a lista ainda não chegou ou veio vazia. */
  avisoOrgaos: string | null = null;
  /** Escolha no "Ver a trilha de", ainda não confirmada no botão "Ver". */
  visaoEscolhida = '';
  private visaoMostrada = '';
  private orgaos: PeOrgaoNivel[] | null = null;

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        const trocouTrilha = estado?.trilha !== this.estado?.trilha;
        this.estado = estado;
        if (trocouTrilha) this.lerUrl(this.router.url);
        // A lista acompanha a trilha à vista só quando ela muda: a situação dos passos
        // chegando não desfaz a escolha que a pessoa ainda não confirmou no "Ver"
        const visao = this.estadoService.visaoAtual;
        if (visao !== this.visaoMostrada) {
          this.visaoMostrada = visao;
          this.visaoEscolhida = visao;
        }
        this.montarOpcoes();
      });
    this.estadoService.orgaos$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(orgaos => {
        this.orgaos = orgaos;
        this.montarOpcoes();
      });
    this.estadoService.iniciar();

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(e => {
        const anterior = this.passoAtual?.numero;
        this.lerUrl((e as NavigationEnd).urlAfterRedirects);
        if (this.passoAtual?.numero !== anterior) this.estadoService.atualizarStatus();
      });
  }

  // ── Leitura da posição ────────────────────────────────────────────────────

  get naVisaoGeral(): boolean {
    return this.rotaAtual === BASE_PE;
  }

  get etapa(): EtapaTrilhaPe | null {
    const trilha = this.estado?.trilha;
    return trilha && this.etapaAberta !== null ? trilha.etapas[this.etapaAberta] ?? null : null;
  }

  passosDaEtapa(indice: number): PassoNumeradoPe[] {
    return this.estado?.passos.filter(p => p.etapa === indice) ?? [];
  }

  get anterior(): PassoNumeradoPe | null {
    if (!this.estado || !this.passoAtual) return null;
    return this.estado.passos[this.passoAtual.indice - 1] ?? null;
  }

  get proximo(): PassoNumeradoPe | null {
    if (!this.estado || !this.passoAtual) return null;
    return this.estado.passos[this.passoAtual.indice + 1] ?? null;
  }

  /** Sigla do órgão ao lado do nome da trilha (a do órgão da pessoa ou a do órgão à vista). */
  get siglaOrgao(): string | null {
    if (this.estado?.perfil !== 'orgao') return null;
    return this.estado.trilhaOrgao?.OrgaoSigla ?? this.estado.meuPapel?.OrgaoSigla ?? null;
  }

  /** "Nível Avançado" (ou "Nível Básico, o padrão") na trilha do órgão. */
  get rotuloNivel(): string | null {
    const t = this.estado?.trilhaOrgao;
    if (!t) return null;
    return t.NivelPadrao ? `Nível ${t.NivelNome} (o padrão: o nível do órgão ainda não foi definido)` : `Nível ${t.NivelNome}`;
  }

  /** "PDTIC 1.0 · Em elaboração" (ou "PDTIC ainda não começado") na trilha do órgão. */
  get rotuloPdtic(): string | null {
    const e = this.estado;
    if (e?.perfil !== 'orgao') return null;
    if (e.pdtic) return `PDTIC ${e.pdtic.Versao} · ${rotuloSituacaoPdtic(e.pdtic.Situacao)}`;
    return e.cargaPdtic === 'sem-pdtic' ? 'PDTIC ainda não começado' : null;
  }

  /** E7: a versão em revisão e a vigente, para a escolha no alto da trilha (null sem revisão em andamento). */
  get versoes(): { emRevisao: PePdtic; vigente: PePdtic } | null {
    return this.estadoService.versoesParaEscolher;
  }

  versaoAberta(p: PePdtic): boolean {
    return this.estado?.pdtic?.Id === p.Id;
  }

  /**
   * Troca a versão à vista. Fora da visão geral, vai para ela antes (como o "Ver a
   * trilha de"): outra versão, outros dados, e a guarda de saída do passo pergunta
   * antes de perder uma mudança não salva.
   */
  escolherVersao(p: PePdtic): void {
    if (this.versaoAberta(p)) return;
    if (this.naVisaoGeral) {
      this.estadoService.escolherVersao(p.Id);
      return;
    }
    this.router.navigate([BASE_PE]).then(saiu => {
      if (saiu) this.estadoService.escolherVersao(p.Id);
    });
  }

  guia(passo: PassoNumeradoPe): string {
    return rotuloGuia(passo.guia);
  }

  private lerUrl(url: string): void {
    this.rotaAtual = url.split('#')[0].split('?')[0];
    this.passoAtual = passoDaUrl(this.estado?.passos ?? [], url);
    if (this.passoAtual) this.etapaAberta = this.passoAtual.etapa;
    else if (this.naVisaoGeral) this.etapaAberta = null;
  }

  // ── "Ver a trilha de" ─────────────────────────────────────────────────────

  get podeTrocarVisao(): boolean {
    return this.estadoService.podeVerOutrosOrgaos;
  }

  /**
   * Trilhas centrais (todas para o admin do SGDP; a própria para os papéis
   * globais) e os órgãos. O órgão à vista que ainda não está na lista entra à parte.
   */
  private montarOpcoes(): void {
    const e = this.estado;
    const perfis = !e ? [] : e.adminGeral ? PERFIS_CENTRAIS_PE : e.perfilProprio ? [e.perfilProprio] : [];
    this.opcoesCentrais = perfis.map(p => ({
      valor: p,
      rotulo: e?.adminGeral ? ROTULOS_PERFIL_TRILHA_PE[p] : `Minha trilha (${ROTULOS_PERFIL_TRILHA_PE[p]})`
    }));
    this.opcoesOrgaos = (this.orgaos ?? []).map(o => ({ valor: valorVisaoOrgao(o.OrgaoId), rotulo: `${o.Sigla} · ${o.Nome}` }));
    this.avisoOrgaos = this.orgaos === null ? 'Carregando os órgãos...' : this.orgaos.length === 0 ? 'Nenhum órgão encontrado' : null;

    this.opcaoOrgaoAvulsa = null;
    if (e && e.orgaoVisto !== null) {
      const valor = valorVisaoOrgao(e.orgaoVisto);
      if (!this.opcoesOrgaos.some(o => o.valor === valor)) {
        const t = e.trilhaOrgao;
        this.opcaoOrgaoAvulsa = { valor, rotulo: t ? `${t.OrgaoSigla} · ${t.OrgaoNome}` : 'Órgão escolhido' };
      }
    }
  }

  porValor(_: number, opcao: OpcaoVisao): string {
    return opcao.valor;
  }

  get escolhaPendente(): boolean {
    return !!this.visaoEscolhida && this.visaoEscolhida !== this.estadoService.visaoAtual;
  }

  verTrilha(): void {
    if (!this.visaoEscolhida || !this.escolhaPendente) return;
    this.estadoService.trocarVisao(this.visaoEscolhida);
    // Outra trilha, outras telas: recomeça pela visão geral
    this.router.navigate([BASE_PE]);
  }

  voltarParaMinhaTrilha(): void {
    this.estadoService.verMinhaTrilha();
    this.router.navigate([BASE_PE]);
  }

  // ── Status ────────────────────────────────────────────────────────────────

  status(passo: PassoNumeradoPe): StatusPassoPe | null {
    return this.estadoService.statusDoPasso(passo);
  }

  /** O selo com o motivo, numa frase (nome do link do passo para o leitor de tela). */
  textoStatus(s: StatusPassoPe): string {
    return textoDoStatus(s);
  }

  /**
   * Pior situação entre os passos da etapa (vale para a bolinha da barra):
   * atrasado, atenção, pendente e, depois, aguardando. Passo feito fora do
   * sistema conta como feito; "não se aplica", como resolvido.
   */
  private estadoEtapa(indice: number): EstadoPassoPe | null {
    const estados = this.passosDaEtapa(indice).map(p => this.status(p)?.estado).filter((e): e is EstadoPassoPe => !!e);
    for (const e of ['atrasado', 'atencao', 'pendente', 'aguardando'] as EstadoPassoPe[]) {
      if (estados.includes(e)) return e;
    }
    if (estados.includes('feito') || estados.includes('externo')) return 'feito';
    return estados.length > 0 ? 'nao_se_aplica' : null;
  }

  classeEstado(estado: EstadoPassoPe | undefined): string {
    return classeEstadoPasso(estado);
  }

  iconeEstado(estado: EstadoPassoPe | undefined): string {
    return iconeEstadoPasso(estado);
  }

  corIconeEstado(estado: EstadoPassoPe): string {
    return corIconeEstadoPasso(estado);
  }

  /** A situação da etapa em palavras (a bolinha é só cor: o nome do botão e a dica dizem o mesmo em texto). */
  textoEtapa(indice: number): string {
    switch (this.estadoEtapa(indice)) {
      case 'atrasado': return 'tem passo atrasado';
      case 'atencao': return 'tem passo pedindo atenção';
      case 'pendente': return 'tem passo pendente';
      case 'aguardando': return 'aguardando uma etapa anterior';
      case 'feito': return this.estado?.perfil === 'orgao' ? 'passos resolvidos' : 'nada esperando';
      case 'nao_se_aplica': return 'não se aplica';
      default: return '';
    }
  }

  corBolinha(indice: number): string {
    switch (this.estadoEtapa(indice)) {
      case 'feito': return 'bg-green-500';
      case 'atrasado': return 'bg-red-500';
      case 'atencao': return 'bg-amber-500';
      case 'pendente': return 'bg-blue-500';
      case 'aguardando': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  }

  // ── Navegação ─────────────────────────────────────────────────────────────

  irPara(passo: PassoNumeradoPe): void {
    this.router.navigate([passo.rota], { queryParams: { passo: passo.numero } });
  }

  abrirEtapa(indice: number): void {
    const primeiro = this.passosDaEtapa(indice)[0];
    if (primeiro) this.irPara(primeiro);
  }

  tentarDeNovo(): void {
    this.estadoService.iniciar();
  }
}
