import { NormaCitavel } from '../../core/citacao/cita-norma.directive';
import { DECRETO_48899 } from './decreto-48899-2026';

/**
 * Decreto nº 48.899/2026 (competências da SGDI) como norma citável. Entra como
 * norma secundária no `citaPlanejamento` (Governança Estratégica) e no `citaIn`
 * (Supervisão Contínua): a citação vira chip quando o nome do decreto vem logo
 * depois dela ("art. 7º, V, do Decreto nº 48.899/2026").
 *
 * Arquivo à parte, que só importa a transcrição deste decreto: a Supervisão
 * Contínua não carrega o texto dos outros decretos da Governança Estratégica.
 */
export const NORMA_DECRETO_48899: NormaCitavel = {
  titulo: 'Decreto nº 48.899/2026',
  rodape: 'Decreto nº 48.899, de 03 de julho de 2026 (competências da SGDI).',
  dispositivos: DECRETO_48899,
  // ", do Decreto nº 48.899/2026", " do Decreto n° 48.899", " do Decreto 48.899"
  nome: /^\s*,?\s*do\s+Decreto\s+(?:n\s*[º°o.]\s*)?48\.?899(?!\d)/,
  outrasNormas: /^\s*,?\s*(?:da|do|das|dos)\s+(?:LGPD|Lei|Leis|Constitui[çc][ãa]o|Decreto|Decretos|IN|Instru[çc][ãa]o|Portaria|Resolu[çc][ãa]o)\b/
};
