import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PePdtic, PeSituacaoPdtic } from '../../../api/planejamento/interface';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import { classeSituacaoPdtic, rotuloSituacaoPdtic } from '../shared/pe-pdtic-rotulos';
import { textoVigencia } from '../shared/pe-referenciais-rotulos';
import { textoDataHora } from '../shared/registros/pe-valores';
import { PeModeloService } from '../services/pe-modelo.service';
import { PePdticService } from '../services/pe-pdtic.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { BASE_PE } from '../trilha/pe-trilhas';

const TAMANHO_PAGINA = 20;

/** Situações para o filtro (o ciclo do PDTIC, na ordem do caminho da aprovação). */
const SITUACOES: PeSituacaoPdtic[] = [
  'em_elaboracao', 'devolvido', 'em_aprovacao', 'aprovado', 'publicado', 'em_acompanhamento', 'encerrado'
];

/**
 * Os PDTICs dos órgãos (segunda tela do passo "Analise o PDTIC de cada órgão"; o
 * administrador do módulo, a Secretaria do CGTIC e o admin do SGDP também veem):
 * a lista dos PDTICs atuais de todos os órgãos (GET pdtic, paginado), com a
 * situação e o nível, e o botão que abre a trilha do órgão (só para ler) para
 * comentar os passos; desde a E5, também "Ver o documento", que abre a trilha já
 * no passo do documento. Papel de órgão vê um aviso e a tela não consulta nada.
 *
 * F3 (correções): no modo livre (pelo `infoNiveis`), a coluna do nível passa a
 * "Nível alcançado", pelos `NivelAlcancadoId` e `NivelAlcancadoNome` de cada
 * item; sem os campos (a resposta anterior), fica o nível do órgão, como antes.
 */
@Component({
  selector: 'app-pe-pdtics-orgaos',
  standalone: true,
  imports: [CommonModule, FormsModule, CitaPlanejamentoDirective],
  templateUrl: './pe-pdtics-orgaos.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PePdticsOrgaosComponent implements OnInit {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly modeloService = inject(PeModeloService);
  private readonly pdticService = inject(PePdticService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly situacoes = SITUACOES;

  podeVer: boolean | null = null;
  erroPapel = false;
  private iniciado = false;

  /** F3: o modo dos níveis (sem a resposta do GET modelo, o definido). */
  private modoLivre = false;
  /** F3: a coluna mostra o nível alcançado (modo livre e a resposta com os campos novos). */
  colunaNivelAlcancado = false;
  /** F3: há na lista um PDTIC registrado fora do sistema, sem nível calculado (a nota embaixo explica). */
  temNaoCalculado = false;

  itens: PePdtic[] = [];
  total = 0;
  pagina = 1;
  temMais = false;
  carregando = false;
  erro: string | null = null;

  filtro = '';
  situacao: PeSituacaoPdtic | '' = '';
  /** Filtros congelados no "Buscar" (o "Carregar mais" usa os mesmos). */
  private aplicado: { filtro: string; situacao: PeSituacaoPdtic | '' } = { filtro: '', situacao: '' };

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        if (!estado || estado.carga !== 'pronta') return;
        this.erroPapel = estado.consultaPapel === 'erro';
        this.podeVer = this.estadoService.veDeliberacoes;
        if (this.podeVer && !this.iniciado) {
          this.iniciado = true;
          // F3: o modo dos níveis (sem a resposta, o definido: a coluna fica como antes)
          this.modeloService.infoNiveis().subscribe({
            next: info => {
              this.modoLivre = info.modo === 'livre';
              this.atualizarColunaNivel();
            },
            error: () => undefined
          });
          this.buscar();
        }
      });
  }

  /**
   * F3: o nível da linha. No modo livre, o que o PDTIC alcançou ("Sem nível alcançado"
   * sem ele; "Não calculado" no PDTIC registrado fora do sistema); senão, o do órgão.
   */
  nivel(p: PePdtic): string {
    if (!this.colunaNivelAlcancado) return p.NivelNome || '-';
    const alcancado = p.NivelAlcancadoNome?.trim();
    if (alcancado) return alcancado;
    return p.RegistradoExternamente ? 'Não calculado' : 'Sem nível alcançado';
  }

  /** Os campos novos vêm nos itens (nulos também contam: é a API nova). */
  private atualizarColunaNivel(): void {
    this.colunaNivelAlcancado = this.modoLivre
      && this.itens.some(p => p.NivelAlcancadoId !== undefined || p.NivelAlcancadoNome !== undefined);
    this.temNaoCalculado = this.colunaNivelAlcancado && this.itens.some(p => this.nivel(p) === 'Não calculado');
  }

  tentarPapelDeNovo(): void {
    this.estadoService.iniciar();
  }

  rotuloSituacao(s: string): string {
    return rotuloSituacaoPdtic(s);
  }

  classeSituacao(s: string): string {
    return classeSituacaoPdtic(s);
  }

  vigencia(p: PePdtic): string {
    return textoVigencia(p);
  }

  abertoEm(p: PePdtic): string {
    return textoDataHora(p.CriadoEm);
  }

  porId(_: number, p: PePdtic): number {
    return p.Id;
  }

  buscar(): void {
    this.aplicado = { filtro: this.filtro.trim(), situacao: this.situacao };
    this.itens = [];
    this.pagina = 1;
    this.carregar();
  }

  carregarMais(): void {
    if (!this.temMais || this.carregando) return;
    this.pagina++;
    this.carregar();
  }

  private carregar(): void {
    this.carregando = true;
    this.erro = null;
    this.pdticService.listar({
      Filtro: this.aplicado.filtro || null,
      Situacao: this.aplicado.situacao || null,
      Page: this.pagina,
      PageSize: TAMANHO_PAGINA
    }).subscribe({
      next: pagina => {
        this.carregando = false;
        this.itens = this.pagina === 1 ? [...pagina.Items] : [...this.itens, ...pagina.Items];
        this.total = pagina.TotalItems ?? this.itens.length;
        this.temMais = !!pagina.HasNextPage;
        this.atualizarColunaNivel();
      },
      error: erro => {
        this.carregando = false;
        if (this.pagina > 1) this.pagina--;
        this.erro = mensagemErroPe(erro, 'Não foi possível carregar os PDTICs dos órgãos.');
      }
    });
  }

  /** Abre a trilha do órgão, só para ler, onde cada passo tem os comentários. */
  abrirTrilha(p: PePdtic): void {
    this.estadoService.verOrgao(p.OrgaoId);
    this.router.navigate([BASE_PE]);
  }

  /**
   * Abre a trilha do órgão já no passo do documento (E5: a prévia, só para ler).
   * A trilha do órgão chega depois: a moldura tira esta tela do ar enquanto
   * carrega, então quem espera é a assinatura (não a tela), que se desfaz sozinha.
   * Se a pessoa for para outra tela antes, fica onde está.
   */
  verDocumento(p: PePdtic): void {
    const orgaoId = p.OrgaoId;
    const router = this.router;
    this.estadoService.verOrgao(orgaoId);
    router.navigate([BASE_PE]);
    let feito = false;
    const assinatura = this.estadoService.estado$.subscribe(estado => {
      if (feito || !estado || estado.orgaoVisto !== orgaoId || (estado.carga !== 'pronta' && estado.carga !== 'erro-trilha')) return;
      feito = true;
      const passo = estado.carga === 'pronta' ? estado.passos.find(x => x.doOrgao?.Tipo === 'documento') : null;
      if (passo && router.url.split('?')[0] === BASE_PE) router.navigate([passo.rota], { queryParams: { passo: passo.numero } });
      setTimeout(() => assinatura.unsubscribe());
    });
  }
}
