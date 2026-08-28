import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PESOS_QUESITOS, PgiaClassificacao } from '../../../api/pgia/interface';
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
}

/**
 * Questionário aberto: mostra os quesitos marcados agrupados por artigo, com o peso
 * de cada um e a pontuação total. Só é usado nas telas centrais (SGDI e CGTIC) —
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
    15: 'Art. 15 — usos proibidos',
    16: 'Art. 16 — Alto Risco',
    17: 'Art. 17 — Risco Moderado'
  };

  private peso(artigo: number, inciso: string): number {
    return PESOS_QUESITOS.find(p => p.Artigo === artigo && p.Inciso === inciso)?.Peso ?? 0;
  }

  private montar(): void {
    const c = this._classificacao;
    if (!c || !c.Checklist) {
      this.grupos = [];
      this.pontuacao = null;
      this.pontuacaoCalculada = false;
      return;
    }
    const porArtigo: { artigo: 15 | 16 | 17; incisos: string[] }[] = [
      { artigo: 15, incisos: c.Checklist.Q15 ?? [] },
      { artigo: 16, incisos: c.Checklist.Q16 ?? [] },
      { artigo: 17, incisos: c.Checklist.Q17 ?? [] }
    ];

    this.grupos = porArtigo
      .filter(g => g.incisos.length > 0)
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
          subtotal: linhas.reduce((soma, l) => soma + l.peso, 0)
        };
      });

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
