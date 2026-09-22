import { Directive } from '@angular/core';
import {
  CitaNormaDirective,
  DispositivoExibido,
  NormaCitavel,
  resolverCitacaoNorma
} from '../../core/citacao/cita-norma.directive';
import { DECRETO_48901 } from './decreto-48901';

/**
 * Citações do Decreto nº 48.901/2026 (PGIA) viram chips com o texto do
 * dispositivo no hover. O mecanismo (varredura dos textos, chips, painel
 * flutuante) mora em `core/citacao/cita-norma.directive.ts` desde 2026-09-22,
 * compartilhado com o `citaIn` da Supervisão Contínua; aqui fica só o que é do
 * decreto. O texto do decreto continua exclusivo dos chunks do PGIA.
 *
 * Entra UMA vez no elemento-raiz de cada tela do PGIA e da `/transparencia-ia`.
 */

export { REGEX_CITACAO, analisarCitacao } from '../../core/citacao/cita-norma.directive';
export type { DispositivoExibido } from '../../core/citacao/cita-norma.directive';

export const NORMA_DECRETO_48901: NormaCitavel = {
  titulo: 'Decreto nº 48.901/2026',
  rodape: 'Decreto nº 48.901, de 03 de julho de 2026.',
  dispositivos: DECRETO_48901,
  /** Citações de outras normas não viram chip. */
  outrasNormas: /^\s*(?:da|do|das|dos)\s+(?:LGPD|Lei|Leis|Constitui[çc][ãa]o)/
};

/** Resolve uma citação no texto do decreto (função pura, para conferência à mão). */
export function resolverCitacao(citacao: string): DispositivoExibido[] {
  return resolverCitacaoNorma(NORMA_DECRETO_48901, citacao);
}

@Directive({
  selector: '[citaDecreto]',
  standalone: true
})
export class CitaDecretoDirective extends CitaNormaDirective {
  protected readonly norma = NORMA_DECRETO_48901;
}
