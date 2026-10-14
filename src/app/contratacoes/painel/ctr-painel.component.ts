import { Component, OnInit, inject } from '@angular/core';
import { CitaInDirective } from '../shared/cita-in.directive';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Params, RouterModule } from '@angular/router';
import { CtrProcessoService } from '../services/ctr-processo.service';
import { SECAO_LISTA_ANTERIORES, parametrosDaLista } from '../shared/ctr-filtro-lista';
import {
  badgeCriticidade,
  badgeNivelRisco,
  badgeSituacao,
  corDiasSemMovimento
} from '../shared/ctr-rotulos';
import {
  CtrContagem,
  CtrPainel,
  CtrPainelHistoricos,
  CtrProcessoFiltro,
  SITUACAO_CONTRATO_ASSINADO,
  TIPO_CONTRATACAO_NAO_INFORMADO
} from '../../../api/contratacoes/interface';
import { NotificationService } from '../../core/services/notification.service';
import { CtrIncorporarComponent } from '../publico/ctr-incorporar.component';
import { CAMINHO_PAINEL_PUBLICO, copiarTexto } from '../publico/painel-publico';

/**
 * Painel da área: contagens por situação, maior risco da contratação, categoria
 * e órgão, a relação dos contratos assinados, tempos médios entre as instâncias e a
 * lista de processos parados (gargalos), só da supervisão contínua; e, à parte, o
 * bloco das contratações anteriores ao regime (registros históricos). Cada contagem
 * abre a lista já filtrada.
 *
 * Os números vêm prontos do backend, sobre os mesmos processos ativos da
 * listagem; nada é recalculado aqui.
 */
@Component({
  selector: 'app-ctr-painel',
  standalone: true,
  imports: [CitaInDirective, CommonModule, FormsModule, RouterModule, CtrIncorporarComponent],
  templateUrl: './ctr-painel.component.html'
})
export class CtrPainelComponent implements OnInit {
  painel: CtrPainel | null = null;
  carregando = true;
  /** Falha de carregamento vira mensagem na própria página, não toast. */
  erroCarregar: string | null = null;

  /** Limite de dias sem movimento que define o gargalo. */
  limiteDias = 15;

  badgeSituacao = badgeSituacao;
  badgeCriticidade = badgeCriticidade;
  badgeNivelRisco = badgeNivelRisco;
  corDiasSemMovimento = corDiasSemMovimento;

  // ── Aviso do painel público (/transparencia-contratacoes) ─────────────────
  private readonly documento = inject(DOCUMENT);
  private readonly notificacoes = inject(NotificationService);
  readonly caminhoPainelPublico = CAMINHO_PAINEL_PUBLICO;
  /** O endereço como aparece no aviso: o host deste site (produção ou homologação). */
  readonly enderecoPainelPublico = (this.documento.location?.host ?? '') + CAMINHO_PAINEL_PUBLICO;
  incorporarAberto = false;

  constructor(private processoService: CtrProcessoService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    // Campo vazio manda `diasSemMovimento=null` e o backend responde 400: o
    // valor é saneado aqui e volta para a tela já corrigido.
    this.limiteDias = Math.min(365, Math.max(1, this.limiteDias || 15));
    this.carregando = true;
    this.erroCarregar = null;
    this.processoService.getPainel(this.limiteDias).subscribe({
      next: painel => {
        this.painel = painel;
        this.limiteDias = painel.LimiteDias ?? this.limiteDias;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        this.erroCarregar = 'Não foi possível carregar o painel. Tente de novo em instantes.';
      }
    });
  }

  /**
   * Baixo, Médio, Alto, Extremo + "Sem riscos declarados", sempre presentes, na
   * ordem do servidor (quantidade desc, empate pela ordem do domínio).
   */
  get porNivelRiscoDeclarado(): CtrContagem[] {
    return this.painel?.PorNivelRiscoDeclarado ?? [];
  }

  /**
   * Nova contratação, alteração de contratação vigente e "Não informado", sempre
   * presentes, na ordem do servidor (quantidade desc, empate pela ordem do domínio).
   */
  get porTipoContratacao(): CtrContagem[] {
    return this.painel?.PorTipoContratacao ?? [];
  }

  readonly tipoNaoInformado = TIPO_CONTRATACAO_NAO_INFORMADO;
  readonly contratoAssinado = SITUACAO_CONTRATO_ASSINADO;
  /** A sub-aba dos registros históricos, para onde o bloco deles leva. */
  readonly rotaAnteriores = `/analises/processos/${SECAO_LISTA_ANTERIORES}`;

  private static readonly semHistoricos: CtrPainelHistoricos = { Total: 0, PorCategoria: [], PorOrgao: [] };

  /**
   * O bloco das contratações anteriores ao regime (registros históricos). Sem ele na
   * resposta (servidor anterior), o bloco mostra zero.
   */
  get historicos(): CtrPainelHistoricos {
    return this.painel?.Historicos ?? CtrPainelComponent.semHistoricos;
  }

  /** Parte do total, em porcentagem inteira ("0%" sem processos). */
  percentual(quantidade: number, total: number): string {
    if (!total) return '0%';
    return `${Math.round((quantidade / total) * 100)}%`;
  }

  /** Links já montados, um por filtro (ver `lista`). */
  private readonly links = new Map<string, Params>();

  /**
   * Parâmetros da lista de processos já filtrada pela contagem clicada. Devolve
   * sempre o MESMO objeto para o mesmo filtro: um objeto novo a cada detecção de
   * mudanças faria o `[queryParams]` mudar sem parar (NG0100 em desenvolvimento).
   */
  lista(filtro: CtrProcessoFiltro): Params {
    const chave = JSON.stringify(filtro);
    let params = this.links.get(chave);
    if (!params) {
      params = parametrosDaLista(filtro);
      this.links.set(chave, params);
    }
    return params;
  }

  async copiarLinkPublico(): Promise<void> {
    const endereco = (this.documento.location?.origin ?? '') + CAMINHO_PAINEL_PUBLICO;
    if (await copiarTexto(endereco)) this.notificacoes.success('Link copiado.', 3000);
    else this.notificacoes.warning('Não foi possível copiar. Selecione o endereço e copie com Ctrl+C.');
  }

  /** Tempo médio em dias, com um decimal; sem amostra mostra "-". */
  media(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '-';
    return `${(Math.round(valor * 10) / 10).toLocaleString('pt-BR')} dia(s)`;
  }

  /** Largura da barra proporcional ao maior valor da lista. */
  proporcao(quantidade: number, lista: { Quantidade: number }[]): number {
    const maior = lista.reduce((max, item) => Math.max(max, item.Quantidade), 0);
    if (maior <= 0) return 0;
    return Math.round((quantidade / maior) * 100);
  }
}
