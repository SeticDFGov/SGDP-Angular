import { Component } from '@angular/core';
import { CitaInDirective } from '../shared/cita-in.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { CtrImportacaoService, validarPlanilha } from '../services/ctr-importacao.service';
import { corAcaoImportacao } from '../shared/ctr-rotulos';
import { CtrImportacaoLinha, CtrImportacaoRelatorio } from '../../../api/contratacoes/interface';

/**
 * Importação da planilha legada: escolher o arquivo → prévia do que vai
 * acontecer com cada linha → confirmar → relatório.
 *
 * A prévia não grava nada. A importação é idempotente por número de processo
 * (upsert entre os ativos), então reimportar a mesma planilha não duplica.
 */
@Component({
  selector: 'app-ctr-importacao',
  standalone: true,
  imports: [CitaInDirective, CommonModule, FormsModule, RouterModule],
  templateUrl: './ctr-importacao.component.html'
})
export class CtrImportacaoComponent {
  arquivo: File | null = null;
  erroArquivo: string | null = null;

  totalLinhas = 0;
  linhas: CtrImportacaoLinha[] = [];
  temPrevia = false;
  gerandoPrevia = false;

  relatorio: CtrImportacaoRelatorio | null = null;
  importando = false;

  /** Mostrar só as linhas rejeitadas na tabela. */
  soRejeitadas = false;

  corAcaoImportacao = corAcaoImportacao;

  constructor(
    private importacaoService: CtrImportacaoService,
    private notificationService: NotificationService
  ) {}

  get linhasVisiveis(): CtrImportacaoLinha[] {
    const lista = this.relatorio ? this.relatorio.Linhas : this.linhas;
    return this.soRejeitadas ? lista.filter(l => l.Acao === 'Rejeitar') : lista;
  }

  get totalPorAcao(): { criar: number; atualizar: number; rejeitar: number } {
    return {
      criar: this.linhas.filter(l => l.Acao === 'Criar').length,
      atualizar: this.linhas.filter(l => l.Acao === 'Atualizar').length,
      rejeitar: this.linhas.filter(l => l.Acao === 'Rejeitar').length
    };
  }

  escolherArquivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files && input.files.length > 0 ? input.files[0] : null;
    this.reiniciar();
    if (!arquivo) return;

    const erro = validarPlanilha(arquivo);
    if (erro) {
      this.erroArquivo = erro;
      this.arquivo = null;
      input.value = '';
      return;
    }
    this.arquivo = arquivo;
    this.gerarPrevia();
  }

  reiniciar(): void {
    this.erroArquivo = null;
    this.temPrevia = false;
    this.linhas = [];
    this.totalLinhas = 0;
    this.relatorio = null;
    this.soRejeitadas = false;
  }

  private gerarPrevia(): void {
    if (!this.arquivo) return;
    this.gerandoPrevia = true;
    this.importacaoService.previa(this.arquivo).subscribe({
      next: previa => {
        this.gerandoPrevia = false;
        this.temPrevia = true;
        this.totalLinhas = previa.TotalLinhas ?? 0;
        this.linhas = previa.Linhas ?? [];
      },
      error: () => {
        this.gerandoPrevia = false;
        this.erroArquivo = 'Não foi possível ler a planilha. Confira se o arquivo é o CSV exportado do Excel, com ponto e vírgula separando as colunas.';
      }
    });
  }

  confirmar(): void {
    if (!this.arquivo) return;
    this.importando = true;
    this.importacaoService.importar(this.arquivo).subscribe({
      next: relatorio => {
        this.importando = false;
        this.relatorio = relatorio;
        this.notificationService.success(
          `Importação concluída: ${relatorio.Criados} criado(s), ${relatorio.Atualizados} atualizado(s), ${relatorio.Rejeitados} rejeitado(s).`
        );
      },
      error: () => {
        this.importando = false;
        this.notificationService.error('Não foi possível concluir a importação. Nenhuma linha foi gravada.');
      }
    });
  }
}
