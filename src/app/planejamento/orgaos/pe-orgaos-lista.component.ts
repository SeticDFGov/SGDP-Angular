import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { PeConformidadeOrgao } from '../../../api/planejamento/interface';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import {
  classeSituacaoInadimplencia, iconeSituacaoInadimplencia, rotuloSituacaoInadimplencia
} from '../shared/pe-inadimplencia-rotulos';
import {
  GrupoConformidade, grupoConformidade, orgaoCasaBusca, orgaosEmOrdem, rotuloSituacaoDoOrgao, textoPercentualConformidade
} from '../shared/pe-paineis-rotulos';
import { classeSituacaoPdtic } from '../shared/pe-pdtic-rotulos';
import { PePaineisService } from '../services/pe-paineis.service';
import { PeModeloService } from '../services/pe-modelo.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { BASE_PE, rotaPaginaOrgao } from '../trilha/pe-trilhas';

/**
 * A página de cada órgão, pela lista (E8; passo 4.5 do administrador e 2.1 da
 * SGDI; a Secretaria do CGTIC e o admin do SGDP também veem): os órgãos com o
 * nível, o PDTIC (versão e situação), a conformidade e a notificação ou
 * inadimplência em aberto, cada um com "Abrir a página" e "Ver a trilha" (a trilha
 * do órgão, só para ler). Os dados são os da conformidade (uma consulta só, com
 * todos os órgãos); a busca (sigla ou nome, sem caixa e sem acento) fica no
 * endereço (`?busca=`).
 *
 * Estados vazios distintos (nenhum órgão; nenhum com a busca); falha como
 * mensagem na tela. Papel de órgão vê o link para a página do próprio órgão e a
 * tela não consulta a lista (o 403 tiraria a pessoa do módulo).
 *
 * F3: no modo livre, a coluna do nível é a do nível alcançado (o que o PDTIC tem).
 */
@Component({
  selector: 'app-pe-orgaos-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaPlanejamentoDirective],
  templateUrl: './pe-orgaos-lista.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeOrgaosListaComponent implements OnInit {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly paineisService = inject(PePaineisService);
  private readonly modeloService = inject(PeModeloService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  podeVer: boolean | null = null;
  erroPapel = false;
  paginaDoMeuOrgao: string | null = null;
  siglaMeuOrgao = '';
  private iniciado = false;

  todos: PeConformidadeOrgao[] | null = null;
  linhas: PeConformidadeOrgao[] = [];
  carregando = false;
  erro: string | null = null;
  private carga?: Subscription;

  busca = '';
  buscaDigitada = '';
  /** F3: o modo dos níveis (sem a resposta, o definido). */
  modoLivre = false;

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        if (!estado || estado.carga !== 'pronta') return;
        this.erroPapel = estado.consultaPapel === 'erro';
        this.podeVer = this.estadoService.veTodosOsOrgaos;
        const meuOrgao = this.estadoService.orgaoDoPapel;
        this.paginaDoMeuOrgao = meuOrgao ? rotaPaginaOrgao(meuOrgao) : null;
        this.siglaMeuOrgao = estado.meuPapel?.OrgaoSigla ?? '';
        if (this.podeVer && !this.iniciado) {
          this.iniciado = true;
          this.modeloService.infoNiveis().subscribe({ next: info => this.modoLivre = info.modo === 'livre', error: () => undefined });
          this.carregar();
          this.rota.queryParamMap
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(params => {
              this.busca = (params.get('busca') ?? '').trim().slice(0, 100);
              this.buscaDigitada = this.busca;
              this.filtrar();
            });
        }
      });
  }

  tentarPapelDeNovo(): void {
    this.estadoService.iniciar();
  }

  carregar(): void {
    this.carga?.unsubscribe();
    this.carregando = true;
    this.erro = null;
    this.carga = this.paineisService.conformidade().subscribe({
      next: dados => {
        this.carregando = false;
        this.todos = orgaosEmOrdem(dados?.Orgaos ?? []);
        this.filtrar();
      },
      error: erro => {
        this.carregando = false;
        // 403: o interceptor já tirou a pessoa do módulo
        const mensagem = mensagemErroPe(erro, 'Não foi possível carregar a lista dos órgãos. Tente de novo em alguns instantes.');
        if (mensagem !== null) this.erro = mensagem;
      }
    });
  }

  private filtrar(): void {
    this.linhas = (this.todos ?? []).filter(o => orgaoCasaBusca(o, this.busca));
  }

  /** A busca vale no Enter e ao sair do campo; vai para o endereço sem entrar no histórico. */
  buscar(): void {
    const busca = this.buscaDigitada.trim().slice(0, 100);
    if (busca === this.busca) return;
    this.router.navigate([], { relativeTo: this.rota, queryParams: { busca: busca || null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  limparBusca(): void {
    this.buscaDigitada = '';
    this.buscar();
  }

  /** F3: o nível da linha: no modo livre, o alcançado; no definido, o do órgão. */
  nivel(o: PeConformidadeOrgao): string {
    if (this.modoLivre) return o.NivelAlcancadoNome?.trim() || 'Sem nível alcançado';
    return o.NivelNome || '-';
  }

  /** "Ver a trilha": a moldura passa a mostrar a trilha do órgão (só para ler), a partir da visão geral. */
  verTrilha(o: PeConformidadeOrgao): void {
    this.estadoService.verOrgao(o.OrgaoId);
    this.router.navigate([BASE_PE]);
  }

  pagina(o: PeConformidadeOrgao): string {
    return rotaPaginaOrgao(o.OrgaoId);
  }

  situacao(o: PeConformidadeOrgao): string {
    return rotuloSituacaoDoOrgao(o.PdticSituacao);
  }

  classeSituacao(o: PeConformidadeOrgao): string {
    return classeSituacaoPdtic(o.PdticSituacao);
  }

  percentual(o: PeConformidadeOrgao): string {
    return textoPercentualConformidade(o);
  }

  grupo(o: PeConformidadeOrgao): GrupoConformidade | null {
    return grupoConformidade(o.Grupo);
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

  porOrgao(_: number, o: PeConformidadeOrgao): number {
    return o.OrgaoId;
  }
}
