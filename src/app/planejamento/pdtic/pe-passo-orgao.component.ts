import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { PeCampoTrilha, PePassoTrilha, PeSecaoTrilha } from '../../../api/planejamento/interface';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { NomesDoModelo, citacaoTravado, descricaoCampo, rotuloTipoPasso } from '../shared/pe-modelo-rotulos';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { BASE_PE, PassoNumeradoPe, TITULO_PASSO_GENERICO, passoDaUrl, rotuloGuia } from '../trilha/pe-trilhas';

/**
 * Tela de um passo da trilha do órgão (/planejamento/pdtic/{chave}), lida da
 * trilha resolvida pelo back-end (nível do órgão e ajustes).
 *
 * - Passo de dados: mostra, só para ler, as seções e os campos que o passo vai
 *   pedir, com os obrigatórios marcados, e avisa que o preenchimento chega numa
 *   próxima etapa do desenvolvimento.
 * - Os demais tipos (documento, fluxo, aprovação...): "em construção".
 *
 * A mesma instância serve a todos os passos (a rota tem parâmetro). Passo que não
 * está na trilha à vista (link antigo, outro nível) volta para a visão geral.
 */
@Component({
  selector: 'app-pe-passo-orgao',
  standalone: true,
  imports: [CommonModule, RouterModule, CitaPlanejamentoDirective],
  templateUrl: './pe-passo-orgao.component.html'
})
export class PePassoOrgaoComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly titulo = inject(Title);
  private readonly destroyRef = inject(DestroyRef);
  private readonly estadoService = inject(PeTrilhaEstadoService);

  readonly base = BASE_PE;

  numerado: PassoNumeradoPe | null = null;
  passo: PePassoTrilha | null = null;
  siglaOrgao = '';
  nomeNivel = '';

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ler());
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ler());
  }

  get guia(): string {
    return rotuloGuia(this.passo?.ReferenciaGuia ?? undefined);
  }

  get tipoComPrevia(): boolean {
    return this.passo?.Tipo === 'dados';
  }

  get rotuloTipo(): string {
    return rotuloTipoPasso(this.passo?.Tipo);
  }

  get citacaoTravado(): string {
    return citacaoTravado(this.passo?.IncisoDecreto);
  }

  /** O órgão pode marcar "não se aplica" (a partir da próxima entrega): passo opcional que aceita. */
  get aceitaNaoSeAplica(): boolean {
    const p = this.passo;
    return !!p && p.AceitaNaoSeAplica && p.Situacao === 'opcional' && !p.Travado;
  }

  obrigatorios(secao: PeSecaoTrilha): number {
    return secao.Campos.filter(c => c.Obrigatorio).length;
  }

  descricao(campo: PeCampoTrilha, secao: PeSecaoTrilha): string {
    return descricaoCampo(campo, this.nomes(secao));
  }

  porId(_: number, item: { Id: number }): number {
    return item.Id;
  }

  /** Nomes das seções ligadas e dos campos do cálculo, procurados na trilha do órgão. */
  private nomes(secao: PeSecaoTrilha): NomesDoModelo {
    const trilha = this.estadoService.atual?.trilhaOrgao;
    const secoes = trilha?.Etapas.flatMap(e => e.Passos.flatMap(p => p.Secoes)) ?? [];
    return {
      secao: chave => secoes.find(s => s.Chave === chave)?.Titulo ?? null,
      campo: chave => secao.Campos.find(c => c.Chave === chave)?.Rotulo
        ?? secoes.flatMap(s => s.Campos).find(c => c.Chave === chave)?.Rotulo ?? null
    };
  }

  private ler(): void {
    const estado = this.estadoService.atual;
    // Trocando de trilha: a moldura tira a tela do ar; nada a fazer aqui
    if (!estado || estado.carga !== 'pronta') return;

    this.numerado = passoDaUrl(estado.passos, this.router.url);
    this.passo = this.numerado?.doOrgao ?? null;
    this.siglaOrgao = estado.trilhaOrgao?.OrgaoSigla ?? '';
    this.nomeNivel = estado.trilhaOrgao?.NivelNome ?? '';

    if (!this.passo) {
      // Passo que não está nesta trilha: volta para a visão geral
      this.router.navigate([BASE_PE], { replaceUrl: true });
      return;
    }
    // Entrada direta pelo endereço: a aba nasceu com o título genérico
    const atual = this.titulo.getTitle();
    if (atual.startsWith(TITULO_PASSO_GENERICO)) {
      this.titulo.setTitle(this.passo.Titulo + atual.slice(TITULO_PASSO_GENERICO.length));
    }
  }
}
