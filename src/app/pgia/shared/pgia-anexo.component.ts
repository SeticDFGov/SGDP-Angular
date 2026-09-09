import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { PgiaDocumento, PgiaDocumentoArquivo } from '../../../api/pgia/interface';
import { NotificationService } from '../../core/services/notification.service';
import {
  ACEITA_ANEXO,
  PgiaDocumentoService,
  nomeDoContentDisposition,
  tamanhoLegivel,
  validarArquivo
} from '../services/pgia-documento.service';

/**
 * Anexo de um documento do PGIA: escolher o arquivo, enviar e baixar.
 *
 * O arquivo pertence a um `pgia_documento` que já existe. Enquanto a tela não
 * tiver o `documentoId` (por exemplo, um registro que ainda não foi salvo), o
 * componente explica o que falta em vez de oferecer um envio que falharia.
 */
@Component({
  selector: 'app-pgia-anexo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pgia-anexo.component.html'
})
export class PgiaAnexoComponent {
  /** Documento dono do arquivo. Sem ele, o envio fica indisponível. */
  @Input() documentoId: number | null = null;
  /** Anexo já enviado, quando a tela souber os dados dele. */
  @Input() arquivo: PgiaDocumentoArquivo | null = null;
  /** Só baixar: usado nas telas de leitura da SGDI e do CGTIC. */
  @Input() somenteLeitura = false;
  /** O que dizer quando ainda não há documento (cada tela tem o seu passo). */
  @Input() avisoSemDocumento = 'Salve o registro primeiro para anexar o arquivo.';
  /**
   * Cria o documento na hora do envio, quando a tela ainda não tem um. A tela
   * recebe o documento em `documentoCriado` e é ela que guarda a FK no registro.
   */
  @Input() criarDocumento: ((arquivo: File) => Observable<PgiaDocumento>) | null = null;

  @Output() enviado = new EventEmitter<PgiaDocumentoArquivo>();
  @Output() documentoCriado = new EventEmitter<PgiaDocumento>();

  enviando = false;
  baixando = false;
  readonly aceita = ACEITA_ANEXO;

  constructor(
    private documentoService: PgiaDocumentoService,
    private notificationService: NotificationService
  ) {}

  /**
   * Havendo documento, já se oferece baixar: o arquivo pode ter sido anexado
   * numa sessão anterior, e a tela raramente conhece os metadados dele. Se não
   * houver binário, o download responde 404 e a mensagem explica.
   */
  get temAnexo(): boolean {
    return !!this.arquivo || !!this.documentoId;
  }

  get nomeExibido(): string {
    return this.arquivo?.NomeArquivo ?? 'arquivo anexado';
  }

  get tamanhoExibido(): string | null {
    return this.arquivo ? tamanhoLegivel(this.arquivo.TamanhoBytes) : null;
  }

  aoEscolherArquivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;

    const problema = validarArquivo(arquivo);
    if (problema) {
      this.notificationService.warning(problema);
      input.value = '';
      return;
    }
    if (!this.documentoId && !this.criarDocumento) {
      this.notificationService.warning(this.avisoSemDocumento);
      input.value = '';
      return;
    }

    // Sem documento ainda: cria um e sobe o arquivo nele. O documento só é
    // devolvido à tela DEPOIS que o arquivo subiu — ver `subir`.
    if (!this.documentoId && this.criarDocumento) {
      this.enviando = true;
      this.criarDocumento(arquivo).subscribe({
        next: (documento) => {
          // Guarda o id para um novo envio reaproveitar o mesmo documento.
          this.documentoId = documento.Id;
          this.subir(arquivo, input, documento);
        },
        error: () => {
          this.enviando = false;
          input.value = '';
          this.notificationService.error('Não foi possível preparar o documento para o anexo.');
        }
      });
      return;
    }

    this.enviando = true;
    this.subir(arquivo, input, null);
  }

  /**
   * Sobe o arquivo. Quando o documento acabou de ser criado, a FK só é entregue
   * à tela (`documentoCriado`) se o upload der certo: emitir antes deixaria a
   * tela guardando um documento sem binário, e a visão de leitura ofereceria um
   * "Baixar" que responde 404.
   */
  private subir(arquivo: File, input: HTMLInputElement, documentoNovo: PgiaDocumento | null): void {
    this.documentoService.uploadArquivo(this.documentoId as number, arquivo).subscribe({
      next: (enviado) => {
        this.enviando = false;
        input.value = '';
        // O servidor pode não devolver corpo: guarda o que se sabe do arquivo.
        this.arquivo = enviado ?? {
          DocumentoId: this.documentoId as number,
          NomeArquivo: arquivo.name,
          ContentType: arquivo.type,
          TamanhoBytes: arquivo.size
        };
        if (documentoNovo) this.documentoCriado.emit(documentoNovo);
        this.enviado.emit(this.arquivo);
        this.notificationService.success('Arquivo anexado.');
      },
      error: () => {
        this.enviando = false;
        input.value = '';
        this.notificationService.error(documentoNovo
          ? 'O documento foi preparado, mas o arquivo não subiu — tente enviar de novo.'
          : 'Não foi possível enviar o arquivo.');
      }
    });
  }

  /**
   * Última reserva de nome: usada quando o servidor não manda
   * `Content-Disposition` (ou o CORS o esconde) e a tela não conhece o nome
   * local. Dá ao menos a extensão certa, para o arquivo abrir.
   */
  private nomeDerivado(blob: Blob): string {
    const extensoes: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.oasis.opendocument.text': 'odt',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.oasis.opendocument.spreadsheet': 'ods',
      'text/csv': 'csv',
      'text/plain': 'txt',
      'image/png': 'png',
      'image/jpeg': 'jpg'
    };
    const extensao = extensoes[(blob.type || '').toLowerCase()];
    return `documento-${this.documentoId}` + (extensao ? `.${extensao}` : '');
  }

  baixar(): void {
    if (!this.documentoId) return;
    this.baixando = true;
    this.documentoService.baixarArquivo(this.documentoId).subscribe({
      next: (resposta) => {
        this.baixando = false;
        const blob = resposta.body;
        if (!blob) {
          this.notificationService.error('Não foi possível baixar o arquivo.');
          return;
        }
        // O nome bom é o do servidor; o local e a extensão do tipo são reservas.
        const nome = nomeDoContentDisposition(resposta.headers.get('Content-Disposition'))
          ?? this.arquivo?.NomeArquivo
          ?? this.nomeDerivado(blob);
        // Handler de clique: só roda no browser.
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nome;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (erro) => {
        this.baixando = false;
        // Documento existe, binário não: acontece quando a FK foi guardada e o
        // upload falhou, ou quando o anexo ainda não foi enviado.
        this.notificationService[erro?.status === 404 ? 'warning' : 'error'](
          erro?.status === 404
            ? 'Ainda não há arquivo anexado neste documento.'
            : 'Não foi possível baixar o arquivo.');
      }
    });
  }
}
