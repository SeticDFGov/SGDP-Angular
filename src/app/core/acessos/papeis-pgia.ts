import { PapeisPgia } from '../../auth/services/auth';

/**
 * Papéis do PGIA como as telas de acesso os oferecem: a gestão de acessos e a
 * aprovação de um pedido de acesso ao PGIA. `null` = sem papel: a pessoa entra
 * como agente público (art. 13).
 */
export const OPCOES_PAPEL_PGIA: { valor: string | null; rotulo: string }[] = [
  { valor: null, rotulo: 'Agente público: registra uso de IA e avisa incidentes (art. 13)' },
  { valor: PapeisPgia.Orgao, rotulo: 'Órgão: Responsável de IA e equipe do órgão' },
  { valor: PapeisPgia.Sgdi, rotulo: 'SGDI: órgão central da política' },
  { valor: PapeisPgia.Cgtic, rotulo: 'CGTIC: secretaria do comitê' },
  { valor: PapeisPgia.Auditoria, rotulo: 'Auditoria externa' }
];

/** Nome curto do papel (a parte antes dos dois-pontos), para tabelas e resumos. */
export function rotuloCurtoPapelPgia(papel: string | null): string {
  const opcao = OPCOES_PAPEL_PGIA.find(o => o.valor === papel);
  return opcao ? opcao.rotulo.split(': ')[0] : (papel ?? '');
}
