/**
 * Rótulos do PETIC-DF e das deliberações do CGTIC, em linguagem simples, e as
 * cores dos selos (classes que o projeto já usa). Só funções puras.
 */
import { PeDeliberacao, PePetic } from '../../../api/planejamento/interface';
import { textoData, textoDataHora } from './registros/pe-valores';

export function rotuloSituacaoPetic(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'rascunho': return 'Rascunho';
    case 'em_deliberacao': return 'Com o CGTIC';
    case 'aprovado': return 'Vigente';
    case 'substituido': return 'Substituída';
    default: return situacao || '-';
  }
}

export function classeSituacaoPetic(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'em_deliberacao': return 'bg-amber-100 text-amber-900';
    case 'aprovado': return 'bg-green-100 text-green-800';
    case 'rascunho': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export function rotuloSituacaoDeliberacao(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'aguardando': return 'Aguardando a decisão';
    case 'aprovado': return 'Aprovado';
    case 'devolvido': return 'Devolvido';
    default: return situacao || '-';
  }
}

export function classeSituacaoDeliberacao(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'aguardando': return 'bg-amber-100 text-amber-900';
    case 'aprovado': return 'bg-green-100 text-green-800';
    case 'devolvido': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

/** "Resolução nº 12, de 20/09/2026 · SEI 00000-00000000/2026-00" (o que houver). */
export function textoAto(d: Pick<PeDeliberacao, 'AtoTipo' | 'AtoNumero' | 'AtoData' | 'Sei'>): string {
  const ato = [d.AtoTipo?.trim(), d.AtoNumero?.trim() ? `nº ${d.AtoNumero.trim()}` : ''].filter(Boolean).join(' ');
  const partes: string[] = [];
  if (ato) partes.push(d.AtoData ? `${ato}, de ${textoData(d.AtoData)}` : ato);
  else if (d.AtoData) partes.push(`ato de ${textoData(d.AtoData)}`);
  if (d.Sei?.trim()) partes.push(`SEI ${d.Sei.trim()}`);
  return partes.join(' · ');
}

/** "01/01/2026 a 31/12/2029" (ou só o início, ou o fim). */
export function textoVigencia(v: Pick<PePetic, 'VigenciaInicio' | 'VigenciaFim'>): string {
  if (v.VigenciaInicio && v.VigenciaFim) return `${textoData(v.VigenciaInicio)} a ${textoData(v.VigenciaFim)}`;
  if (v.VigenciaInicio) return `a partir de ${textoData(v.VigenciaInicio)}`;
  if (v.VigenciaFim) return `até ${textoData(v.VigenciaFim)}`;
  return '-';
}

/** Uma linha sobre a deliberação de uma versão, para a lista de versões. */
export function resumoDeliberacao(d: PeDeliberacao | null): string {
  if (!d) return 'Ainda não enviada';
  if (d.Situacao === 'aguardando') return `Enviada em ${textoData(d.EnviadoEm)}, aguardando o comitê`;
  const quando = d.DecididoEm ? ` em ${textoData(d.DecididoEm)}` : '';
  return d.Situacao === 'aprovado' ? `Aprovada${quando}` : `Devolvida${quando}`;
}

/** "24/09/2026 às 14:05 por fulano@df.gov.br". */
export function quandoEQuem(quando: string | null | undefined, quem: string | null | undefined): string {
  const texto = textoDataHora(quando);
  return quem ? `${texto} por ${quem}` : texto;
}

/**
 * Situação do PETIC-DF para o administrador do módulo: rascunho devolvido pede
 * atenção; rascunho em elaboração ou nenhuma versão, pendente; versão com o CGTIC
 * ou vigente sem rascunho, nada esperando por ele.
 */
export function statusDoPetic(versoes: PePetic[]): { estado: 'feito' | 'atencao' | 'pendente'; texto: string } {
  const rascunho = versoes.find(v => v.Situacao === 'rascunho');
  if (rascunho?.Deliberacao?.Situacao === 'devolvido') {
    return { estado: 'atencao', texto: `Versão ${rascunho.Versao} devolvida pelo CGTIC: ajuste e envie de novo` };
  }
  if (rascunho) return { estado: 'pendente', texto: `Rascunho da versão ${rascunho.Versao} em elaboração` };
  const comOComite = versoes.find(v => v.Situacao === 'em_deliberacao');
  if (comOComite) return { estado: 'feito', texto: `Versão ${comOComite.Versao} com o CGTIC, aguardando a decisão` };
  const vigente = versoes.find(v => v.Situacao === 'aprovado');
  if (vigente) return { estado: 'feito', texto: `Versão ${vigente.Versao} vigente` };
  return { estado: 'pendente', texto: 'Nenhuma versão cadastrada' };
}
