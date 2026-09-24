import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeArquivoRef, PeCampoRegistro, PeOpcaoRegistro, PeRegistro, PeVinculo } from '../../../../api/planejamento/interface';
import { NotificationService } from '../../../core/services/notification.service';
import { PeFonteRegistros, PeRegistrosService } from '../../services/pe-registros.service';
import { mensagemErroPe } from '../pe-erros';
import { mensagemErroDownload, salvarResposta } from '../pe-download';
import { descricaoCalculo } from '../pe-modelo-rotulos';
import { PeEditorTextoRicoComponent } from '../texto-rico/pe-editor-texto-rico.component';
import { PeLigacaoCampoComponent } from './pe-ligacao-campo.component';
import {
  aceitaDoArquivo, dicaDoArquivo, dicaDoCampo, ehArquivoRef, ehLigacao, ehNumerico, erroDoCampo,
  lerNumero, numeroParaEdicao, problemaDoArquivo, textoDoValor
} from './pe-valores';

/** Aviso de tamanho perto do limite (a partir de 80% do máximo). */
const PERTO_DO_LIMITE = 0.8;

/**
 * Um campo de um registro, pelo tipo que o modelo configurou: texto curto e
 * longo, número, valor em reais, percentual, data, sim ou não, lista, lista
 * múltipla, ligação com busca, arquivo, texto rico (o editor, carregado só
 * quando o campo aparece) e calculado (só leitura).
 *
 * Acessibilidade: rótulo ligado ao campo (`for`/`id`) ou `fieldset`/`legend`
 * nos grupos; ajuda e erro ligados por `aria-describedby`; obrigatório com o
 * asterisco e o texto "(obrigatório)" para o leitor de tela. O `idBase` é o id
 * do controle (ou do grupo), que o resumo de erros usa para pôr o foco no campo.
 *
 * Números se digitam como texto, no jeito brasileiro ("1.250,50"): o valor que a
 * tela guarda é o texto; a conversão é na hora de salvar (`pe-valores.ts`).
 */
@Component({
  selector: 'app-pe-campo',
  standalone: true,
  imports: [CommonModule, FormsModule, PeLigacaoCampoComponent, PeEditorTextoRicoComponent],
  templateUrl: './pe-campo.component.html'
})
export class PeCampoComponent {
  private readonly registrosService = inject(PeRegistrosService);
  private readonly notificacoes = inject(NotificationService);

  @Input({ required: true }) campo!: PeCampoRegistro;
  @Input() valor: unknown = null;
  /** Escolhidos, nos campos de ligação. */
  @Input() escolhidos: PeVinculo[] = [];
  @Input({ required: true }) fonte!: PeFonteRegistros;
  /** O registro gravado (texto do calculado e do que a tela não edita). */
  @Input() registro: PeRegistro | null = null;
  /** Os campos da seção: nomes do cálculo. */
  @Input() campos: PeCampoRegistro[] = [];
  @Input({ required: true }) idBase!: string;
  @Input() erro: string | null = null;
  @Output() readonly valorChange = new EventEmitter<unknown>();
  @Output() readonly escolhidosChange = new EventEmitter<PeVinculo[]>();

  enviando = false;
  baixando = false;
  erroArquivo: string | null = null;
  avisoArquivo: string | null = null;

  // ── Tipo ──────────────────────────────────────────────────────────────────

  get ligacao(): boolean {
    return ehLigacao(this.campo.Tipo);
  }

  /** Grupo de controles (fieldset): sim ou não e lista múltipla. */
  get grupo(): boolean {
    return this.campo.Tipo === 'sim_nao' || this.campo.Tipo === 'lista_multipla';
  }

  /** Só leitura na tela: calculado. */
  get semControle(): boolean {
    return this.campo.Tipo === 'calculado';
  }

  /** Texto rico: o rótulo liga ao editor por `aria-labelledby` (não há `label for` num texto editável). */
  get rico(): boolean {
    return this.campo.Tipo === 'texto_rico';
  }

  /** Um controle só, com `label for`. */
  get simples(): boolean {
    return !this.ligacao && !this.grupo && !this.semControle && !this.rico;
  }

  get numerico(): boolean {
    return ehNumerico(this.campo.Tipo);
  }

  get inteiro(): boolean {
    return this.campo.Tipo === 'numero' && this.campo.Config?.casas === 0;
  }

  get unidade(): string | null {
    return this.campo.Tipo === 'numero' ? (this.campo.Config?.unidade?.trim() || null) : null;
  }

  // ── Textos de apoio ───────────────────────────────────────────────────────

  get ajuda(): string | null {
    return this.campo.Ajuda?.trim() || null;
  }

  /** O jeito de responder (e o limite do arquivo). */
  get dica(): string {
    if (this.campo.Tipo === 'arquivo') return dicaDoArquivo(this.campo);
    return dicaDoCampo(this.campo);
  }

  get temAjuda(): boolean {
    return !!this.ajuda || !!this.dica;
  }

  get descritores(): string | null {
    const ids: string[] = [];
    if (this.temAjuda) ids.push(`${this.idBase}-ajuda`);
    if (this.tamanhoPerto) ids.push(`${this.idBase}-tamanho`);
    if (this.erro) ids.push(`${this.idBase}-erro`);
    return ids.length ? ids.join(' ') : null;
  }

  /** "120 de 200 caracteres" quando o texto chega perto do limite. */
  get tamanhoPerto(): string | null {
    if (this.campo.Tipo !== 'texto_curto' && this.campo.Tipo !== 'texto_longo') return null;
    const max = this.campo.Config?.max;
    if (typeof max !== 'number' || max <= 0) return null;
    const tamanho = typeof this.valor === 'string' ? this.valor.trim().length : 0;
    return tamanho >= max * PERTO_DO_LIMITE ? `${tamanho} de ${max} caracteres.` : null;
  }

  // ── Listas ────────────────────────────────────────────────────────────────

  get opcoes(): PeOpcaoRegistro[] {
    return this.campo.Opcoes;
  }

  /** Valor gravado que não está mais entre as opções ativas (a opção foi desativada). */
  get valorInativo(): string | null {
    if (this.campo.Tipo !== 'lista' || typeof this.valor !== 'string' || !this.valor) return null;
    return this.opcoes.some(o => o.Valor === this.valor) ? null : this.valor;
  }

  get rotuloInativo(): string {
    const pronto = this.registro?.Rotulos?.[this.campo.Chave];
    return pronto?.trim() || String(this.valorInativo ?? '');
  }

  get marcados(): string[] {
    return Array.isArray(this.valor) ? this.valor.map(String) : [];
  }

  /** Marcados que não estão entre as opções ativas: aparecem para poder desmarcar. */
  get marcadosInativos(): string[] {
    return this.marcados.filter(v => !this.opcoes.some(o => o.Valor === v));
  }

  marcado(valor: string): boolean {
    return this.marcados.includes(valor);
  }

  alternarOpcao(valor: string, marcado: boolean): void {
    const sem = this.marcados.filter(v => v !== valor);
    // Na ordem das opções, como o modelo mostra
    const ordem = (v: string) => {
      const i = this.opcoes.findIndex(o => o.Valor === v);
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    const novos = marcado ? [...sem, valor].sort((a, b) => ordem(a) - ordem(b)) : sem;
    this.mudar(novos);
  }

  porValor(_: number, o: PeOpcaoRegistro): string {
    return o.Valor;
  }

  // ── Mudança ───────────────────────────────────────────────────────────────

  mudar(valor: unknown): void {
    this.valorChange.emit(valor);
  }

  /** Ao sair de um campo de número: escreve no jeito brasileiro ("1250" vira "1.250,00" na moeda). */
  arrumarNumero(): void {
    if (!this.numerico || typeof this.valor !== 'string') return;
    const lido = lerNumero(this.valor);
    if (lido.valor === null || lido.invalido || erroDoCampo(this.campo, this.valor) !== null) return;
    const arrumado = numeroParaEdicao(this.campo, lido.valor);
    if (arrumado !== this.valor) this.mudar(arrumado);
  }

  // ── Calculado e texto rico ────────────────────────────────────────────────

  get textoGravado(): string {
    return textoDoValor(this.campo, this.registro);
  }

  get explicacaoCalculo(): string {
    const nomes = {
      secao: () => null,
      campo: (chave: string) => this.campos.find(c => c.Chave === chave)?.Rotulo ?? null
    };
    return descricaoCalculo(this.campo.Config, nomes);
  }

  /** Clique no rótulo do texto rico leva o foco ao texto (o que o `label for` faria). */
  focarTexto(): void {
    document.getElementById(this.idBase)?.focus();
  }

  // ── Arquivo ───────────────────────────────────────────────────────────────

  get arquivo(): PeArquivoRef | null {
    return ehArquivoRef(this.valor) ? this.valor : null;
  }

  get aceita(): string {
    return aceitaDoArquivo(this.campo);
  }

  escolherArquivo(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const escolhido = entrada.files?.[0];
    // Limpa a escolha: escolher o mesmo arquivo de novo também dispara a troca
    entrada.value = '';
    if (!escolhido || this.enviando) return;
    this.erroArquivo = problemaDoArquivo(this.campo, escolhido);
    this.avisoArquivo = null;
    if (this.erroArquivo) return;
    this.enviando = true;
    this.registrosService.enviarArquivo(escolhido).subscribe({
      next: enviado => {
        this.enviando = false;
        this.avisoArquivo = 'Arquivo enviado. Salve o registro para guardar a mudança.';
        this.mudar({ ArquivoId: enviado.Id, Nome: enviado.Nome || escolhido.name });
      },
      error: erro => {
        this.enviando = false;
        this.erroArquivo = mensagemErroPe(erro, 'Não foi possível enviar o arquivo. Tente de novo.');
      }
    });
  }

  tirarArquivo(): void {
    this.avisoArquivo = 'O arquivo sai do registro quando você salvar.';
    this.mudar(null);
  }

  /** Download por blob, com o nome do servidor (só no navegador, no clique). */
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
