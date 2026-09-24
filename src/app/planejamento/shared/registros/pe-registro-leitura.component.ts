import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PeArquivoRef, PeCampoRegistro, PeRegistro, PeSecaoDoDono, PeVinculo } from '../../../../api/planejamento/interface';
import { NotificationService } from '../../../core/services/notification.service';
import { PeRegistrosService } from '../../services/pe-registros.service';
import { mensagemErroDownload, salvarResposta } from '../pe-download';
import { ehArquivoRef, ehLigacao, textoDataHora, textoDoValor, textoVinculo } from './pe-valores';

/**
 * Um registro só para ler: cada campo visível com o rótulo e o valor pronto
 * (o texto que o servidor mandou em `Rotulos`, ou o valor formatado), as
 * ligações com o código e o resumo do destino, o arquivo com "Baixar" e quem
 * incluiu e alterou. Serve à consulta (quem não edita) e aos registros do sistema.
 */
@Component({
  selector: 'app-pe-registro-leitura',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pe-registro-leitura.component.html'
})
export class PeRegistroLeituraComponent {
  private readonly registrosService = inject(PeRegistrosService);
  private readonly notificacoes = inject(NotificationService);

  @Input({ required: true }) secao!: PeSecaoDoDono;
  @Input({ required: true }) registro!: PeRegistro;

  baixando = false;

  ligacao(campo: PeCampoRegistro): boolean {
    return ehLigacao(campo.Tipo);
  }

  vinculos(campo: PeCampoRegistro): PeVinculo[] {
    return this.registro.Vinculos?.[campo.Chave] ?? [];
  }

  textoVinculo(v: PeVinculo): string {
    return textoVinculo(v);
  }

  texto(campo: PeCampoRegistro): string {
    return textoDoValor(campo, this.registro);
  }

  arquivo(campo: PeCampoRegistro): PeArquivoRef | null {
    if (campo.Tipo !== 'arquivo') return null;
    const valor = this.registro.Dados?.[campo.Chave];
    return ehArquivoRef(valor) ? valor : null;
  }

  get auditoria(): string {
    const r = this.registro;
    const partes = [`Incluído em ${textoDataHora(r.CriadoEm)}${r.CriadoPor ? ' por ' + r.CriadoPor : ''}`];
    if (r.AlteradoEm) partes.push(`alterado em ${textoDataHora(r.AlteradoEm)}${r.AlteradoPor ? ' por ' + r.AlteradoPor : ''}`);
    return `${partes.join('; ')}.`;
  }

  porChave(_: number, campo: PeCampoRegistro): string {
    return campo.Chave;
  }

  baixar(arquivo: PeArquivoRef): void {
    if (this.baixando) return;
    this.baixando = true;
    this.registrosService.baixarArquivo(arquivo.ArquivoId).subscribe({
      next: resposta => {
        this.baixando = false;
        salvarResposta(resposta, arquivo.Nome || `arquivo-${arquivo.ArquivoId}`);
      },
      error: erro => {
        this.baixando = false;
        mensagemErroDownload(erro, 'Não foi possível baixar o arquivo.').then(m => {
          if (m) this.notificacoes.error(m);
        });
      }
    });
  }
}
