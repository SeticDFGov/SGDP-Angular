import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import {
  PeArvoreMeta, PeArvoreNecessidade, PeArvoreObjetivo, PeArvoreOrgao, PeArvorePetic, PeOrgaoNivel
} from '../../../api/planejamento/interface';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import { idDoParametro, orgaosEmOrdem } from '../shared/pe-paineis-rotulos';
import { textoData } from '../shared/registros/pe-valores';
import { PePaineisService } from '../services/pe-paineis.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { BASE_PE, rotaPaginaOrgao } from '../trilha/pe-trilhas';

/**
 * Árvore do PETIC-DF (E8; passo 4.2 do administrador e 1.2 da SGDI): os objetivos
 * estratégicos do PETIC-DF vigente, cada um com os indicadores do próprio PETIC e,
 * por órgão, as necessidades e as metas que o PDTIC ligou a ele (GET
 * petic/arvore). Como no mock: o objetivo abre e fecha (botão dentro do título,
 * com `aria-expanded`), e o filtro por órgão fica no endereço (`?orgao=`, vai ao
 * servidor como `orgaoId`).
 *
 * Estados: sem PETIC-DF vigente (com o link para o PETIC-DF), PETIC sem objetivos,
 * objetivo sem órgão ligado (e, com o filtro, o órgão sem nada ligado); falha de
 * carregamento como mensagem na tela. Papel de órgão vê um aviso e a tela não
 * consulta nada (o 403 tiraria a pessoa do módulo).
 */
@Component({
  selector: 'app-pe-arvore-petic',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaPlanejamentoDirective],
  templateUrl: './pe-arvore-petic.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeArvorePeticComponent implements OnInit {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly paineisService = inject(PePaineisService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly base = BASE_PE;

  podeVer: boolean | null = null;
  erroPapel = false;
  paginaDoMeuOrgao: string | null = null;
  private iniciado = false;

  dados: PeArvorePetic | null = null;
  carregando = false;
  erro: string | null = null;
  private carga?: Subscription;

  /** O órgão do filtro (o do endereço) e o da lista. */
  orgao: number | null = null;
  orgaoEscolhido = '';
  orgaos: PeOrgaoNivel[] = [];
  /** O que o filtro mostra ("SES · Secretaria de Estado de Saúde"). */
  nomeOrgao = '';

  private abertos = new Set<number>();
  /** Totais do órgão do filtro, somados dos objetivos. */
  totalNecessidadesOrgao = 0;
  totalMetasOrgao = 0;

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
            .subscribe(orgaos => {
              this.orgaos = orgaosEmOrdem(orgaos ?? []);
              this.nomeOrgao = this.descreverOrgao();
            });
          this.rota.queryParamMap
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(params => this.lerFiltro(idDoParametro(params.get('orgao'))));
        }
      });
  }

  tentarPapelDeNovo(): void {
    this.estadoService.iniciar();
  }

  private lerFiltro(orgao: number | null): void {
    const mudou = orgao !== this.orgao || !this.dados;
    this.orgao = orgao;
    this.orgaoEscolhido = orgao !== null ? String(orgao) : '';
    this.nomeOrgao = this.descreverOrgao();
    if (mudou) this.carregar();
  }

  private descreverOrgao(): string {
    if (this.orgao === null) return '';
    const o = this.orgaos.find(x => x.OrgaoId === this.orgao);
    return o ? `${o.Sigla} · ${o.Nome}` : 'o órgão escolhido';
  }

  /** A escolha na lista vale na hora (vai para o endereço, sem entrar no histórico). */
  escolherOrgao(): void {
    const orgao = idDoParametro(this.orgaoEscolhido);
    if (orgao === this.orgao) return;
    this.router.navigate([], {
      relativeTo: this.rota, queryParams: { orgao: orgao !== null ? String(orgao) : null }, queryParamsHandling: 'merge', replaceUrl: true
    });
  }

  limparFiltro(): void {
    this.orgaoEscolhido = '';
    this.escolherOrgao();
  }

  carregar(): void {
    const orgao = this.orgao;
    this.carga?.unsubscribe();
    this.carregando = true;
    this.erro = null;
    this.carga = this.paineisService.arvore(orgao).subscribe({
      next: dados => {
        this.carregando = false;
        const objetivos = (dados?.Objetivos ?? []).map(o => ({
          ...o,
          Indicadores: o.Indicadores ?? [],
          Orgaos: orgaosEmOrdem((o.Orgaos ?? []).map(x => ({ ...x, Necessidades: x.Necessidades ?? [], Metas: x.Metas ?? [] })))
        }));
        this.dados = { Petic: dados?.Petic ?? null, Objetivos: objetivos };
        this.totalNecessidadesOrgao = 0;
        this.totalMetasOrgao = 0;
        if (orgao !== null) {
          for (const o of objetivos) {
            for (const x of o.Orgaos.filter(y => y.OrgaoId === orgao)) {
              this.totalNecessidadesOrgao += x.Necessidades.length;
              this.totalMetasOrgao += x.Metas.length;
            }
          }
          // Com o filtro, os objetivos que têm algo do órgão já abrem
          this.abertos = new Set(objetivos.filter(o => o.Orgaos.some(y => y.OrgaoId === orgao)).map(o => o.RegistroId));
        }
      },
      error: erro => {
        this.carregando = false;
        // 403: o interceptor já tirou a pessoa do módulo
        const mensagem = mensagemErroPe(erro, 'Não foi possível carregar a árvore do PETIC-DF. Tente de novo.');
        if (mensagem !== null) this.erro = mensagem;
      }
    });
  }

  // ── Abrir e fechar ────────────────────────────────────────────────────────

  aberto(o: PeArvoreObjetivo): boolean {
    return this.abertos.has(o.RegistroId);
  }

  alternar(o: PeArvoreObjetivo): void {
    if (this.abertos.has(o.RegistroId)) this.abertos.delete(o.RegistroId);
    else this.abertos.add(o.RegistroId);
  }

  abrirTodos(): void {
    this.abertos = new Set((this.dados?.Objetivos ?? []).map(o => o.RegistroId));
  }

  fecharTodos(): void {
    this.abertos = new Set();
  }

  get todosAbertos(): boolean {
    const objetivos = this.dados?.Objetivos ?? [];
    return objetivos.length > 0 && objetivos.every(o => this.abertos.has(o.RegistroId));
  }

  // ── Textos ────────────────────────────────────────────────────────────────

  contagem(o: PeArvoreObjetivo): string {
    const n = o.TotalNecessidades ?? 0;
    const m = o.TotalMetas ?? 0;
    return `${n} ${n === 1 ? 'necessidade' : 'necessidades'} · ${m} ${m === 1 ? 'meta' : 'metas'}`;
  }

  titulo(o: PeArvoreObjetivo): string {
    return [o.Codigo, o.Texto].filter(Boolean).join(' · ') || 'Objetivo sem texto';
  }

  prazo(m: PeArvoreMeta): string {
    return m.Prazo ? textoData(m.Prazo) : '-';
  }

  priorizada(n: PeArvoreNecessidade): string {
    if (n.Priorizada === true) return 'Priorizada';
    if (n.Priorizada === false) return 'Não priorizada';
    return '';
  }

  pagina(x: PeArvoreOrgao): string {
    return rotaPaginaOrgao(x.OrgaoId);
  }

  idConteudo(o: PeArvoreObjetivo): string {
    return `pe-arvore-objetivo-${o.RegistroId}`;
  }

  porObjetivo(_: number, o: PeArvoreObjetivo): number {
    return o.RegistroId;
  }

  porOrgao(_: number, x: { OrgaoId: number }): number {
    return x.OrgaoId;
  }

  porIndice(i: number): number {
    return i;
  }
}
