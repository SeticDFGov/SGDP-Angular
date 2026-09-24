import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  PeAjusteOrgao, PeAlvoAjuste, PeCampoModelo, PeModelo, PeOrgaoNivel, PePassoModelo, PeSecaoModelo, PeSituacao
} from '../../../api/planejamento/interface';
import { NotificationService } from '../../core/services/notification.service';
import { SITUACOES, citacaoTravado, corSituacao, rotuloSituacao } from '../shared/pe-modelo-rotulos';
import {
  SituacaoEfetiva, campoNaoDesliga, chaveAjuste, modeloOrdenado, situacaoNoNivel
} from '../shared/pe-modelo-arvore';
import { mensagemErroPe } from '../shared/pe-erros';
import { PeModeloService } from '../services/pe-modelo.service';
import { PeOrgaosService } from '../services/pe-orgaos.service';

/** Ajuste na tela: '' = segue o nível. */
interface AjusteNaTela {
  situacao: PeSituacao | '';
  justificativa: string;
}

/** Tamanho da justificativa (o servidor confere de novo). */
const MAX_JUSTIFICATIVA = 500;

/**
 * Ajustes de um órgão por cima do nível de maturidade (GET e PUT
 * api/planejamento/orgaos/{id}/ajustes): a mesma árvore do modelo, com a situação
 * no nível do órgão, a coluna do ajuste ("segue o nível", obrigatório, opcional
 * ou desligado), a justificativa e como o item fica para o órgão (o campo só
 * aparece com a seção, e a seção, com o passo). O que é travado não desliga.
 * Tudo fica na tela até "Salvar os ajustes", que manda a lista inteira (ajuste
 * retirado vai com a situação nula).
 *
 * Mora dentro da tela dos órgãos, que tem o `citaPlanejamento` no raiz (por isso
 * este componente não tem o dele: dois no mesmo texto duplicariam os chips).
 */
@Component({
  selector: 'app-pe-orgao-ajustes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pe-orgao-ajustes.component.html'
})
export class PeOrgaoAjustesComponent implements OnChanges {
  private readonly modeloService = inject(PeModeloService);
  private readonly orgaosService = inject(PeOrgaosService);
  private readonly notificacoes = inject(NotificationService);

  @Input({ required: true }) orgao!: PeOrgaoNivel;
  @Output() readonly verComoOrgao = new EventEmitter<void>();
  @Output() readonly trocarNivel = new EventEmitter<void>();
  /** Quantos ajustes o órgão ficou tendo depois de salvar. */
  @Output() readonly salvou = new EventEmitter<number>();

  readonly situacoes = SITUACOES;
  readonly maxJustificativa = MAX_JUSTIFICATIVA;

  modelo: PeModelo | null = null;
  carregando = false;
  erroCarga = false;
  salvando = false;
  tentou = false;

  private originais = new Map<string, PeAjusteOrgao>();
  ajustes = new Map<string, AjusteNaTela>();
  abertos = new Set<number>();
  private nomes = new Map<string, string>();
  /** Passo e seção de cada item (as células da linha só recebem o tipo e o item). */
  private parentes = new Map<string, { passo: PePassoModelo | null; secao: PeSecaoModelo | null }>();

  ngOnChanges(mudancas: SimpleChanges): void {
    const antes = mudancas['orgao']?.previousValue as PeOrgaoNivel | undefined;
    // Troca de nível do mesmo órgão só muda a coluna do nível; outro órgão recarrega tudo
    if (!antes || antes.OrgaoId !== this.orgao.OrgaoId) this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.erroCarga = false;
    forkJoin({ modelo: this.modeloService.modelo(), ajustes: this.orgaosService.ajustes(this.orgao.OrgaoId) }).subscribe({
      next: ({ modelo, ajustes }) => {
        this.modelo = modeloOrdenado(modelo);
        this.indexarNomes();
        this.aplicarAjustes(ajustes);
        // Abre os passos que têm ajuste dentro, para o que já foi ajustado ficar à vista
        this.abertos = new Set();
        for (const etapa of this.modelo.Etapas) {
          for (const passo of etapa.Passos) {
            const dentro = passo.Secoes.some(s => this.ajustes.has(chaveAjuste('secao', s.Id))
              || s.Campos.some(c => this.ajustes.has(chaveAjuste('campo', c.Id))));
            if (dentro) this.abertos.add(passo.Id);
          }
        }
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        this.erroCarga = true;
      }
    });
  }

  private indexarNomes(): void {
    this.nomes = new Map();
    this.parentes = new Map();
    for (const etapa of this.modelo?.Etapas ?? []) {
      for (const passo of etapa.Passos) {
        this.nomes.set(chaveAjuste('passo', passo.Id), passo.Titulo);
        this.parentes.set(chaveAjuste('passo', passo.Id), { passo: null, secao: null });
        for (const secao of passo.Secoes) {
          this.nomes.set(chaveAjuste('secao', secao.Id), secao.Titulo);
          this.parentes.set(chaveAjuste('secao', secao.Id), { passo, secao: null });
          for (const campo of secao.Campos) {
            this.nomes.set(chaveAjuste('campo', campo.Id), campo.Rotulo);
            this.parentes.set(chaveAjuste('campo', campo.Id), { passo, secao });
          }
        }
      }
    }
  }

  nomeDe(item: PePassoModelo | PeSecaoModelo | PeCampoModelo): string {
    return 'Rotulo' in item ? item.Rotulo : item.Titulo;
  }

  /** O que é travado não desliga: passo e seção dos conteúdos mínimos e o campo principal da seção travada. */
  naoDesliga(tipo: PeAlvoAjuste, item: PePassoModelo | PeSecaoModelo | PeCampoModelo): boolean {
    if (tipo === 'passo') return (item as PePassoModelo).Travado;
    if (tipo === 'secao') return (item as PeSecaoModelo).Travada;
    const secao = this.parentes.get(chaveAjuste('campo', item.Id))?.secao;
    return !!secao && campoNaoDesliga(item as PeCampoModelo, secao);
  }

  /** Como o item fica para o órgão, com o nível, o ajuste e os pais. */
  finalDe(tipo: PeAlvoAjuste, item: PePassoModelo | PeSecaoModelo | PeCampoModelo): SituacaoEfetiva {
    const p = this.parentes.get(chaveAjuste(tipo, item.Id));
    if (tipo === 'passo') return this.finalPasso(item as PePassoModelo);
    if (tipo === 'secao') return p?.passo ? this.finalSecao(item as PeSecaoModelo, p.passo) : 'oculto';
    return p?.passo && p.secao ? this.finalCampo(item as PeCampoModelo, p.secao, p.passo) : 'oculto';
  }

  corFinal(tipo: PeAlvoAjuste, item: PePassoModelo | PeSecaoModelo | PeCampoModelo): string {
    const final = this.finalDe(tipo, item);
    return final === 'oculto' || final === 'desligado' ? 'text-gray-500' : corSituacao(final);
  }

  /** "Obrigatório", "Não aparece" ou "Não aparece: o passo está desligado". */
  textoFinalDe(tipo: PeAlvoAjuste, item: PePassoModelo | PeSecaoModelo | PeCampoModelo): string {
    const final = this.finalDe(tipo, item);
    if (final !== 'oculto') return final === 'desligado' ? 'Não aparece' : rotuloSituacao(final);
    const passo = this.parentes.get(chaveAjuste(tipo, item.Id))?.passo;
    const passoDesligado = !!passo && this.finalPasso(passo) === 'desligado';
    return passoDesligado ? 'Não aparece: o passo está desligado' : 'Não aparece: a seção está desligada';
  }

  private aplicarAjustes(lista: PeAjusteOrgao[]): void {
    this.originais = new Map();
    this.ajustes = new Map();
    for (const a of lista ?? []) {
      if (!a.Situacao) continue;
      const k = chaveAjuste(a.AlvoTipo, a.AlvoId);
      this.originais.set(k, a);
      this.ajustes.set(k, { situacao: a.Situacao, justificativa: a.Justificativa ?? '' });
    }
    this.tentou = false;
  }

  // ── Árvore ────────────────────────────────────────────────────────────────

  alternar(passo: PePassoModelo): void {
    if (this.abertos.has(passo.Id)) this.abertos.delete(passo.Id);
    else this.abertos.add(passo.Id);
  }

  porId(_: number, item: { Id: number }): number {
    return item.Id;
  }

  // ── Situação e ajuste ─────────────────────────────────────────────────────

  get nivelId(): number {
    return this.orgao.NivelId;
  }

  noNivel(item: PePassoModelo | PeSecaoModelo | PeCampoModelo): PeSituacao {
    return situacaoNoNivel(item, this.nivelId);
  }

  rotulo(situacao: string): string {
    return rotuloSituacao(situacao);
  }

  cor(situacao: string): string {
    return corSituacao(situacao);
  }

  citacao(inciso: string | null): string {
    return citacaoTravado(inciso);
  }

  ajuste(tipo: PeAlvoAjuste, id: number): AjusteNaTela | null {
    return this.ajustes.get(chaveAjuste(tipo, id)) ?? null;
  }

  valorAjuste(tipo: PeAlvoAjuste, id: number): string {
    return this.ajuste(tipo, id)?.situacao ?? '';
  }

  mudarAjuste(tipo: PeAlvoAjuste, id: number, valor: string): void {
    const k = chaveAjuste(tipo, id);
    const atual = this.ajustes.get(k);
    if (!valor) {
      this.ajustes.delete(k);
      return;
    }
    this.ajustes.set(k, { situacao: valor as PeSituacao, justificativa: atual?.justificativa ?? '' });
  }

  mudarJustificativa(tipo: PeAlvoAjuste, id: number, texto: string): void {
    const a = this.ajustes.get(chaveAjuste(tipo, id));
    if (a) a.justificativa = texto;
  }

  mudou(tipo: PeAlvoAjuste, id: number): boolean {
    const k = chaveAjuste(tipo, id);
    const o = this.originais.get(k);
    const a = this.ajustes.get(k);
    if (!o && !a) return false;
    if (!o || !a) return true;
    return o.Situacao !== a.situacao || (o.Justificativa ?? '') !== a.justificativa.trim();
  }

  justificativaFaltando(tipo: PeAlvoAjuste, id: number): boolean {
    const a = this.ajuste(tipo, id);
    return this.tentou && !!a && !!a.situacao && this.mudou(tipo, id) && !a.justificativa.trim();
  }

  // ── Como o item fica para o órgão ─────────────────────────────────────────

  private comAjuste(tipo: PeAlvoAjuste, item: PePassoModelo | PeSecaoModelo | PeCampoModelo, naoDesliga: boolean): PeSituacao {
    const ajustada = (this.ajuste(tipo, item.Id)?.situacao || null) ?? this.noNivel(item);
    return naoDesliga && ajustada === 'desligado' ? 'obrigatorio' : ajustada;
  }

  finalPasso(passo: PePassoModelo): SituacaoEfetiva {
    return this.comAjuste('passo', passo, passo.Travado);
  }

  finalSecao(secao: PeSecaoModelo, passo: PePassoModelo): SituacaoEfetiva {
    return this.finalPasso(passo) === 'desligado' ? 'oculto' : this.comAjuste('secao', secao, secao.Travada);
  }

  finalCampo(campo: PeCampoModelo, secao: PeSecaoModelo, passo: PePassoModelo): SituacaoEfetiva {
    const s = this.finalSecao(secao, passo);
    return s === 'desligado' || s === 'oculto' ? 'oculto' : this.comAjuste('campo', campo, campoNaoDesliga(campo, secao));
  }

  naoDesligaCampo(campo: PeCampoModelo, secao: PeSecaoModelo): boolean {
    return campoNaoDesliga(campo, secao);
  }

  // ── Gravação ──────────────────────────────────────────────────────────────

  get alterado(): boolean {
    const chaves = new Set([...this.originais.keys(), ...this.ajustes.keys()]);
    for (const k of chaves) {
      const [tipo, id] = k.split(':');
      if (this.mudou(tipo as PeAlvoAjuste, Number(id))) return true;
    }
    return false;
  }

  get quantosAjustes(): number {
    return this.ajustes.size;
  }

  get erros(): string[] {
    if (!this.tentou) return [];
    const faltando: string[] = [];
    for (const [k, a] of this.ajustes) {
      const [tipo, id] = k.split(':');
      if (a.situacao && this.mudou(tipo as PeAlvoAjuste, Number(id)) && !a.justificativa.trim()) {
        faltando.push(this.nomes.get(k) ?? k);
      }
    }
    return faltando.length ? [`Escreva a justificativa dos ajustes: ${faltando.join('; ')}.`] : [];
  }

  desfazer(): void {
    this.aplicarAjustes([...this.originais.values()]);
  }

  /** Guarda de saída: ajuste mudado e não salvo pergunta antes. */
  podeSair(): boolean {
    return !this.alterado || confirm('Há ajustes que ainda não foram salvos. Sair assim mesmo? Eles vão se perder.');
  }

  salvar(): void {
    if (this.salvando) return;
    this.tentou = true;
    if (this.erros.length) return;

    // A lista inteira: os ajustes da tela e, com a situação nula, os que foram retirados
    const lista: PeAjusteOrgao[] = [];
    for (const [k, a] of this.ajustes) {
      const [tipo, id] = k.split(':');
      lista.push({ AlvoTipo: tipo as PeAlvoAjuste, AlvoId: Number(id), Situacao: a.situacao || null, Justificativa: a.justificativa.trim() || null });
    }
    for (const [k, o] of this.originais) {
      if (!this.ajustes.has(k)) lista.push({ AlvoTipo: o.AlvoTipo, AlvoId: o.AlvoId, Situacao: null, Justificativa: null });
    }

    this.salvando = true;
    this.orgaosService.salvarAjustes(this.orgao.OrgaoId, lista).subscribe({
      next: resposta => {
        this.salvando = false;
        // Sem lista na resposta, vale o que foi mandado
        const gravados = Array.isArray(resposta) ? resposta : lista.filter(a => a.Situacao);
        this.aplicarAjustes(gravados);
        this.notificacoes.success(`Ajustes do ${this.orgao.Sigla} salvos. A trilha do órgão já mudou.`);
        this.salvou.emit(this.ajustes.size);
      },
      error: erro => {
        this.salvando = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível salvar os ajustes. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }
}
