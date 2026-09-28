import { Directive } from '@angular/core';
import {
  CitaNormaDirective,
  DispositivoExibido,
  NormaCitavel,
  resolverCitacaoNorma
} from '../../core/citacao/cita-norma.directive';
import { DECRETO_48900 } from './decreto-48900-2026';
import { NORMA_DECRETO_48899 } from './norma-decreto-48899';
import { DECRETO_48901 } from '../../pgia/shared/decreto-48901';

/**
 * Dicas de norma da Governança Estratégica: citações viram chips com o texto do
 * dispositivo no hover, o mesmo mecanismo do PGIA e da Supervisão Contínua
 * (núcleo em `core/citacao/cita-norma.directive.ts`).
 *
 * - Norma padrão: Decreto nº 48.900/2026 (PGTIC/DF). Vale para a citação que
 *   não diz a norma ("art. 12, § 2º, I").
 * - Secundárias, pelo nome logo depois da citação: Decreto nº 48.899/2026
 *   ("art. 7º, V, do Decreto nº 48.899/2026") e Decreto nº 48.901/2026 (PGIA,
 *   transcrição do PGIA reaproveitada, só os dados).
 * - Formas amplas ligadas: "art. 8º, §§ 1º e 2º", "art. 12, § 2º, V, VI e IX" e
 *   "art. 12, § 1º, e § 2º, IV".
 *
 * Entra UMA vez no elemento-raiz de cada tela do módulo e na seção da trilha da
 * moldura, nunca num elemento que contenha o `router-outlet` (os chips sairiam
 * duplicados).
 */

const OUTRAS_NORMAS = /^\s*,?\s*(?:da|do|das|dos)\s+(?:LGPD|Lei|Leis|Constitui[çc][ãa]o|Decreto|Decretos|IN|Instru[çc][ãa]o|Portaria|Resolu[çc][ãa]o)\b/;

export const NORMA_DECRETO_48900: NormaCitavel = {
  titulo: 'Decreto nº 48.900/2026',
  rodape: 'Decreto nº 48.900, de 03 de julho de 2026 (Política de Governança de TIC do Distrito Federal).',
  dispositivos: DECRETO_48900,
  // A própria norma padrão citada pelo nome também abre o texto dela
  nome: /^\s*,?\s*do\s+Decreto\s+(?:n\s*[º°o.]\s*)?48\.?900(?!\d)/,
  outrasNormas: OUTRAS_NORMAS
};

export const NORMA_DECRETO_48901_SECUNDARIA: NormaCitavel = {
  titulo: 'Decreto nº 48.901/2026',
  rodape: 'Decreto nº 48.901, de 03 de julho de 2026.',
  dispositivos: DECRETO_48901,
  nome: /^\s*,?\s*do\s+Decreto\s+(?:n\s*[º°o.]\s*)?48\.?901(?!\d)/,
  outrasNormas: OUTRAS_NORMAS
};

const SECUNDARIAS: readonly NormaCitavel[] = [NORMA_DECRETO_48899, NORMA_DECRETO_48901_SECUNDARIA];

/**
 * Resolve uma citação como a tela faria (função pura, para conferência à mão):
 * o texto que vem depois da citação escolhe a norma.
 */
export function resolverCitacaoPlanejamento(citacao: string, depois = ''): DispositivoExibido[] {
  const norma = SECUNDARIAS.find(n => n.nome?.test(depois)) ?? NORMA_DECRETO_48900;
  return resolverCitacaoNorma(norma, citacao);
}

@Directive({
  selector: '[citaPlanejamento]',
  standalone: true
})
export class CitaPlanejamentoDirective extends CitaNormaDirective {
  protected readonly norma = NORMA_DECRETO_48900;
  protected override readonly secundarias = SECUNDARIAS;
  protected override readonly formasAmplas = true;
}
