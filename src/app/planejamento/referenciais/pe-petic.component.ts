import { AfterViewChecked, Component, DestroyRef, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { PePetic, PeSecaoModelo } from '../../../api/planejamento/interface';
import { AcessibilidadeService } from '../../core/acessibilidade/acessibilidade.service';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { NotificationService } from '../../core/services/notification.service';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import { mensagemErroDownload, salvarResposta } from '../shared/pe-download';
import { modeloOrdenado } from '../shared/pe-modelo-arvore';
import {
  classeSituacaoPetic, quandoEQuem, resumoDeliberacao, rotuloSituacaoPetic, textoAto, textoVigencia
} from '../shared/pe-referenciais-rotulos';
import { PeSecaoRegistrosComponent } from '../shared/registros/pe-secao-registros.component';
import { dataValida, textoData } from '../shared/registros/pe-valores';
import { PeModeloService } from '../services/pe-modelo.service';
import { PePeticService } from '../services/pe-petic.service';
import { PeFonteRegistros, PeRegistrosService } from '../services/pe-registros.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';

/** Janela do rascunho novo ou do título e vigência da versão. */
interface JanelaVersao {
  modo: 'novo' | 'dados';
  versao: PePetic | null;
  titulo: string;
  inicio: string;
  fim: string;
  copiar: boolean;
  tentou: boolean;
}

/** Tamanho do título (o servidor confere de novo). */
const MAX_TITULO = 200;

const TITULO_PADRAO = 'Plano Estratégico de TIC do Distrito Federal';

/** Nome de um item de cada seção semeada do PETIC ("Incluir objetivo estratégico"). */
const ITEM_DA_SECAO: Record<string, string> = {
  petic_diretriz: 'diretriz',
  petic_objetivo_programa: 'objetivo do programa',
  petic_objetivo: 'objetivo estratégico',
  petic_prioridade: 'prioridade',
  petic_indicador: 'indicador',
  petic_iniciativa: 'iniciativa',
  petic_eixo: 'eixo'
};

/**
 * PETIC-DF (passo 2.2 do administrador do módulo; leitura para os demais papéis):
 * as versões (vigente, rascunho e histórico), a edição do rascunho seção a seção
 * com os componentes genéricos de registros, o envio ao CGTIC, a situação da
 * deliberação e as planilhas (por seção e completa).
 *
 * - As seções vêm do modelo (seções de escopo `petic` que não estão desligadas),
 *   uma de cada vez: `?secao=` na URL. A versão aberta é `?versao=` (a fila do
 *   CGTIC abre a versão enviada por aqui).
 * - Rascunho: um por vez; nasce da vigente (com os registros e os códigos) ou
 *   vazio. Só o administrador do módulo e o admin do SGDP criam, editam, enviam e
 *   apagam (o que nunca foi enviado). Aprovada pelo comitê, a versão passa a valer
 *   e a anterior fica como histórico; devolvida, volta a rascunho.
 * - Papéis de órgão veem só as versões aprovadas (a vigente e as substituídas).
 */
@Component({
  selector: 'app-pe-petic',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaPlanejamentoDirective, DialogoDirective, PeSecaoRegistrosComponent],
  templateUrl: './pe-petic.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PePeticComponent implements OnInit, AfterViewChecked {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly peticService = inject(PePeticService);
  private readonly modeloService = inject(PeModeloService);
  private readonly registrosService = inject(PeRegistrosService);
  private readonly notificacoes = inject(NotificationService);
  private readonly acessibilidade = inject(AcessibilidadeService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly maxTitulo = MAX_TITULO;

  /** Administrador do módulo ou admin do SGDP: cria, edita, envia e apaga o rascunho. */
  podeEditar = false;
  erroPapel = false;
  private soAprovadas = false;

  versoes: PePetic[] = [];
  secoes: PeSecaoModelo[] = [];
  carregando = false;
  erroCarga: string | null = null;
  /** A primeira carga já saiu (com o papel conferido). */
  iniciado = false;

  /** Pedidos da URL. */
  private versaoPedida: number | null = null;
  private secaoPedida: string | null = null;

  fonte: PeFonteRegistros | null = null;
  private chaveFonte = '';

  janela: JanelaVersao | null = null;
  salvandoJanela = false;
  enviando = false;
  apagando = false;
  baixandoCompleta = false;
  private sujo = false;
  private focoPendente: string | null = null;

  ngOnInit(): void {
    this.rota.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const versao = Number(params.get('versao'));
        this.versaoPedida = Number.isInteger(versao) && versao > 0 ? versao : null;
        this.secaoPedida = params.get('secao');
        this.atualizarFonte();
      });
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        if (!estado || estado.carga !== 'pronta') return;
        this.erroPapel = estado.consultaPapel === 'erro';
        this.podeEditar = this.estadoService.podeConfigurar === true;
        this.soAprovadas = this.estadoService.ehPapelDeOrgao;
        // A consulta do PETIC serve a qualquer papel do módulo: sai com o papel conferido
        if (estado.consultaPapel !== 'carregando' && !this.iniciado) {
          this.iniciado = true;
          this.carregar();
        }
      });
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  tentarPapelDeNovo(): void {
    this.estadoService.iniciar();
  }

  // ── Carga ─────────────────────────────────────────────────────────────────

  carregar(depois?: () => void): void {
    this.carregando = true;
    this.erroCarga = null;
    forkJoin({ versoes: this.peticService.listar(), modelo: this.modeloService.modelo() }).subscribe({
      next: ({ versoes, modelo }) => {
        this.carregando = false;
        this.aplicarVersoes(versoes);
        this.secoes = modeloOrdenado(modelo).SecoesForaDoPdtic
          .filter(s => s.Escopo === 'petic' && !s.Excluido && s.SituacaoGeral !== 'desligado');
        this.atualizarFonte();
        depois?.();
      },
      error: erro => {
        this.carregando = false;
        this.erroCarga = mensagemErroPe(erro, 'Não foi possível carregar o PETIC-DF.');
      }
    });
  }

  private aplicarVersoes(versoes: PePetic[]): void {
    const visiveis = this.soAprovadas ? versoes.filter(v => v.Situacao === 'aprovado' || v.Situacao === 'substituido') : versoes;
    this.versoes = [...visiveis];
  }

  // ── Versões ───────────────────────────────────────────────────────────────

  get vigente(): PePetic | null {
    return this.versoes.find(v => v.Situacao === 'aprovado') ?? null;
  }

  get rascunho(): PePetic | null {
    return this.versoes.find(v => v.Situacao === 'rascunho') ?? null;
  }

  get comOComite(): PePetic | null {
    return this.versoes.find(v => v.Situacao === 'em_deliberacao') ?? null;
  }

  /**
   * A versão aberta: a pedida na URL; senão o rascunho (para quem edita) ou a que
   * está com o comitê, a vigente e, por fim, a mais nova.
   */
  get selecionada(): PePetic | null {
    const pedida = this.versoes.find(v => v.Id === this.versaoPedida);
    if (pedida) return pedida;
    return (this.podeEditar ? this.rascunho : null) ?? this.vigente ?? this.comOComite ?? this.versoes[0] ?? null;
  }

  get podeCriar(): boolean {
    return this.podeEditar && !this.rascunho && !this.comOComite;
  }

  get motivoNaoCria(): string | null {
    if (!this.podeEditar) return null;
    if (this.rascunho) return `Já existe um rascunho (versão ${this.rascunho.Versao}): continue nele.`;
    if (this.comOComite) return `A versão ${this.comOComite.Versao} está com o CGTIC. Espere a decisão para criar outro rascunho.`;
    return null;
  }

  /** Rascunho que quem está logado edita. */
  editavel(v: PePetic): boolean {
    return this.podeEditar && v.Situacao === 'rascunho';
  }

  /** Só o rascunho que nunca foi enviado se apaga. */
  apagavel(v: PePetic): boolean {
    return this.editavel(v) && !v.Deliberacao;
  }

  devolvida(v: PePetic): boolean {
    return v.Situacao === 'rascunho' && v.Deliberacao?.Situacao === 'devolvido';
  }

  rotuloSituacao(v: PePetic): string {
    return rotuloSituacaoPetic(v.Situacao);
  }

  classeSituacao(v: PePetic): string {
    return classeSituacaoPetic(v.Situacao);
  }

  vigencia(v: PePetic): string {
    return textoVigencia(v);
  }

  resumoDeliberacao(v: PePetic): string {
    return resumoDeliberacao(v.Deliberacao);
  }

  enviadaEm(v: PePetic): string {
    const d = v.Deliberacao;
    return d ? quandoEQuem(d.EnviadoEm, d.EnviadoPor) : '-';
  }

  decididaEm(v: PePetic): string {
    const d = v.Deliberacao;
    if (!d) return v.AprovadoEm ? textoData(v.AprovadoEm) : '-';
    return d.DecididoEm ? quandoEQuem(d.DecididoEm, d.DecididoPor) : (v.AprovadoEm ? textoData(v.AprovadoEm) : '-');
  }

  ato(v: PePetic): string {
    return v.Deliberacao ? textoAto(v.Deliberacao) : '';
  }

  porId(_: number, v: PePetic): number {
    return v.Id;
  }

  porChave(_: number, s: PeSecaoModelo): string {
    return s.Chave;
  }

  // ── Seções ────────────────────────────────────────────────────────────────

  /** A seção aberta: a pedida na URL (se existe no modelo), senão a primeira. */
  get secaoAtual(): PeSecaoModelo | null {
    return this.secoes.find(s => s.Chave === this.secaoPedida) ?? this.secoes[0] ?? null;
  }

  rotuloItem(secao: PeSecaoModelo): string {
    return ITEM_DA_SECAO[secao.Chave] ?? 'registro';
  }

  nomePlanilha(v: PePetic, secao: PeSecaoModelo): string {
    return `PETIC-DF_${v.Versao}_${secao.Chave}`;
  }

  /** Por que a pessoa só lê a versão aberta. */
  avisoLeitura(v: PePetic): string {
    switch (v.Situacao) {
      case 'em_deliberacao': return 'Esta versão está com o CGTIC: não muda enquanto o comitê não decidir.';
      case 'aprovado': return this.podeEditar
        ? 'Esta é a versão vigente e não muda. Para atualizar o PETIC-DF, crie um rascunho a partir dela.'
        : 'Esta é a versão vigente. Você pode consultar e baixar a planilha.';
      case 'substituido': return 'Esta versão foi substituída por uma mais nova: fica só para consulta.';
      default: return 'Este rascunho está sendo preparado pelo administrador do módulo. Você pode consultar e baixar a planilha.';
    }
  }

  /** A fonte dos registros da versão aberta; a situação entra na chave (mudou, a seção busca de novo). */
  private atualizarFonte(): void {
    const v = this.selecionada;
    const chave = v ? `${v.Id}:${v.Situacao}` : '';
    if (chave === this.chaveFonte) return;
    this.chaveFonte = chave;
    this.fonte = v ? this.registrosService.fonte({ tipo: 'petic', id: v.Id }, v.Situacao) : null;
    this.sujo = false;
  }

  // ── Navegação dentro da tela ──────────────────────────────────────────────

  irParaVersao(v: PePetic): void {
    if (v.Id === this.selecionada?.Id || !this.podeTrocar()) return;
    this.navegar({ versao: v.Id });
  }

  irParaSecao(secao: PeSecaoModelo): void {
    if (secao.Chave === this.secaoAtual?.Chave || !this.podeTrocar()) return;
    this.navegar({ secao: secao.Chave });
  }

  private navegar(params: Record<string, string | number | null>, trocar = false): void {
    this.router.navigate([], { relativeTo: this.rota, queryParams: params, queryParamsHandling: 'merge', replaceUrl: trocar });
  }

  private podeTrocar(): boolean {
    if (!this.sujo) return true;
    if (!confirm('Há mudanças que ainda não foram salvas nesta seção. Sair dela assim mesmo? Elas vão se perder.')) return false;
    this.sujo = false;
    return true;
  }

  aoAlterar(sujo: boolean): void {
    this.sujo = sujo;
  }

  /** Guarda de rota: mudança não salva na seção aberta. */
  podeSair(): boolean {
    return !this.sujo || confirm('Há mudanças que ainda não foram salvas. Sair assim mesmo? Elas vão se perder.');
  }

  // ── Rascunho novo, título e vigência ─────────────────────────────────────

  abrirNovo(): void {
    if (!this.podeCriar) return;
    const base = this.vigente;
    this.janela = {
      modo: 'novo', versao: null, titulo: base?.Titulo ?? TITULO_PADRAO,
      inicio: base?.VigenciaInicio ?? '', fim: base?.VigenciaFim ?? '', copiar: !!base, tentou: false
    };
  }

  abrirDados(v: PePetic): void {
    if (!this.editavel(v)) return;
    this.janela = {
      modo: 'dados', versao: v, titulo: v.Titulo, inicio: v.VigenciaInicio ?? '', fim: v.VigenciaFim ?? '',
      copiar: false, tentou: false
    };
  }

  fecharJanela(): void {
    if (!this.salvandoJanela) this.janela = null;
  }

  erroJanela(campo: 'titulo' | 'inicio' | 'fim'): string | null {
    const j = this.janela;
    if (!j || !j.tentou) return null;
    if (campo === 'titulo') {
      if (!j.titulo.trim()) return 'Escreva o título.';
      return j.titulo.trim().length > MAX_TITULO ? `Escreva até ${MAX_TITULO} caracteres.` : null;
    }
    const valor = campo === 'inicio' ? j.inicio : j.fim;
    if (valor && !dataValida(valor)) return 'Informe uma data válida (dia, mês e ano).';
    if (campo === 'fim' && j.inicio && j.fim && dataValida(j.inicio) && dataValida(j.fim) && j.fim < j.inicio) {
      return 'O fim da vigência vem depois do início.';
    }
    return null;
  }

  get errosJanela(): string[] {
    return (['titulo', 'inicio', 'fim'] as const).map(c => this.erroJanela(c)).filter((e): e is string => !!e);
  }

  salvarJanela(): void {
    const j = this.janela;
    if (!j || this.salvandoJanela) return;
    j.tentou = true;
    if (this.errosJanela.length) {
      this.focoPendente = 'pe-petic-janela-erros';
      return;
    }
    const corpo = { Titulo: j.titulo.trim(), VigenciaInicio: j.inicio || null, VigenciaFim: j.fim || null };
    const pedido = j.modo === 'novo'
      ? this.peticService.criar({ ...corpo, CopiarDaVigente: j.copiar && !!this.vigente })
      : this.peticService.atualizar(j.versao!.Id, corpo);
    this.salvandoJanela = true;
    pedido.subscribe({
      next: versao => {
        this.salvandoJanela = false;
        this.janela = null;
        if (j.modo === 'novo') {
          this.notificacoes.success(`Rascunho da versão ${versao.Versao} criado. Preencha as seções e envie ao CGTIC.`);
          this.estadoService.atualizarStatus(true);
          this.carregar(() => this.navegar({ versao: versao.Id }));
        } else {
          this.substituir(versao);
          this.notificacoes.success('Título e vigência salvos.');
        }
      },
      error: erro => {
        this.salvandoJanela = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível salvar. Confira os dados e tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
        // 409 no rascunho novo: outra pessoa criou antes; a lista vem de novo
        if ((erro as { status?: number } | null)?.status === 409 && j.modo === 'novo') {
          this.janela = null;
          this.carregar();
        }
      }
    });
  }

  // ── Envio, exclusão e planilha completa ───────────────────────────────────

  enviar(v: PePetic): void {
    if (!this.editavel(v) || this.enviando) return;
    if (this.sujo) {
      this.notificacoes.warning('Salve (ou desfaça) as mudanças da seção aberta antes de enviar.');
      return;
    }
    if (!confirm(`Enviar a versão ${v.Versao} do PETIC-DF ao CGTIC? Depois de enviada, ela não muda até o comitê decidir.`)) return;
    this.enviando = true;
    this.peticService.enviar(v.Id).subscribe({
      next: versao => {
        this.enviando = false;
        this.notificacoes.success(`Versão ${versao?.Versao ?? v.Versao} enviada ao CGTIC. A Secretaria do comitê registra a decisão.`);
        this.acessibilidade.anunciar(`Versão ${v.Versao} enviada ao CGTIC.`);
        this.estadoService.atualizarStatus(true);
        // A lista vem de novo para a deliberação criada aparecer inteira; a versão enviada segue aberta
        this.carregar(() => this.navegar({ versao: v.Id }, true));
      },
      error: erro => {
        this.enviando = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível enviar ao CGTIC. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  apagar(v: PePetic): void {
    if (!this.apagavel(v) || this.apagando) return;
    if (!confirm(`Apagar o rascunho da versão ${v.Versao}? Tudo o que foi preenchido nele sai junto, e não dá para desfazer.`)) return;
    this.apagando = true;
    this.peticService.apagar(v.Id).subscribe({
      next: () => {
        this.apagando = false;
        this.sujo = false;
        this.notificacoes.success(`Rascunho da versão ${v.Versao} apagado.`);
        this.estadoService.atualizarStatus(true);
        this.carregar(() => this.navegar({ versao: null }, true));
      },
      error: erro => {
        this.apagando = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível apagar o rascunho. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  /** O XLSX com uma aba por seção e a aba Leia-me (por blob, com o nome do servidor). */
  baixarCompleta(v: PePetic): void {
    if (this.baixandoCompleta) return;
    this.baixandoCompleta = true;
    this.registrosService.planilhaCompleta({ tipo: 'petic', id: v.Id }).subscribe({
      next: resposta => {
        this.baixandoCompleta = false;
        salvarResposta(resposta, `PETIC-DF_${v.Versao}.xlsx`);
      },
      error: erro => {
        this.baixandoCompleta = false;
        mensagemErroDownload(erro, 'Não foi possível gerar a planilha completa. Tente de novo.').then(m => {
          if (m) this.notificacoes.error(m);
        });
      }
    });
  }

  private substituir(versao: PePetic): void {
    this.versoes = this.versoes.map(v => (v.Id === versao.Id ? versao : v));
    this.atualizarFonte();
  }
}
