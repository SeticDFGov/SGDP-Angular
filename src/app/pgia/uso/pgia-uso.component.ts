import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/services/auth';
import { UserProfile } from '../../../api/auth/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PgiaOperacaoService } from '../services/pgia-operacao.service';
import { PgiaRegistroUso, PgiaUsoFontes } from '../../../api/pgia/interface';
import { CitaDecretoDirective } from '../shared/cita-decreto.directive';
import { mensagemDoErro } from '../shared/mensagem-erro';

/** Data de hoje no fuso do navegador, no formato do input de data (aaaa-mm-dd). */
function hojeIso(): string {
  const d = new Date();
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

/**
 * Registro de uso de IA (art. 13, IV). É a única tela do PGIA aberta a qualquer
 * agente autenticado, com ou sem papel: por isso não chama getMeuOrgao nem as
 * listagens do inventário; tudo vem de conformidade/uso/fontes.
 */
@Component({
  selector: 'app-pgia-uso',
  standalone: true,
  imports: [CommonModule, FormsModule, CitaDecretoDirective],
  templateUrl: './pgia-uso.component.html'
})
export class PgiaUsoComponent implements OnInit {
  user: UserProfile | null = null;
  loading = true;

  fontes: PgiaUsoFontes | null = null;

  meusRegistros: PgiaRegistroUso[] = [];
  paginaAtual = 1;
  totalPaginas = 1;
  totalItens = 0;
  carregandoMais = false;

  /**
   * O select devolve uma chave única; o payload decide entre SistemaIaId e
   * PlataformaId a partir do prefixo.
   */
  fonteEscolhida: string | null = null;
  dataUso = '';
  produtoRef = '';
  processoSei = '';
  revisaoConfirmada = false;
  submetido = false;
  salvando = false;
  /** Limite do campo de data: o uso não pode ser depois de hoje. */
  readonly hoje = hojeIso();

  constructor(
    private authService: AuthService,
    private operacaoService: PgiaOperacaoService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      this.user = user;
      this.carregar();
    });
  }

  get temOrgao(): boolean {
    return !!this.fontes?.OrgaoId;
  }

  carregar(): void {
    this.loading = true;
    this.operacaoService.listarFontesUso().subscribe({
      next: (fontes) => {
        this.fontes = fontes;
        this.loading = false;
        // Sem órgão resolvido não há registros a listar nem a criar.
        if (fontes.OrgaoId) {
          this.carregarMeusRegistros();
        }
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.error(mensagemDoErro(err, 'Não foi possível carregar os sistemas e plataformas disponíveis.'));
      }
    });
  }

  carregarMeusRegistros(): void {
    this.operacaoService.listarMeusUsos(1).subscribe({
      next: (pagina) => {
        this.meusRegistros = pagina.Items ?? [];
        this.paginaAtual = pagina.CurrentPage ?? 1;
        this.totalPaginas = pagina.TotalPages ?? 1;
        this.totalItens = pagina.TotalItems ?? this.meusRegistros.length;
      },
      error: (err) => this.notificationService.error(mensagemDoErro(err, 'Não foi possível carregar os seus registros de uso.'))
    });
  }

  get temMaisPaginas(): boolean {
    return this.paginaAtual < this.totalPaginas;
  }

  carregarMais(): void {
    if (!this.temMaisPaginas || this.carregandoMais) return;
    this.carregandoMais = true;
    this.operacaoService.listarMeusUsos(this.paginaAtual + 1).subscribe({
      next: (pagina) => {
        this.meusRegistros = this.meusRegistros.concat(pagina.Items ?? []);
        this.paginaAtual = pagina.CurrentPage ?? this.paginaAtual + 1;
        this.totalPaginas = pagina.TotalPages ?? this.totalPaginas;
        this.totalItens = pagina.TotalItems ?? this.totalItens;
        this.carregandoMais = false;
      },
      error: (err) => {
        this.carregandoMais = false;
        this.notificationService.error(mensagemDoErro(err, 'Não foi possível carregar os seus registros de uso.'));
      }
    });
  }

  get errFonte(): boolean { return this.submetido && !this.fonteEscolhida; }
  get errData(): boolean { return this.submetido && !this.dataUso; }
  /** Datas no formato aaaa-mm-dd comparam como texto. */
  get errDataFutura(): boolean { return !!this.dataUso && this.dataUso > this.hoje; }
  get errProduto(): boolean { return this.submetido && !this.produtoRef.trim(); }

  registrarUso(): void {
    this.submetido = true;
    if (this.errFonte || this.errData || this.errProduto) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    if (this.errDataFutura) {
      this.notificationService.warning('A data não pode ser depois de hoje.');
      return;
    }
    if (!this.revisaoConfirmada) {
      this.notificationService.warning('Para registrar, confirme a declaração de revisão do conteúdo (art. 13, V).');
      return;
    }
    const escolha = this.fonteEscolhida ?? '';
    const ehPlataforma = escolha.startsWith('plataforma:');
    const id = Number(escolha.split(':')[1]);
    this.salvando = true;
    this.operacaoService.registrarUso({
      SistemaIaId: ehPlataforma ? null : id,
      PlataformaId: ehPlataforma ? id : null,
      ProdutoRef: this.produtoRef.trim(),
      ProcessoSei: this.processoSei.trim() || null,
      DataUso: this.dataUso,
      RevisaoHumanaConfirmada: true
    }).subscribe({
      next: () => {
        this.salvando = false;
        this.fonteEscolhida = null;
        this.dataUso = '';
        this.produtoRef = '';
        this.processoSei = '';
        this.revisaoConfirmada = false;
        this.submetido = false;
        this.carregarMeusRegistros();
        this.notificationService.success('Uso registrado. Obrigado por manter a rastreabilidade.');
      },
      error: (err) => {
        this.salvando = false;
        this.notificationService.error(mensagemDoErro(err, 'Não foi possível registrar o uso.'));
      }
    });
  }

  fonte(r: PgiaRegistroUso): string {
    return r.PlataformaNome ?? r.SistemaDenominacao ?? '-';
  }
}
