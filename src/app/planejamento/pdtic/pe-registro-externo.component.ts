import { AfterViewChecked, Component, EventEmitter, Input, OnInit, Output, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeArquivo, PeInstanciaAprovacaoExterna, PePdtic, PeRegistroExternoForm } from '../../../api/planejamento/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PePdticService } from '../services/pe-pdtic.service';
import { PeRegistrosService } from '../services/pe-registros.service';
import { mensagemErroPe } from '../shared/pe-erros';
import { MAX_MB_ARQUIVO, dataValida, hojeIso, tamanhoLegivel } from '../shared/registros/pe-valores';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';

type CampoExterno =
  | 'versao' | 'inicio' | 'fim' | 'arquivo' | 'instancia' | 'aprovacaoData' | 'atoTipo' | 'atoNumero' | 'sei'
  | 'publicacaoData' | 'endereco';

/** A ordem dos campos na tela (o foco vai para o primeiro com problema). */
const ORDEM: CampoExterno[] = [
  'versao', 'inicio', 'fim', 'arquivo', 'instancia', 'aprovacaoData', 'atoTipo', 'atoNumero', 'sei', 'publicacaoData', 'endereco'
];

/** Id do controle de cada campo (o da instância é o grupo). */
const IDS: Record<CampoExterno, string> = {
  versao: 'pe-ext-versao',
  inicio: 'pe-ext-inicio',
  fim: 'pe-ext-fim',
  arquivo: 'pe-ext-arquivo',
  instancia: 'pe-ext-instancia',
  aprovacaoData: 'pe-ext-aprovacao-data',
  atoTipo: 'pe-ext-ato-tipo',
  atoNumero: 'pe-ext-ato-numero',
  sei: 'pe-ext-sei',
  publicacaoData: 'pe-ext-publicacao-data',
  endereco: 'pe-ext-endereco'
};

/** Chave do corpo (`PeRegistroExternoForm`, sem caixa) para o campo da tela, no 400 com `Campos`. */
const CAMPO_DO_SERVIDOR: Record<string, CampoExterno> = {
  versao: 'versao',
  vigenciainicio: 'inicio',
  vigenciafim: 'fim',
  arquivoid: 'arquivo',
  aprovacaoinstancia: 'instancia',
  aprovacaodata: 'aprovacaoData',
  aprovacaoatotipo: 'atoTipo',
  aprovacaoatonumero: 'atoNumero',
  aprovacaosei: 'sei',
  publicacaodata: 'publicacaoData',
  publicacaoendereco: 'endereco'
};

/** Tipos de ato da aprovação (texto livre no servidor). */
export const TIPOS_ATO_EXTERNO = ['Resolução', 'Ata de reunião', 'Deliberação', 'Portaria', 'Despacho', 'Outro ato'];

const LIMITES = { versao: 10, atoNumero: 50, sei: 50, endereco: 500 } as const;

interface FormExterno {
  versao: string;
  inicio: string;
  fim: string;
  instancia: PeInstanciaAprovacaoExterna | '';
  aprovacaoData: string;
  atoTipo: string;
  atoNumero: string;
  sei: string;
  publicacaoData: string;
  endereco: string;
}

/**
 * "Registrar um PDTIC aprovado fora do sistema" (E7, decisão 20), na visão geral
 * do órgão sem PDTIC: o PDF do PDTIC (enviado na hora por POST arquivos), a
 * versão, a vigência, a aprovação (pelo CGTIC ou por outra instância, com o ato) e
 * a publicação. O servidor cria o PDTIC publicado, preenche a vigência e a
 * publicação e guarda o PDF como a versão 1 do documento; as etapas 1 a 3 ficam
 * como feitas fora do sistema, menos as metas e ações e os riscos, que a equipe
 * preenche para acompanhar.
 *
 * A tela confere antes (obrigatórios, datas válidas, fim depois do início, nada no
 * futuro, publicação depois da aprovação, PDF de até 25 MB) e leva o foco ao
 * primeiro campo com problema; o 400 com `Campos` volta para os mesmos campos.
 */
@Component({
  selector: 'app-pe-registro-externo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pe-registro-externo.component.html'
})
export class PeRegistroExternoComponent implements OnInit, AfterViewChecked {
  private readonly pdticService = inject(PePdticService);
  private readonly registrosService = inject(PeRegistrosService);
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly notificacoes = inject(NotificationService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  /** Órgão do PDTIC: null é o de quem registra (equipe do órgão); o admin do SGDP informa o órgão à vista. */
  @Input() orgaoId: number | null = null;
  @Input() siglaOrgao = '';
  @Output() readonly registrou = new EventEmitter<PePdtic>();
  @Output() readonly cancelar = new EventEmitter<void>();

  readonly ids = IDS;
  readonly limites = LIMITES;
  readonly tiposAto = TIPOS_ATO_EXTERNO;
  readonly hoje = hojeIso();
  readonly maxMb = MAX_MB_ARQUIVO;

  form: FormExterno = {
    versao: '1.0', inicio: '', fim: '', instancia: '', aprovacaoData: '', atoTipo: TIPOS_ATO_EXTERNO[0], atoNumero: '',
    sei: '', publicacaoData: '', endereco: ''
  };
  arquivo: PeArquivo | null = null;
  enviandoArquivo = false;
  erroArquivo: string | null = null;
  tentou = false;
  registrando = false;
  /** Mensagens do servidor por campo (400 com `Campos`), até o campo mudar. */
  errosServidor: Partial<Record<CampoExterno, string>> = {};
  erroGeral: string | null = null;
  private focoPendente: string | null = null;

  ngOnInit(): void {
    this.focoPendente = 'pe-ext-titulo';
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  // ── Conferência ───────────────────────────────────────────────────────────

  erro(campo: CampoExterno): string | null {
    const servidor = this.errosServidor[campo];
    if (servidor) return servidor;
    if (campo === 'arquivo' && this.erroArquivo) return this.erroArquivo;
    if (!this.tentou) return null;
    const f = this.form;
    switch (campo) {
      case 'versao':
        if (!f.versao.trim()) return 'Informe a versão do PDTIC.';
        return /^\d{1,3}\.\d{1,3}$/.test(f.versao.trim()) ? null : 'Use números separados por ponto, como 1.0 ou 2.1.';
      case 'inicio':
        return this.erroData(f.inicio, 'Informe o início da vigência.');
      case 'fim': {
        const base = this.erroData(f.fim, 'Informe o fim da vigência.');
        if (base) return base;
        return dataValida(f.inicio) && f.fim <= f.inicio ? 'O fim da vigência vem depois do início.' : null;
      }
      case 'arquivo':
        if (this.enviandoArquivo) return 'Espere o PDF terminar de subir.';
        return this.arquivo ? null : 'Envie o PDF do PDTIC aprovado.';
      case 'instancia':
        return f.instancia ? null : 'Diga quem aprovou o PDTIC.';
      case 'aprovacaoData': {
        const base = this.erroData(f.aprovacaoData, 'Informe a data da aprovação.');
        if (base) return base;
        return f.aprovacaoData > this.hoje ? 'A data da aprovação não pode ser depois de hoje.' : null;
      }
      case 'atoNumero':
        return f.instancia === 'cgtic' && !f.atoNumero.trim() ? 'Informe o número do ato do CGTIC que aprovou.' : null;
      case 'publicacaoData': {
        const base = this.erroData(f.publicacaoData, 'Informe a data da publicação.');
        if (base) return base;
        if (f.publicacaoData > this.hoje) return 'A data da publicação não pode ser depois de hoje.';
        return dataValida(f.aprovacaoData) && f.publicacaoData < f.aprovacaoData ? 'A publicação vem depois da aprovação.' : null;
      }
      case 'endereco':
        return f.endereco.trim() ? null : 'Informe o endereço onde a íntegra do PDTIC está publicada.';
      default:
        return null;
    }
  }

  private erroData(valor: string, vazio: string): string | null {
    if (!valor) return vazio;
    return dataValida(valor) ? null : 'Informe uma data válida (dia, mês e ano).';
  }

  get errosForm(): { campo: CampoExterno; mensagem: string }[] {
    return ORDEM.map(campo => ({ campo, mensagem: this.erro(campo) ?? '' })).filter(e => !!e.mensagem);
  }

  /** `aria-describedby` do controle: a ajuda (quando há) e o erro. */
  descritores(campo: CampoExterno, ajuda?: string): string | null {
    const ids = [ajuda, this.erro(campo) ? `${IDS[campo]}-erro` : null].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }

  /** O campo mudou: a mensagem do servidor para ele sai (a conferência da tela continua). */
  mudou(campo: CampoExterno): void {
    if (this.errosServidor[campo]) {
      const resto = { ...this.errosServidor };
      delete resto[campo];
      this.errosServidor = resto;
    }
  }

  focar(campo: CampoExterno): void {
    this.focoPendente = IDS[campo];
  }

  // ── PDF ───────────────────────────────────────────────────────────────────

  get tamanhoArquivo(): string {
    return this.arquivo ? tamanhoLegivel(this.arquivo.Tamanho) : '';
  }

  /** Confere o tipo e o tamanho e envia na hora (POST arquivos); a tela guarda o id para o registro. */
  escolherArquivo(evento: Event): void {
    const entrada = evento.target as HTMLInputElement | null;
    const escolhido = entrada?.files?.[0];
    if (!escolhido) return;
    this.mudou('arquivo');
    this.erroArquivo = null;
    const extensao = (escolhido.name.split('.').pop() ?? '').toLowerCase();
    if (extensao !== 'pdf') this.erroArquivo = 'Envie o PDTIC em PDF.';
    else if (escolhido.size === 0) this.erroArquivo = 'O arquivo está vazio.';
    else if (escolhido.size > MAX_MB_ARQUIVO * 1024 * 1024) {
      this.erroArquivo = `O arquivo tem ${tamanhoLegivel(escolhido.size)} e o limite é ${MAX_MB_ARQUIVO} MB. Envie um arquivo menor.`;
    }
    if (this.erroArquivo) {
      if (entrada) entrada.value = '';
      this.focoPendente = IDS.arquivo;
      return;
    }
    this.enviandoArquivo = true;
    this.registrosService.enviarArquivo(escolhido).subscribe({
      next: arquivo => {
        this.enviandoArquivo = false;
        this.arquivo = { ...arquivo, Nome: arquivo.Nome || escolhido.name, Tamanho: arquivo.Tamanho || escolhido.size };
        if (entrada) entrada.value = '';
      },
      error: erro => {
        this.enviandoArquivo = false;
        if (entrada) entrada.value = '';
        const mensagem = mensagemErroPe(erro, 'Não foi possível enviar o PDF. Tente de novo.');
        if (mensagem === null) return;
        this.erroArquivo = mensagem;
        this.focoPendente = IDS.arquivo;
      }
    });
  }

  tirarArquivo(): void {
    this.arquivo = null;
    this.focoPendente = IDS.arquivo;
  }

  // ── Registro ──────────────────────────────────────────────────────────────

  registrar(): void {
    if (this.registrando) return;
    this.tentou = true;
    this.erroGeral = null;
    const erros = this.errosForm;
    if (erros.length) {
      this.focoPendente = IDS[erros[0].campo];
      return;
    }
    const f = this.form;
    const texto = (v: string) => v.trim() || null;
    const corpo: PeRegistroExternoForm = {
      OrgaoId: this.orgaoId,
      Versao: f.versao.trim(),
      VigenciaInicio: f.inicio,
      VigenciaFim: f.fim,
      ArquivoId: this.arquivo!.Id,
      AprovacaoInstancia: f.instancia as PeInstanciaAprovacaoExterna,
      AprovacaoData: f.aprovacaoData,
      AprovacaoAtoTipo: f.atoNumero.trim() ? f.atoTipo : null,
      AprovacaoAtoNumero: texto(f.atoNumero),
      AprovacaoSei: texto(f.sei),
      PublicacaoData: f.publicacaoData,
      PublicacaoEndereco: f.endereco.trim()
    };
    this.registrando = true;
    this.pdticService.registrarExterno(corpo).subscribe({
      next: pdtic => {
        this.registrando = false;
        this.notificacoes.success(`PDTIC ${pdtic?.Versao ?? corpo.Versao} registrado. Ele já está publicado: preencha as metas, as ações e os riscos para acompanhar.`);
        if (pdtic) this.registrou.emit(pdtic);
      },
      error: erro => {
        this.registrando = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível registrar o PDTIC. Confira os dados e tente de novo.');
        if (mensagem === null) return;
        const status = (erro as { status?: number } | null)?.status;
        if (status === 409) {
          // O órgão já tem PDTIC (alguém registrou ou começou antes): o PDTIC dele vem de novo
          this.notificacoes.error(mensagem);
          this.estadoService.recarregarPdtic();
          return;
        }
        this.errosServidor = this.errosDoServidor(erro);
        const primeiro = ORDEM.find(c => !!this.errosServidor[c]);
        if (primeiro) {
          this.focoPendente = IDS[primeiro];
        } else {
          this.erroGeral = mensagem;
          this.focoPendente = 'pe-ext-erro-geral';
        }
      }
    });
  }

  private errosDoServidor(erro: unknown): Partial<Record<CampoExterno, string>> {
    const campos = (erro as { error?: { Campos?: unknown } } | null)?.error?.Campos;
    const erros: Partial<Record<CampoExterno, string>> = {};
    if (!campos || typeof campos !== 'object') return erros;
    for (const [chave, mensagem] of Object.entries(campos as Record<string, unknown>)) {
      const campo = CAMPO_DO_SERVIDOR[chave.toLowerCase()];
      if (campo && typeof mensagem === 'string' && mensagem.trim()) erros[campo] = mensagem.trim();
    }
    return erros;
  }
}
