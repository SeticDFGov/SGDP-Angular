/**
 * Papéis da Governança Estratégica (módulo `planejamento`). Mesmos códigos do
 * back-end (`app/Auth/PapeisPlanejamento.cs`). O papel fica em `pe_papel_usuario`
 * e chega ao front por GET api/planejamento/meu-papel, nunca pelo /me.
 *
 * Fonte única dos rótulos: tela inicial, pedidos de acesso, Gestão de acessos,
 * Pessoas e acessos do módulo e modo local usam daqui. O perfil admin do SGDP tem
 * tudo no módulo sem precisar de papel.
 */
export const PapeisPlanejamento = {
  Admin: 'pe_admin',
  Sgdi: 'pe_sgdi',
  Cgtic: 'pe_cgtic',
  Orgao: 'pe_orgao',
  OrgaoConsulta: 'pe_orgao_consulta'
} as const;

/** Os cinco papéis como as telas de acesso os oferecem (rótulo curto antes dos dois-pontos). */
export const OPCOES_PAPEL_PLANEJAMENTO: { valor: string; rotulo: string }[] = [
  { valor: PapeisPlanejamento.Admin, rotulo: 'Administrador do módulo: configura, dá acesso e acompanha todos os órgãos' },
  { valor: PapeisPlanejamento.Sgdi, rotulo: 'Equipe da SGDI: acompanha e analisa os PDTICs de todos os órgãos' },
  { valor: PapeisPlanejamento.Cgtic, rotulo: 'Secretaria do CGTIC: registra as deliberações do comitê' },
  { valor: PapeisPlanejamento.Orgao, rotulo: 'Equipe do órgão: elabora e acompanha o PDTIC do próprio órgão' },
  { valor: PapeisPlanejamento.OrgaoConsulta, rotulo: 'Consulta do órgão: só lê o PDTIC do próprio órgão' }
];

/** Nome curto do papel (a parte antes dos dois-pontos), para tabelas e resumos. */
export function rotuloCurtoPapelPlanejamento(papel: string | null | undefined): string {
  const opcao = OPCOES_PAPEL_PLANEJAMENTO.find(o => o.valor === papel);
  return opcao ? opcao.rotulo.split(': ')[0] : (papel ?? '');
}

/** Papéis que só enxergam o próprio órgão: precisam de unidade ligada a um órgão. */
export function papelPlanejamentoDeOrgao(papel: string | null | undefined): boolean {
  return papel === PapeisPlanejamento.Orgao || papel === PapeisPlanejamento.OrgaoConsulta;
}

/** Papel conhecido (os cinco do módulo). */
export function papelPlanejamentoValido(papel: string | null | undefined): boolean {
  return OPCOES_PAPEL_PLANEJAMENTO.some(o => o.valor === papel);
}
