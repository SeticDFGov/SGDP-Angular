import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { NotificationService } from '../../core/services/notification.service';
import {
  FiltrosPainelPublico,
  TemaIncorporado,
  codigoParaIncorporar,
  copiarTexto,
  enderecoDoPainel,
  temFiltro
} from './painel-publico';

/**
 * Janela "Incorporar o painel em outro site": monta o código do iframe (com o script
 * opcional da altura) e o link da página, na origem do próprio site (produção ou
 * homologação). Com filtros aplicados, oferece levá-los no endereço; o tema também pode ir.
 */
@Component({
  selector: 'app-ctr-incorporar',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogoDirective],
  templateUrl: './ctr-incorporar.component.html'
})
export class CtrIncorporarComponent implements OnInit {
  /** Filtros da página pública no momento (nulo no aviso do painel interno). */
  @Input() filtros: FiltrosPainelPublico | null = null;
  /** Os filtros em palavras, para a opção de levá-los. */
  @Input() resumoFiltros = '';
  @Output() readonly fechar = new EventEmitter<void>();

  private readonly documento = inject(DOCUMENT);
  private readonly notificacoes = inject(NotificationService);

  temFiltros = false;
  levarFiltros = false;
  tema: TemaIncorporado = '';
  codigo = '';

  readonly temas: { valor: TemaIncorporado; rotulo: string }[] = [
    { valor: '', rotulo: 'Igual ao do visitante (padrão)' },
    { valor: 'claro', rotulo: 'Claro' },
    { valor: 'escuro', rotulo: 'Escuro' },
    { valor: 'alto-contraste', rotulo: 'Alto contraste' }
  ];

  ngOnInit(): void {
    this.temFiltros = temFiltro(this.filtros);
    this.levarFiltros = this.temFiltros;
    this.montar();
  }

  montar(): void {
    const origem = this.origem();
    this.codigo = codigoParaIncorporar(origem, enderecoDoPainel(origem, {
      incorporado: true,
      filtros: this.levarFiltros ? this.filtros : null,
      tema: this.tema
    }));
  }

  async copiarCodigo(): Promise<void> {
    await this.copiar(this.codigo, 'Código copiado.');
  }

  async copiarLink(): Promise<void> {
    await this.copiar(enderecoDoPainel(this.origem(), { filtros: this.levarFiltros ? this.filtros : null }), 'Link copiado.');
  }

  private async copiar(texto: string, mensagem: string): Promise<void> {
    if (await copiarTexto(texto)) this.notificacoes.success(mensagem, 3000);
    else this.notificacoes.warning('Não foi possível copiar. Selecione o texto e copie com Ctrl+C.');
  }

  private origem(): string {
    return this.documento.location?.origin ?? '';
  }
}
