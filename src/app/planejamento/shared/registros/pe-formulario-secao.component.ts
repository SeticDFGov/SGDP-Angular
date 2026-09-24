import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PeRegistro, PeRegistrosDaSecao } from '../../../../api/planejamento/interface';
import { NotificationService } from '../../../core/services/notification.service';
import { PeFonteRegistros } from '../../services/pe-registros.service';
import { PeRegistroEdicaoComponent } from './pe-registro-edicao.component';
import { PeRegistroLeituraComponent } from './pe-registro-leitura.component';
import { textoDataHora } from './pe-valores';

/**
 * Seção do tipo formulário: um registro só. Quem pode editar preenche e salva ali
 * mesmo (o primeiro salvar cria o registro; os seguintes alteram); quem não pode
 * lê. Recebe a seção e os registros do contrato (GET .../registros) e a fonte do
 * dono, sem saber quem ele é.
 */
@Component({
  selector: 'app-pe-formulario-secao',
  standalone: true,
  imports: [CommonModule, PeRegistroEdicaoComponent, PeRegistroLeituraComponent],
  templateUrl: './pe-formulario-secao.component.html'
})
export class PeFormularioSecaoComponent implements OnChanges {
  private readonly notificacoes = inject(NotificationService);

  @Input({ required: true }) dados!: PeRegistrosDaSecao;
  @Input({ required: true }) fonte!: PeFonteRegistros;
  @Input() prefixoId = 'pe-form';
  @Output() readonly salvou = new EventEmitter<PeRegistro>();
  @Output() readonly alterado = new EventEmitter<boolean>();
  /** A tela deve buscar a seção de novo (alguém criou o formulário antes). */
  @Output() readonly recarregar = new EventEmitter<void>();

  registro: PeRegistro | null = null;

  ngOnChanges(): void {
    this.registro = this.dados.Registros[0] ?? null;
  }

  get auditoria(): string | null {
    const r = this.registro;
    if (!r) return null;
    const quando = r.AlteradoEm ?? r.CriadoEm;
    const quem = r.AlteradoEm ? r.AlteradoPor : r.CriadoPor;
    return `Salvo em ${textoDataHora(quando)}${quem ? ' por ' + quem : ''}.`;
  }

  aoSalvar(registro: PeRegistro): void {
    const primeiro = !this.registro;
    this.registro = registro;
    this.notificacoes.success(primeiro ? `"${this.dados.Secao.Titulo}" preenchido.` : `"${this.dados.Secao.Titulo}" salvo.`);
    this.salvou.emit(registro);
  }

  aoConflito(mensagem: string): void {
    this.notificacoes.warning(`${mensagem} Os dados foram carregados de novo: confira e salve outra vez.`);
    this.recarregar.emit();
  }
}
