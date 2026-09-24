import { Directive } from '@angular/core';
import {
  CitaNormaDirective,
  DispositivoExibido,
  NormaCitavel,
  resolverCitacaoNorma
} from '../../core/citacao/cita-norma.directive';
import { IN_SGDI_01_2026 } from './in-sgdi-01-2026';
import { NORMA_DECRETO_48899 } from '../../planejamento/shared/norma-decreto-48899';

/**
 * Citações da Instrução Normativa SGDI nº 01/2026 (supervisão contínua das
 * contratações) viram chips com o trecho exato no hover, o mesmo mecanismo do
 * `citaDecreto` do PGIA (núcleo em `core/citacao/cita-norma.directive.ts`).
 *
 * Entra UMA vez no elemento-raiz de cada tela do módulo. Desde 2026-09-24 as
 * citações ao Decreto nº 48.899/2026 (que a IN regulamenta) também viram chip,
 * com o texto do decreto: ele é norma secundária desta diretiva e é reconhecido
 * pelo nome logo depois da citação ("art. 6º, IV, do Decreto nº 48.899/2026").
 * A transcrição mora na Governança Estratégica (`planejamento/shared`), num
 * chunk lazy. Citação de qualquer outro decreto continua como texto, e "art. 6º,
 * IV, do Decreto" nunca abre o art. 6º da IN.
 */

export const NORMA_IN_SGDI_01_2026: NormaCitavel = {
  titulo: 'IN SGDI nº 1/2026',
  rodape: 'Instrução Normativa SGDI nº 01, de 05 de agosto de 2026 (regulamenta o Decreto nº 48.899/2026).',
  dispositivos: IN_SGDI_01_2026,
  // A vírgula opcional cobre "art. 6º, IV, do Decreto nº 48.899/2026"
  outrasNormas: /^\s*,?\s*(?:da|do|das|dos)\s+(?:LGPD|Lei|Leis|Constitui[çc][ãa]o|Decreto)/
};

/** Resolve uma citação no texto da IN (função pura, para conferência à mão). */
export function resolverCitacaoIn(citacao: string): DispositivoExibido[] {
  return resolverCitacaoNorma(NORMA_IN_SGDI_01_2026, citacao);
}

@Directive({
  selector: '[citaIn]',
  standalone: true
})
export class CitaInDirective extends CitaNormaDirective {
  protected readonly norma = NORMA_IN_SGDI_01_2026;
  protected override readonly secundarias = [NORMA_DECRETO_48899];
}
