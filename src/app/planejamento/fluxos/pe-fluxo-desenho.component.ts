import { Component, Input, OnChanges, OnDestroy, PLATFORM_ID, SimpleChanges, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AcessibilidadeService } from '../../core/acessibilidade/acessibilidade.service';
import { svgParaImagem, tamanhoDoSvg } from '../shared/pe-fluxo-rotulos';

/** Os tamanhos do zoom (1 = o tamanho do desenho). */
const ZOOMS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];

/**
 * O desenho de um fluxo (o SVG que a API devolve), mostrado de forma segura:
 * vira uma imagem a partir de um blob, e dentro de uma imagem o SVG não roda
 * script nem busca nada de fora.
 *
 * - Zoom: afastar, aproximar, caber na largura (o padrão) e tamanho real; o
 *   tamanho vale até a pessoa mudar, mesmo quando o desenho é refeito.
 * - Rolagem pelo teclado: a região do desenho recebe o foco (as setas rolam) e
 *   entende + e - para o zoom e 0 para caber na largura.
 * - O texto alternativo curto vem de quem usa (`alt`); a descrição completa, em
 *   lista numerada, fica ao lado (componente da descrição).
 */
@Component({
  selector: 'app-pe-fluxo-desenho',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pe-fluxo-desenho.component.html',
  host: { class: 'block' }
})
export class PeFluxoDesenhoComponent implements OnChanges, OnDestroy {
  private readonly acessibilidade = inject(AcessibilidadeService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  /** O SVG como a API devolveu (null: sem desenho). */
  @Input() svg: string | null = null;
  /** Nome da região do desenho ("Desenho do fluxo Preparação"). */
  @Input({ required: true }) rotulo!: string;
  /** Texto alternativo curto da imagem. */
  @Input({ required: true }) alt!: string;
  @Input({ required: true }) idBase!: string;
  /** Altura máxima da região (com rolagem). */
  @Input() alturaMaxima = '65vh';
  /** Texto quando não há desenho. */
  @Input() vazio = 'Sem desenho para mostrar.';

  url: string | null = null;
  falhou = false;
  /** null: caber na largura. */
  zoom: number | null = null;
  private tamanho: { largura: number; altura: number } | null = null;

  ngOnChanges(mudancas: SimpleChanges): void {
    if (!mudancas['svg']) return;
    this.liberar();
    this.falhou = false;
    this.tamanho = tamanhoDoSvg(this.svg);
    if (this.noNavegador && this.svg) {
      this.url = URL.createObjectURL(new Blob([svgParaImagem(this.svg)], { type: 'image/svg+xml' }));
    }
  }

  ngOnDestroy(): void {
    this.liberar();
  }

  private liberar(): void {
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
  }

  get idRegiao(): string {
    return `${this.idBase}-regiao`;
  }

  get idImagem(): string {
    return `${this.idBase}-imagem`;
  }

  get rotuloRegiao(): string {
    return `${this.rotulo}. Use as setas para rolar, + e - para aproximar e afastar, e 0 para caber na largura.`;
  }

  /** Largura da imagem: 100% (caber na largura) ou o tamanho do desenho vezes o zoom. */
  get larguraCss(): string {
    if (this.zoom === null || !this.tamanho) return '100%';
    return `${Math.round(this.tamanho.largura * this.zoom)}px`;
  }

  get textoZoom(): string {
    return this.zoom === null ? 'caber na largura' : `${Math.round(this.zoom * 100)}%`;
  }

  aoCarregar(evento: Event): void {
    // Sem width e height no SVG, vale o tamanho que o navegador leu
    if (this.tamanho) return;
    const img = evento.target as HTMLImageElement | null;
    if (img?.naturalWidth && img.naturalHeight) this.tamanho = { largura: img.naturalWidth, altura: img.naturalHeight };
  }

  aoFalhar(): void {
    this.falhou = true;
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────

  /** O zoom de agora, também quando o desenho está cabendo na largura (medido na tela). */
  private zoomAtual(): number {
    if (this.zoom !== null) return this.zoom;
    if (!this.noNavegador || !this.tamanho) return 1;
    const img = document.getElementById(this.idImagem);
    const largura = img?.clientWidth ?? 0;
    return largura > 0 ? largura / this.tamanho.largura : 1;
  }

  aumentar(): void {
    const atual = this.zoomAtual();
    this.definirZoom(ZOOMS.find(z => z > atual + 0.001) ?? ZOOMS[ZOOMS.length - 1]);
  }

  diminuir(): void {
    const atual = this.zoomAtual();
    this.definirZoom([...ZOOMS].reverse().find(z => z < atual - 0.001) ?? ZOOMS[0]);
  }

  tamanhoReal(): void {
    this.definirZoom(1);
  }

  caberNaLargura(): void {
    this.zoom = null;
    this.acessibilidade.anunciar('O desenho cabe na largura.');
  }

  private definirZoom(zoom: number): void {
    if (!this.tamanho) {
      // Sem o tamanho do desenho, o zoom não tem base: fica cabendo na largura
      this.zoom = null;
      return;
    }
    this.zoom = zoom;
    this.acessibilidade.anunciar(`Desenho em ${Math.round(zoom * 100)}%.`);
  }

  /** Teclas da região do desenho: + e - (zoom) e 0 (caber na largura); as setas rolam sozinhas. */
  aoTeclar(evento: KeyboardEvent): void {
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
    if (evento.key === '+' || evento.key === '=') this.aumentar();
    else if (evento.key === '-' || evento.key === '_') this.diminuir();
    else if (evento.key === '0') this.caberNaLargura();
    else return;
    evento.preventDefault();
  }
}
