import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PeFormatoPlanilha, PeModelo, PePassoModelo, PeSecaoModelo } from '../../../api/planejamento/interface';
import { NotificationService } from '../../core/services/notification.service';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import { mensagemErroDownload, salvarResposta } from '../shared/pe-download';
import { modeloOrdenado } from '../shared/pe-modelo-arvore';
import { PeModeloService } from '../services/pe-modelo.service';
import { PePdticService } from '../services/pe-pdtic.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';

interface SecaoConsolidada {
  chave: string;
  titulo: string;
  passo: string;
  tabela: boolean;
  /** Título, passo e chave sem acento e em minúsculas, para a busca. */
  busca: string;
}

interface EtapaConsolidada {
  chave: string;
  titulo: string;
  secoes: SecaoConsolidada[];
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Visível em algum nível (a planilha consolidada junta os campos de todos os níveis). */
function ligadoEmAlgumNivel(item: PePassoModelo | PeSecaoModelo): boolean {
  return Object.values(item.Niveis ?? {}).some(s => s !== 'desligado');
}

/**
 * Planilhas consolidadas (passo 5.1 do administrador do módulo e 4.1 da equipe da
 * SGDI; a Secretaria do CGTIC e o admin do SGDP também baixam): cada seção do
 * PDTIC com os registros de todos os PDTICs atuais, com as colunas do órgão,
 * sigla, nível, versão e situação do PDTIC antes dos campos (a união dos campos
 * de todos os níveis). É a base do portfólio estratégico de TIC do GDF (art. 9º,
 * V, do Decreto nº 48.899/2026).
 *
 * As seções saem do modelo (GET modelo: seções do PDTIC não apagadas, marcadas
 * "na planilha" e ligadas em algum nível). Papel de órgão vê um aviso e a tela
 * não consulta nada (o 403 tiraria a pessoa do módulo).
 */
@Component({
  selector: 'app-pe-consolidado',
  standalone: true,
  imports: [CommonModule, FormsModule, CitaPlanejamentoDirective],
  templateUrl: './pe-consolidado.component.html'
})
export class PeConsolidadoComponent implements OnInit {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly modeloService = inject(PeModeloService);
  private readonly pdticService = inject(PePdticService);
  private readonly notificacoes = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  /** Papéis globais e admin do SGDP; null enquanto o papel não chegou. */
  podeVer: boolean | null = null;
  erroPapel = false;
  iniciado = false;

  etapas: EtapaConsolidada[] = [];
  carregando = false;
  erro: string | null = null;
  busca = '';
  /** O que está sendo baixado ("necessidades:xlsx" ou "completa"). */
  baixando: string | null = null;

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        if (!estado || estado.carga !== 'pronta') return;
        this.erroPapel = estado.consultaPapel === 'erro';
        this.podeVer = this.estadoService.veDeliberacoes;
        if (this.podeVer && !this.iniciado) {
          this.iniciado = true;
          this.carregar();
        }
      });
  }

  tentarPapelDeNovo(): void {
    this.estadoService.iniciar();
  }

  carregar(): void {
    this.carregando = true;
    this.erro = null;
    this.modeloService.modelo().subscribe({
      next: modelo => {
        this.carregando = false;
        this.etapas = this.montar(modelo);
      },
      error: erro => {
        this.carregando = false;
        this.erro = mensagemErroPe(erro, 'Não foi possível carregar as seções do PDTIC.');
      }
    });
  }

  private montar(bruto: PeModelo): EtapaConsolidada[] {
    const modelo = modeloOrdenado(bruto);
    return modelo.Etapas.map(etapa => ({
      chave: etapa.Chave,
      titulo: etapa.Titulo,
      secoes: etapa.Passos
        .filter(p => !p.Excluido && ligadoEmAlgumNivel(p))
        .flatMap(p => p.Secoes
          .filter(s => !s.Excluido && s.NaPlanilha && ligadoEmAlgumNivel(s))
          .map(s => ({
            chave: s.Chave,
            titulo: s.Titulo,
            passo: p.Titulo,
            tabela: s.Tipo === 'tabela',
            busca: normalizar(`${s.Titulo} ${p.Titulo} ${s.Chave}`)
          })))
    })).filter(e => e.secoes.length > 0);
  }

  get filtradas(): EtapaConsolidada[] {
    const termo = normalizar(this.busca.trim());
    if (!termo) return this.etapas;
    return this.etapas
      .map(e => ({ ...e, secoes: e.secoes.filter(s => s.busca.includes(termo)) }))
      .filter(e => e.secoes.length > 0);
  }

  get totalFiltradas(): number {
    return this.filtradas.reduce((soma, e) => soma + e.secoes.length, 0);
  }

  porChave(_: number, item: { chave: string }): string {
    return item.chave;
  }

  baixar(secao: SecaoConsolidada, formato: PeFormatoPlanilha): void {
    if (this.baixando) return;
    this.baixando = `${secao.chave}:${formato}`;
    this.pdticService.consolidado(secao.chave, formato).subscribe({
      next: resposta => {
        this.baixando = null;
        salvarResposta(resposta, `PDTIC_consolidado_${secao.chave}.${formato}`);
      },
      error: erro => {
        this.baixando = null;
        mensagemErroDownload(erro, 'Não foi possível gerar a planilha consolidada. Tente de novo.').then(m => {
          if (m) this.notificacoes.error(m);
        });
      }
    });
  }

  baixarCompleta(): void {
    if (this.baixando) return;
    this.baixando = 'completa';
    this.pdticService.consolidadoCompleto().subscribe({
      next: resposta => {
        this.baixando = null;
        salvarResposta(resposta, 'PDTIC_consolidado.xlsx');
      },
      error: erro => {
        this.baixando = null;
        mensagemErroDownload(erro, 'Não foi possível gerar a planilha consolidada. Tente de novo.').then(m => {
          if (m) this.notificacoes.error(m);
        });
      }
    });
  }
}
