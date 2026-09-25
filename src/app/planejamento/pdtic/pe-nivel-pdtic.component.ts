import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PeFaltaNivel, PeNivelAlcancado } from '../../../api/planejamento/interface';
import { fraseDoNivelAlcancado, fraseDoQueFalta } from '../shared/pe-niveis-rotulos';
import { PassoNumeradoPe } from '../trilha/pe-trilhas';

/** Um passo que falta, com o link (na visão geral) quando o passo está no passo a passo à vista. */
interface ItemQueFalta {
  falta: PeFaltaNivel;
  /** A rota do passo e o número, para o link; null quando o passo não está à vista. */
  rota: string | null;
}

/**
 * F3 (C5 e C6) · O quadro "Nível do PDTIC", no modo livre: o nível que o PDTIC
 * alcançou (ou "O PDTIC ainda não completa o nível Básico") e, numa lista que abre
 * e fecha, o que falta para o próximo nível: o número e o título de cada passo (com
 * o link para ele) e o que falta nele. No PDTIC registrado fora do sistema, o motivo
 * do servidor (o nível não é calculado).
 *
 * Serve à visão geral (os links vão pelos passos do passo a passo à vista, `passos`)
 * e à página do órgão (sem `passos`: o passo abre pelo evento `abrirPasso`, e a
 * página leva ao passo a passo do órgão).
 */
@Component({
  selector: 'app-pe-nivel-pdtic',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pe-nivel-pdtic.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeNivelPdticComponent implements OnChanges {
  @Input({ required: true }) nivel!: PeNivelAlcancado;
  /** O nome do nível base (o primeiro), para quando o PDTIC ainda não alcançou nenhum. */
  @Input() nomeBase: string | null = null;
  /** Os passos do passo a passo à vista (a visão geral): os itens viram links. */
  @Input() passos: PassoNumeradoPe[] | null = null;
  /** O prefixo dos ids (dois quadros na mesma tela não repetem id). */
  @Input() idBase = 'pe-nivel';
  /** Sem `passos`: a tela abre o passo (a página do órgão leva ao passo a passo dele). */
  @Output() readonly abrirPasso = new EventEmitter<PeFaltaNivel>();

  aberto = false;
  frase = '';
  queFalta = '';
  itens: ItemQueFalta[] = [];

  ngOnChanges(): void {
    const n = this.nivel;
    this.frase = n ? fraseDoNivelAlcancado(n, this.nomeBase) : '';
    this.queFalta = n ? fraseDoQueFalta(n) : '';
    // Montados aqui (e não no template): objeto novo a cada verificação daria NG0100
    this.itens = (n?.Faltam ?? []).map(falta => {
      const passo = this.passos?.find(p => (!!falta.PassoNumero && p.numero === falta.PassoNumero) || p.doOrgao?.Id === falta.PassoId);
      return { falta, rota: passo ? passo.rota : null };
    });
  }

  /** O PDTIC completa o último nível do modelo (sem próximo e com nível alcançado). */
  get noUltimoNivel(): boolean {
    return !!this.nivel?.AlcancadoNome && !this.nivel.ProximoId && !this.nivel.Motivo;
  }

  alternar(): void {
    this.aberto = !this.aberto;
  }

  porPasso(_: number, item: ItemQueFalta): number {
    return item.falta.PassoId;
  }
}
