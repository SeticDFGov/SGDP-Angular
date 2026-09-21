import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CONSEQUENCIAS_CGDF,
  MATRIZ_RISCO_CGDF,
  PESOS_QUESITOS,
  PROBABILIDADES_CGDF,
  PgiaClassificacao,
  PgiaRiscoOutro
} from '../../../api/pgia/interface';
import { ROMANOS, textoDoQuesito } from '../sistemas/quesitos';

interface LinhaQuesito {
  inciso: string;
  texto: string;
  peso: number;
}

interface GrupoQuesitos {
  titulo: string;
  linhas: LinhaQuesito[];
  subtotal: number;
  /** O órgão respondeu "Nenhuma das alternativas acima" neste grupo. */
  nenhuma: boolean;
  /** Sem incisos e sem "nenhuma": classificação anterior ao questionário agrupado. */
  naoRespondido: boolean;
}

/**
 * Questionário aberto: mostra os quesitos marcados agrupados por artigo, com o peso
 * de cada um e a pontuação total. Só é usado nas telas centrais (SGDI e CGTIC);
 * a tela do órgão nunca revela o enquadramento durante o preenchimento.
 */
@Component({
  selector: 'app-pgia-checklist-aberto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pgia-checklist-aberto.component.html'
})
export class PgiaChecklistAbertoComponent {
  private _classificacao: PgiaClassificacao | null = null;
  grupos: GrupoQuesitos[] = [];
  /** Riscos que o próprio órgão declarou no grupo "Outros" (matriz CGDF). */
  outrosRiscos: PgiaRiscoOutro[] = [];
  pontuacao: number | null = null;
  /** Verdadeiro quando o total foi somado no front por falta do campo na resposta. */
  pontuacaoCalculada = false;

  @Input() set classificacao(valor: PgiaClassificacao | null) {
    this._classificacao = valor;
    this.montar();
  }
  get classificacao(): PgiaClassificacao | null {
    return this._classificacao;
  }

  private static readonly TITULOS: Record<number, string> = {
    15: 'Art. 15: usos proibidos',
    16: 'Art. 16: Alto Risco',
    17: 'Art. 17: Risco Moderado'
  };

  /** Cor da célula da matriz da CGDF para o par probabilidade × consequência. */
  corDoRisco(risco: PgiaRiscoOutro): string {
    const coluna = (PROBABILIDADES_CGDF as readonly string[]).indexOf(risco.Probabilidade);
    // As linhas da matriz vão da Catastrófica à Desprezível.
    const posConsequencia = (CONSEQUENCIAS_CGDF as readonly string[]).indexOf(risco.Consequencia);
    const linha = posConsequencia < 0 ? -1 : CONSEQUENCIAS_CGDF.length - 1 - posConsequencia;
    if (coluna < 0 || linha < 0 || linha >= MATRIZ_RISCO_CGDF.length) return 'bg-gray-100 text-gray-700';
    switch (MATRIZ_RISCO_CGDF[linha][coluna]) {
      case 'v': return 'bg-green-500 text-white';
      case 'a': return 'bg-yellow-300 text-gray-900';
      case 'l': return 'bg-orange-400 text-gray-900';
      default: return 'bg-red-500 text-white';
    }
  }

  private peso(artigo: number, inciso: string): number {
    return PESOS_QUESITOS.find(p => p.Artigo === artigo && p.Inciso === inciso)?.Peso ?? 0;
  }

  private montar(): void {
    const c = this._classificacao;
    if (!c || !c.Checklist) {
      this.grupos = [];
      this.outrosRiscos = [];
      this.pontuacao = null;
      this.pontuacaoCalculada = false;
      return;
    }
    const porArtigo: { artigo: 15 | 16 | 17; incisos: string[]; nenhuma: boolean }[] = [
      { artigo: 15, incisos: c.Checklist.Q15 ?? [], nenhuma: !!c.Checklist.Q15Nenhuma },
      { artigo: 16, incisos: c.Checklist.Q16 ?? [], nenhuma: !!c.Checklist.Q16Nenhuma },
      { artigo: 17, incisos: c.Checklist.Q17 ?? [], nenhuma: !!c.Checklist.Q17Nenhuma }
    ];

    // Sempre os três grupos: "nenhuma" explícito é informação, e classificação
    // anterior ao questionário agrupado (sem incisos e sem "nenhuma") precisa
    // se distinguir de "não se aplica" para quem audita na SGDI.
    this.grupos = porArtigo
      .map(g => {
        const linhas = [...g.incisos]
          .sort((a, b) => ROMANOS.indexOf(a) - ROMANOS.indexOf(b))
          .map(inciso => ({
            inciso,
            texto: textoDoQuesito(g.artigo, inciso),
            peso: this.peso(g.artigo, inciso)
          }));
        return {
          titulo: PgiaChecklistAbertoComponent.TITULOS[g.artigo],
          linhas,
          subtotal: linhas.reduce((soma, l) => soma + l.peso, 0),
          nenhuma: g.nenhuma,
          naoRespondido: g.incisos.length === 0 && !g.nenhuma
        };
      });

    this.outrosRiscos = c.OutrosRiscos ?? [];

    // O servidor devolve a pontuação apenas para SGDI, CGTIC e admin.
    // Sem ela, soma-se pela matriz de pesos para não deixar a tela sem o total.
    if (c.Pontuacao !== null && c.Pontuacao !== undefined) {
      this.pontuacao = c.Pontuacao;
      this.pontuacaoCalculada = false;
    } else {
      this.pontuacao = this.grupos.reduce((soma, g) => soma + g.subtotal, 0);
      this.pontuacaoCalculada = true;
    }
  }
}
