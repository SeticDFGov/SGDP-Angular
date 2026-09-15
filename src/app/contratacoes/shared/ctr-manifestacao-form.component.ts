import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CtrManifestacaoForm, STATUS_TCDF } from '../../../api/contratacoes/interface';

/**
 * Formulário da manifestação da SGDI ao TCDF, reaproveitado por "nova" e por
 * "editar". Ele espelha o despacho padrão da supervisão contínua (Decreto nº
 * 48.899/2026 + IN SGDI nº 1/2026): os textos das alternativas são os do
 * documento, na literalidade, e todas aparecem na tela como aparecem no papel.
 *
 * As citações de artigos aqui são texto simples: a diretiva de chips
 * `citaDecreto` é exclusiva do Decreto nº 48.901/2026 (PGIA).
 *
 * Os blocos são exclusivos: o que não vale para o inciso escolhido é enviado
 * como nulo — o backend recusa campo de bloco inativo preenchido, e a resposta
 * de erro chega sem corpo (500), então a disciplina fica aqui.
 *
 * A criticidade **não é editada aqui**: ela é atributo da contratação e mora no
 * cadastro do processo. O inciso I apenas a reporta (e não pode ser registrado
 * sem ela).
 */
@Component({
  selector: 'app-ctr-manifestacao-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ctr-manifestacao-form.component.html'
})
export class CtrManifestacaoFormComponent implements OnChanges {
  @Input() valor: CtrManifestacaoForm | null = null;
  @Input() salvando = false;
  @Input() rotuloSalvar = 'Salvar manifestação';
  /** Criticidade do processo — só leitura, vem do cadastro da contratação. */
  @Input() criticidadeProcesso: string | null = null;
  /** Processo da manifestação, para o link "editar o processo". */
  @Input() processoId: number | null = null;

  @Output() salvar = new EventEmitter<CtrManifestacaoForm>();
  @Output() cancelar = new EventEmitter<void>();

  statusTcdf = STATUS_TCDF;

  form: CtrManifestacaoForm = CtrManifestacaoFormComponent.vazio();
  submetido = false;

  static vazio(): CtrManifestacaoForm {
    return {
      OficioTcdf: '', DataOficio: '', SituacaoPortfolio: 'Comunicada previamente',
      ComunicadaDesde: null, ResultadoAnalise: null,
      RecomendouSuspensao: false, ComunicouControleInterno: false, DesfechoRisco: null,
      PrazoRegularizacaoDias: null, EsclarecimentosAdicionais: null, StatusTcdf: null, Observacao: null
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['valor']) {
      this.submetido = false;
      this.form = this.valor
        ? { ...CtrManifestacaoFormComponent.vazio(), ...this.valor }
        : CtrManifestacaoFormComponent.vazio();
    }
  }

  // ── Blocos condicionais ───────────────────────────────────────────────────

  get incisoI(): boolean {
    return this.form.SituacaoPortfolio === 'Comunicada previamente';
  }

  get incisoII(): boolean {
    return this.form.SituacaoPortfolio === 'Não comunicada previamente';
  }

  get temRiscos(): boolean {
    return this.incisoI && this.form.ResultadoAnalise === 'Riscos significativos';
  }

  /** Trocar de inciso limpa o bloco que deixou de valer. */
  aoTrocarInciso(valor: string): void {
    this.form.SituacaoPortfolio = valor;
    if (this.incisoII) {
      this.form.ComunicadaDesde = null;
      this.form.ResultadoAnalise = null;
      this.limparRiscos();
    } else {
      this.form.PrazoRegularizacaoDias = null;
    }
  }

  /** Resultado diferente de "riscos significativos" desliga o bloco de risco. */
  aoTrocarResultado(valor: string): void {
    this.form.ResultadoAnalise = valor;
    if (valor !== 'Riscos significativos') this.limparRiscos();
  }

  private limparRiscos(): void {
    this.form.RecomendouSuspensao = false;
    this.form.ComunicouControleInterno = false;
    this.form.DesfechoRisco = null;
  }

  // ── Validações ────────────────────────────────────────────────────────────

  private get hoje(): string {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${agora.getFullYear()}-${mes}-${dia}`;
  }

  get errOficio(): string | null {
    const valor = (this.form.OficioTcdf || '').trim();
    if (!valor) return 'Informe o número do ofício ou da comunicação do TCDF.';
    if (valor.length > 60) return 'O número do ofício passa de 60 caracteres.';
    return null;
  }

  get errDataOficio(): string | null {
    if (!this.form.DataOficio) return 'Informe a data do ofício.';
    if (this.form.DataOficio > this.hoje) return 'A data do ofício está no futuro.';
    return null;
  }

  get errComunicadaDesde(): string | null {
    if (!this.incisoI) return null;
    if (!this.form.ComunicadaDesde) return 'Informe desde quando a contratação está no monitoramento contínuo.';
    if (this.form.ComunicadaDesde > this.hoje) return 'A data está no futuro.';
    // Mesma regra do servidor: a contratação já estava comunicada quando o
    // ofício do TCDF chegou.
    if (this.form.DataOficio && this.form.ComunicadaDesde > this.form.DataOficio) {
      return 'A data não pode ser posterior à do ofício do TCDF.';
    }
    return null;
  }

  /**
   * A criticidade é do processo: o inciso I não pode ser registrado enquanto o
   * cadastro da contratação não a tiver. A mensagem é a mesma do servidor, que
   * responde 500 sem corpo quando a regra falha.
   */
  get errCriticidade(): string | null {
    if (!this.incisoI) return null;
    return this.criticidadeProcesso
      ? null
      : 'Defina a criticidade no cadastro do processo antes de registrar a manifestação do inciso I.';
  }

  get errResultado(): string | null {
    if (!this.incisoI) return null;
    return this.form.ResultadoAnalise ? null : 'Escolha o resultado da análise e a providência adotada.';
  }

  get errDesfecho(): string | null {
    if (!this.temRiscos) return null;
    return this.form.DesfechoRisco ? null : 'Escolha em que ponto está o tratamento dos riscos.';
  }

  get errPrazo(): string | null {
    if (!this.incisoII) return null;
    const dias = this.form.PrazoRegularizacaoDias;
    if (dias === null || dias === undefined || `${dias}` === '') return 'Informe o prazo, em dias, para regularizar a comunicação.';
    if (!Number.isInteger(Number(dias))) return 'O prazo é um número inteiro de dias.';
    if (Number(dias) < 1 || Number(dias) > 365) return 'O prazo precisa estar entre 1 e 365 dias.';
    return null;
  }

  get formValido(): boolean {
    return !this.errOficio && !this.errDataOficio && !this.errComunicadaDesde
      && !this.errCriticidade && !this.errResultado && !this.errDesfecho && !this.errPrazo;
  }

  // ── Envio ─────────────────────────────────────────────────────────────────

  enviar(): void {
    this.submetido = true;
    if (!this.formValido) return;

    const observacao = (this.form.Observacao || '').trim();

    this.salvar.emit({
      OficioTcdf: this.form.OficioTcdf.trim(),
      DataOficio: this.form.DataOficio,
      SituacaoPortfolio: this.form.SituacaoPortfolio,
      // Bloco do inciso I — nulo quando a contratação não era comunicada.
      // A criticidade não vai no corpo: é do processo.
      ComunicadaDesde: this.incisoI ? this.form.ComunicadaDesde : null,
      ResultadoAnalise: this.incisoI ? this.form.ResultadoAnalise : null,
      // Bloco de risco — só existe com "riscos significativos".
      RecomendouSuspensao: this.temRiscos ? this.form.RecomendouSuspensao : false,
      ComunicouControleInterno: this.temRiscos ? this.form.ComunicouControleInterno : false,
      DesfechoRisco: this.temRiscos ? this.form.DesfechoRisco : null,
      // Bloco do inciso II.
      PrazoRegularizacaoDias: this.incisoII ? Number(this.form.PrazoRegularizacaoDias) : null,
      // Registros de acompanhamento: valem em qualquer inciso, não entram em
      // bloco nenhum (nem no despacho). Vazio vira nulo.
      EsclarecimentosAdicionais: (this.form.EsclarecimentosAdicionais || '').trim() || null,
      StatusTcdf: this.form.StatusTcdf || null,
      Observacao: observacao ? observacao : null
    });
  }
}
