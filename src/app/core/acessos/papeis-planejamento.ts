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

/**
 * Os cinco papéis como as telas de acesso os oferecem (o rótulo completo) e o nome
 * curto, para tabelas e resumos. F3 (A1): os papéis de órgão se chamam como o Guia de
 * PDTIC do SISP chama a equipe (os códigos não mudam).
 */
export const OPCOES_PAPEL_PLANEJAMENTO: { valor: string; rotulo: string; curto: string }[] = [
  { valor: PapeisPlanejamento.Admin, rotulo: 'Administrador do módulo: configura, dá acesso e acompanha todos os órgãos', curto: 'Administrador do módulo' },
  { valor: PapeisPlanejamento.Sgdi, rotulo: 'Equipe da SGDI: acompanha e analisa os PDTICs de todos os órgãos', curto: 'Equipe da SGDI' },
  { valor: PapeisPlanejamento.Cgtic, rotulo: 'Secretaria do CGTIC: registra as deliberações do comitê', curto: 'Secretaria do CGTIC' },
  {
    valor: PapeisPlanejamento.Orgao, rotulo: 'Equipe do PDTIC (EqPDTIC): elabora e acompanha o PDTIC do próprio órgão',
    curto: 'Equipe do PDTIC'
  },
  { valor: PapeisPlanejamento.OrgaoConsulta, rotulo: 'Consulta do PDTIC: só lê o PDTIC do próprio órgão', curto: 'Consulta do PDTIC' }
];

/** Nome curto do papel, para tabelas e resumos. */
export function rotuloCurtoPapelPlanejamento(papel: string | null | undefined): string {
  const opcao = OPCOES_PAPEL_PLANEJAMENTO.find(o => o.valor === papel);
  return opcao ? opcao.curto : (papel ?? '');
}

/** Papéis que só enxergam o próprio órgão: precisam de unidade ligada a um órgão. */
export function papelPlanejamentoDeOrgao(papel: string | null | undefined): boolean {
  return papel === PapeisPlanejamento.Orgao || papel === PapeisPlanejamento.OrgaoConsulta;
}

/** Papel conhecido (os cinco do módulo). */
export function papelPlanejamentoValido(papel: string | null | undefined): boolean {
  return OPCOES_PAPEL_PLANEJAMENTO.some(o => o.valor === papel);
}
