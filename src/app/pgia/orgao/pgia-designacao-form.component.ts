import { AfterViewChecked, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import {
  NOMES_DESIGNACAO,
  PgiaDesignacao,
  PgiaDesignacaoAtualizarForm,
  PgiaDocumento,
  PgiaPessoa,
  PgiaPosicaoDesignacao,
  PgiaResponsavelIaAtualizarForm,
  PgiaTipoDesignacao,
  POSICOES_DESIGNACAO,
  PRAZO_DESIGNACAO
} from '../../../api/pgia/interface';
import { PgiaOrgaoService } from '../services/pgia-orgao.service';
import { PgiaDocumentoService } from '../services/pgia-documento.service';
import { PgiaAnexoComponent } from '../shared/pgia-anexo.component';
import { mensagemDoErro } from '../shared/mensagem-erro';

/** `designar`: designação nova (POST, com pessoa e posição). `ato`: completar ou corrigir o ato (PUT). */
export type ModoFormDesignacao = 'designar' | 'ato';

type CampoDesignacao = 'AgenteId' | 'AtoTipo' | 'AtoNumero' | 'AtoData' | 'ProcessoSeiComunicacao'
  | 'DataComunicacaoSgdi' | 'InicioVigencia' | 'CapacitacaoAdequada';

const TIPOS_ATO = ['Portaria', 'Ordem de serviço', 'Outro ato equivalente'];

/** Ordem dos campos na tela: o foco vai ao primeiro com problema. */
const ORDEM_CAMPOS: CampoDesignacao[] = ['AgenteId', 'AtoTipo', 'AtoNumero', 'AtoData', 'ProcessoSeiComunicacao',
  'DataComunicacaoSgdi', 'CapacitacaoAdequada', 'InicioVigencia'];

/**
 * Formulário de uma designação do PGIA (Responsável de IA, Encarregado de Dados ou
 * Curador de Dados de Negócio): designar ou trocar o titular ou o suplente (POST) e
 * completar ou corrigir o ato de uma designação existente (PUT). Usado na área do
 * órgão e em "Pessoas e acessos" da SGDI (ato importado da planilha, a completar).
 *
 * Quem chama decide quem pode (a autorização real é do servidor) e para onde vai o
 * foco depois de salvar ou cancelar.
 */
@Component({
  selector: 'app-pgia-designacao-form',
  standalone: true,
  imports: [CommonModule, FormsModule, PgiaAnexoComponent],
  host: { class: 'block' },
  templateUrl: './pgia-designacao-form.component.html'
})
export class PgiaDesignacaoFormComponent implements OnChanges, AfterViewChecked {
  @Input({ required: true }) tipo!: PgiaTipoDesignacao;
  @Input({ required: true }) orgaoId!: number;
  @Input() modo: ModoFormDesignacao = 'designar';
  /** Posição inicial no modo `designar` (a pessoa pode trocar no formulário). */
  @Input() posicao: PgiaPosicaoDesignacao = 'Titular';
  /** Pessoas da unidade do órgão (modo `designar`). */
  @Input() pessoas: PgiaPessoa[] = [];
  /** Designação cujo ato se completa ou corrige (modo `ato`). */
  @Input() designacao: PgiaDesignacao | null = null;
  /** Vigentes de cada posição, para avisar o que a troca encerra e barrar a mesma pessoa nas duas. */
  @Input() vigentes: Partial<Record<PgiaPosicaoDesignacao, PgiaDesignacao | null>> = {};
  /** Prefixo dos ids (o mesmo formulário pode aparecer em mais de um lugar). */
  @Input() idBase = 'des';

  @Output() salvo = new EventEmitter<PgiaDesignacao>();
  @Output() cancelar = new EventEmitter<void>();

  readonly posicoes = POSICOES_DESIGNACAO;
  readonly prazo = PRAZO_DESIGNACAO;

  posicaoEscolhida: PgiaPosicaoDesignacao = 'Titular';
  agenteId = '';
  atoTipo = 'Portaria';
  atoNumero = '';
  atoData = '';
  processoSei = '';
  dataComunicacao = '';
  inicioVigencia = '';
  documentoId: number | null = null;
  acumulaFuncaoTic = false;
  capacitacaoAdequada: boolean | null = null;

  submetido = false;
  salvando = false;
  erroServidor: string | null = null;
  private focoPendente: string | null = null;

  constructor(
    private orgaoService: PgiaOrgaoService,
    private documentoService: PgiaDocumentoService,
    private elemento: ElementRef<HTMLElement>
  ) {}

  /** Só a designação, o modo, a posição inicial e o tipo recomeçam o formulário (as listas não). */
  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['designacao'] || mudancas['modo'] || mudancas['posicao'] || mudancas['tipo']) this.preencher();
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente) return;
    const alvo = this.elemento.nativeElement.querySelector<HTMLElement>('#' + this.focoPendente);
    this.focoPendente = null;
    alvo?.focus();
  }

  private preencher(): void {
    const d = this.modo === 'ato' ? this.designacao : null;
    this.posicaoEscolhida = d?.Posicao ?? this.posicao;
    this.agenteId = d?.AgenteId ?? '';
    this.atoTipo = d?.AtoTipo ?? 'Portaria';
    this.atoNumero = d?.AtoNumero ?? '';
    this.atoData = (d?.AtoData ?? '').substring(0, 10);
    this.processoSei = d?.ProcessoSeiComunicacao ?? '';
    this.dataComunicacao = (d?.DataComunicacaoSgdi ?? '').substring(0, 10);
    this.inicioVigencia = (d?.InicioVigencia ?? '').substring(0, 10);
    this.documentoId = d?.DocumentoId ?? null;
    this.acumulaFuncaoTic = d?.AcumulaFuncaoTic ?? false;
    this.capacitacaoAdequada = d?.CapacitacaoAdequada ?? null;
    this.submetido = false;
    this.erroServidor = null;
  }

  // ── Textos ────────────────────────────────────────────────────────────────

  get nome(): string {
    return NOMES_DESIGNACAO[this.tipo];
  }

  get ehResponsavel(): boolean {
    return this.tipo === 'responsavel_ia';
  }

  /** O prazo do art. 35, I vale para o Responsável de IA e o Encarregado de Dados. */
  get temPrazoDecreto(): boolean {
    return this.tipo !== 'curador_dados';
  }

  get titulo(): string {
    const posicao = this.posicaoEscolhida.toLowerCase();
    if (this.modo === 'ato') {
      const verbo = this.designacao?.AtoPendente ? 'Completar' : 'Corrigir';
      return `${verbo} o ato da designação de ${this.designacao?.AgenteNome ?? ''} (${this.nome}, ${posicao})`;
    }
    return this.vigenteDaPosicao ? `Trocar o ${posicao}: ${this.nome}` : `Designar o ${posicao}: ${this.nome}`;
  }

  get vigenteDaPosicao(): PgiaDesignacao | null {
    return this.vigentes[this.posicaoEscolhida] ?? null;
  }

  get outraPosicao(): PgiaPosicaoDesignacao {
    return this.posicaoEscolhida === 'Titular' ? 'Suplente' : 'Titular';
  }

  get tiposAto(): string[] {
    return this.atoTipo && !TIPOS_ATO.includes(this.atoTipo) ? [...TIPOS_ATO, this.atoTipo] : TIPOS_ATO;
  }

  rotuloPosicao(p: PgiaPosicaoDesignacao): string {
    const vigente = this.vigentes[p];
    return vigente ? `${p} (hoje: ${vigente.AgenteNome})` : `${p} (vago)`;
  }

  id(campo: string): string {
    return `${this.idBase}-${campo}`;
  }

  prazoOk(data: string): boolean {
    return !!data && data <= this.prazo;
  }

  // ── Validação ─────────────────────────────────────────────────────────────

  erroDe(campo: CampoDesignacao): string | null {
    switch (campo) {
      case 'AgenteId':
        if (this.modo !== 'designar') return null;
        if (!this.agenteId) return 'Escolha a pessoa designada.';
        if (this.vigentes[this.outraPosicao]?.AgenteId === this.agenteId) {
          return `Esta pessoa já é a ${this.outraPosicao.toLowerCase()} vigente desta designação; a mesma pessoa não pode ser titular e suplente ao mesmo tempo.`;
        }
        return null;
      case 'AtoTipo': return this.atoTipo.trim() ? null : 'Escolha o tipo do ato.';
      case 'AtoNumero': return this.atoNumero.trim() ? null : 'Informe o número do ato.';
      case 'AtoData': return this.atoData ? null : 'Informe a data do ato.';
      case 'ProcessoSeiComunicacao': return this.processoSei.trim() ? null : 'Informe o processo SEI da comunicação.';
      case 'DataComunicacaoSgdi': return this.dataComunicacao ? null : 'Informe a data da comunicação à SGDI.';
      case 'InicioVigencia':
        if (!this.inicioVigencia) return 'Informe o início da vigência.';
        if (this.modo === 'ato' && this.designacao?.FimVigencia
            && this.inicioVigencia > this.designacao.FimVigencia.substring(0, 10)) {
          return 'O início da vigência não pode ser depois do fim da vigência.';
        }
        return null;
      case 'CapacitacaoAdequada':
        return this.ehResponsavel && this.acumulaFuncaoTic && this.capacitacaoAdequada === null
          ? 'Responda se a pessoa possui capacitação adequada.' : null;
    }
  }

  /** O erro só aparece depois da primeira tentativa de salvar. */
  erro(campo: CampoDesignacao): string | null {
    return this.submetido ? this.erroDe(campo) : null;
  }

  /** `aria-describedby` do campo: o hint (quando houver) e o erro (quando houver). */
  descritoPor(campo: CampoDesignacao, comHint = false): string | null {
    const ids = [comHint ? this.id(campo + '-hint') : '', this.erro(campo) ? this.id(campo + '-erro') : '']
      .filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }

  // ── Anexo ─────────────────────────────────────────────────────────────────

  /** A cópia do ato é documento do MESMO órgão da designação (central é recusado). */
  criarDocumentoAto = (arquivo: File): Observable<PgiaDocumento> =>
    this.documentoService.criarDocumento({ Tipo: 'Ato de designação', NomeArquivo: arquivo.name, OrgaoId: this.orgaoId });

  aoCriarDocumento(documento: PgiaDocumento): void {
    this.documentoId = documento.Id;
  }

  tirarCopia(): void {
    this.documentoId = null;
    this.focoPendente = this.id('anexo');
  }

  aoTrocarAcumulacao(): void {
    if (!this.acumulaFuncaoTic) this.capacitacaoAdequada = null;
  }

  // ── Salvar ────────────────────────────────────────────────────────────────

  salvar(): void {
    if (this.salvando) return;
    this.submetido = true;
    this.erroServidor = null;
    const primeiro = ORDEM_CAMPOS.find(c => this.erroDe(c));
    if (primeiro) {
      this.focoPendente = this.id(primeiro === 'CapacitacaoAdequada' ? 'cap-sim' : primeiro);
      return;
    }

    const ato: PgiaDesignacaoAtualizarForm = {
      AtoTipo: this.atoTipo.trim(),
      AtoNumero: this.atoNumero.trim(),
      AtoData: this.atoData,
      ProcessoSeiComunicacao: this.processoSei.trim(),
      DataComunicacaoSgdi: this.dataComunicacao,
      InicioVigencia: this.inicioVigencia,
      DocumentoId: this.documentoId
    };
    // No Responsável de IA o servidor grava também a acumulação (a capacitação só vale com ela)
    const corpoAto: PgiaDesignacaoAtualizarForm | PgiaResponsavelIaAtualizarForm = this.ehResponsavel
      ? { ...ato, AcumulaFuncaoTic: this.acumulaFuncaoTic, CapacitacaoAdequada: this.acumulaFuncaoTic ? this.capacitacaoAdequada : null }
      : ato;

    const chamada = this.modo === 'ato' && this.designacao
      ? this.orgaoService.atualizarAto(this.orgaoId, this.tipo, this.designacao.Id, corpoAto)
      : this.orgaoService.designar(this.orgaoId, this.tipo,
          { AgenteId: this.agenteId, Posicao: this.posicaoEscolhida, ...corpoAto });

    this.salvando = true;
    chamada.subscribe({
      next: designacao => {
        this.salvando = false;
        this.submetido = false;
        this.salvo.emit(designacao);
      },
      error: err => {
        this.salvando = false;
        this.erroServidor = mensagemDoErro(err, 'Não foi possível salvar a designação. Confira os campos e tente de novo.');
        this.focoPendente = this.id('erro-servidor');
      }
    });
  }
}
