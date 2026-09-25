import { PePdtic } from '../../../api/planejamento/interface';
import { PePdticService } from '../services/pe-pdtic.service';
import { mensagemErroDownload, salvarResposta } from './pe-download';

/**
 * O PDF de um PDTIC no caminho da aprovação (E7): a versão do documento enviada
 * ao CGTIC (que depois fica aprovada e publicada) ou, no PDTIC aprovado fora do
 * sistema, o PDF que o órgão enviou ao registrar (a versão 1 do documento).
 */
export interface PdfDoPdtic {
  pdticId: number;
  /** Número da versão do documento. */
  numero: number;
  sigla: string;
  versao: string;
}

/** O PDF que vale para o PDTIC agora, ou null quando ele ainda não foi enviado. */
export function pdfDoPdtic(pdtic: PePdtic | null | undefined): PdfDoPdtic | null {
  if (!pdtic) return null;
  const documento = pdtic.Deliberacao?.Documento;
  if (documento && documento.Numero > 0) {
    return { pdticId: documento.PdticId || pdtic.Id, numero: documento.Numero, sigla: pdtic.OrgaoSigla, versao: pdtic.Versao };
  }
  // PDTIC registrado já aprovado: o servidor guarda o PDF enviado como a versão 1 do documento
  return pdtic.RegistradoExternamente ? { pdticId: pdtic.Id, numero: 1, sigla: pdtic.OrgaoSigla, versao: pdtic.Versao } : null;
}

/**
 * O nome do PDF do PDTIC na tela, pelo caminho em que ele está (F1, I02): "PDF do
 * PDTIC registrado" (fora do sistema), "PDF publicado (versão N do documento)"
 * depois da publicação, "PDF aprovado pelo CGTIC (...)" antes dela e "PDF enviado
 * ao CGTIC (...)" enquanto o comitê não aprova.
 */
export function rotuloPdfDoPdtic(pdtic: Pick<PePdtic, 'Situacao' | 'RegistradoExternamente'>, pdf: Pick<PdfDoPdtic, 'numero'>): string {
  if (pdtic.RegistradoExternamente) return 'PDF do PDTIC registrado';
  const versao = `(versão ${pdf.numero} do documento)`;
  switch (pdtic.Situacao) {
    case 'publicado':
    case 'em_acompanhamento':
    case 'encerrado':
    case 'substituido':
      return `PDF publicado ${versao}`;
    case 'aprovado':
      return `PDF aprovado pelo CGTIC ${versao}`;
    default:
      return `PDF enviado ao CGTIC ${versao}`;
  }
}

/** Nome do PDF quando o `Content-Disposition` não chega (o mesmo desenho do servidor e da prévia do documento). */
export function nomePdfDoPdtic(pdf: Pick<PdfDoPdtic, 'sigla' | 'versao' | 'numero'>): string {
  const limpa = (pdf.sigla ?? '').trim().replace(/[^A-Za-z0-9_-]/g, '_') || 'orgao';
  return `PDTIC_${limpa}_v${pdf.versao || '1.0'}_${pdf.numero}.pdf`;
}

/**
 * Baixa o PDF (blob autorizado, salvo com o nome do servidor). Resolve com null
 * quando deu certo (ou no 403, que o interceptor já avisou) e com a mensagem do
 * erro, em linguagem simples, quando não deu. Sem async/await de propósito (o
 * rebaixamento para o zone.js traria um ajudante novo para o pacote).
 */
export function baixarPdfDoPdtic(pdticService: PePdticService, pdf: PdfDoPdtic): Promise<string | null> {
  return new Promise(resolver => {
    pdticService.pdfDoDocumento(pdf.pdticId, pdf.numero).subscribe({
      next: resposta => {
        salvarResposta(resposta, nomePdfDoPdtic(pdf));
        resolver(null);
      },
      error: erro => {
        mensagemErroDownload(erro, 'Não foi possível baixar o PDF. Tente de novo.').then(resolver);
      }
    });
  });
}
