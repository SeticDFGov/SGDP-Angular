import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PeFluxoDefinicao } from '../../../api/planejamento/interface';
import { DescricaoFluxo, DicionarioFluxo, descricaoDoFluxo, dicionarioPadrao } from '../shared/pe-fluxo-rotulos';

/**
 * A descrição de um fluxo em texto, em lista numerada (o texto alternativo
 * completo do desenho: quem não vê o desenho entende o fluxo). Fica num bloco
 * que abre e fecha; quem usa pode carregar a definição só quando o bloco abre
 * (`abriu`), como a prévia do documento faz.
 */
@Component({
  selector: 'app-pe-fluxo-descricao',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pe-fluxo-descricao.component.html',
  host: { class: 'block' }
})
export class PeFluxoDescricaoComponent implements OnChanges {
  /**
   * A descrição já montada (o editor refaz a cada mudança, porque muda a
   * definição no lugar); sem ela, a descrição sai da `definicao`.
   */
  @Input() descricaoPronta: DescricaoFluxo | null = null;
  @Input() definicao: PeFluxoDefinicao | null = null;
  @Input() dicionario: DicionarioFluxo = dicionarioPadrao();
  /** Os números que valem (os do servidor); sem eles, a numeração pela ordem do fluxo. */
  @Input() numeros: ReadonlyMap<string, string> | null = null;
  @Input({ required: true }) idBase!: string;
  /** Nome do fluxo, para o leitor de tela saber de que desenho é a descrição. */
  @Input() nomeFluxo = '';
  @Input() aberta = false;
  @Input() carregando = false;
  @Input() erro: string | null = null;
  /** O bloco abriu (quem usa pode buscar a definição agora; depois de um erro, abrir de novo tenta de novo). */
  @Output() readonly abriu = new EventEmitter<void>();

  descricao: DescricaoFluxo | null = null;

  ngOnChanges(): void {
    this.descricao = this.descricaoPronta
      ?? (this.definicao ? descricaoDoFluxo(this.definicao, this.dicionario, this.numeros ?? undefined) : null);
  }

  get idTitulo(): string {
    return `${this.idBase}-titulo`;
  }

  get rotuloRegiao(): string {
    return this.nomeFluxo ? `Descrição do fluxo ${this.nomeFluxo}, em texto` : 'Descrição do fluxo em texto';
  }

  aoAlternar(evento: Event): void {
    if ((evento.target as HTMLDetailsElement | null)?.open) this.abriu.emit();
  }

  porIndice(i: number): number {
    return i;
  }
}
