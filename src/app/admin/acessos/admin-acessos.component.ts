import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcessosService } from './acessos.service';
import { UnidadeService } from '../../auth/unidade/unidade.service';
import { NotificationService } from '../../core/services/notification.service';
import { PapeisContratacoes, PapeisPgia } from '../../auth/services/auth';
import { Unidade } from '../../../api/auth/interface';
import {
  AcessoUsuarioForm,
  FILTRO_SEM_ACESSO,
  PaginaUsuariosAcesso,
  UsuarioAcesso
} from '../../../api/acessos/interface';
import { MODULOS, Modulos, ModuloId, ModuloSgdp } from '../../core/modulos/modulos';
import { OPCOES_PAPEL_PGIA, rotuloCurtoPapelPgia } from '../../core/acessos/papeis-pgia';

interface EdicaoAcesso {
  usuario: UsuarioAcesso;
  form: AcessoUsuarioForm;
  unidadeId: string | null;
}

/**
 * Gestão de acessos por módulo: quem enxerga Demandas, PGIA e Supervisão Contínua.
 * O acesso de cada pessoa soma o Keycloak (perfis admin/gestor e a role "pgia" do
 * grupo; só leitura aqui, com o retrato do último login) e o que é concedido
 * nesta tela. A API recusa o que não foi liberado (política por módulo).
 */
@Component({
  selector: 'app-admin-acessos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-acessos.component.html'
})
export class AdminAcessosComponent implements OnInit {
  private readonly acessosService = inject(AcessosService);
  private readonly unidadeService = inject(UnidadeService);
  private readonly notificacoes = inject(NotificationService);

  readonly modulos: ModuloSgdp[] = MODULOS;
  readonly opcoesPapelPgia = OPCOES_PAPEL_PGIA;
  readonly filtroSemAcesso = FILTRO_SEM_ACESSO;
  readonly M = Modulos;

  filtro = '';
  moduloFiltro = '';
  page = 1;
  readonly pageSize = 20;

  pagina: PaginaUsuariosAcesso | null = null;
  carregando = false;
  erroCarga = false;

  unidades: Unidade[] = [];

  edicao: EdicaoAcesso | null = null;
  salvando = false;
  alterandoUnidade = false;

  ngOnInit(): void {
    this.buscar();
    this.unidadeService.getAllUnidades().subscribe({
      next: unidades => this.unidades = [...unidades].sort((a, b) => a.Nome.localeCompare(b.Nome)),
      error: () => this.unidades = []
    });
  }

  // ── Listagem ──────────────────────────────────────────────────────────────

  buscar(page = 1): void {
    this.page = page;
    this.carregando = true;
    this.erroCarga = false;
    this.acessosService.listarUsuarios({
      Filtro: this.filtro,
      Modulo: this.moduloFiltro || null,
      Page: this.page,
      PageSize: this.pageSize
    }).subscribe({
      next: pagina => {
        this.pagina = pagina;
        this.carregando = false;
        // A pessoa em edição pode ter saído da página: fecha o editor
        if (this.edicao && !pagina.Items.some(u => u.Id === this.edicao!.usuario.Id)) this.edicao = null;
      },
      error: () => {
        this.carregando = false;
        this.erroCarga = true;
      }
    });
  }

  limpar(): void {
    this.filtro = '';
    this.moduloFiltro = '';
    this.buscar();
  }

  get inicioPagina(): number {
    return this.pagina && this.pagina.TotalItems > 0 ? (this.pagina.CurrentPage - 1) * this.pagina.PageSize + 1 : 0;
  }

  get fimPagina(): number {
    return this.pagina ? Math.min(this.pagina.CurrentPage * this.pagina.PageSize, this.pagina.TotalItems) : 0;
  }

  // ── Situação de cada módulo na linha ──────────────────────────────────────

  temModulo(u: UsuarioAcesso, modulo: ModuloId): boolean {
    return u.Modulos.includes(modulo);
  }

  noKeycloak(u: UsuarioAcesso, modulo: string): boolean {
    return u.Keycloak.some(a => a.Modulo === modulo);
  }

  concedido(u: UsuarioAcesso, modulo: string): boolean {
    return u.Concedidos.some(a => a.Modulo === modulo);
  }

  /** De onde vem o acesso (texto curto da célula). */
  origem(u: UsuarioAcesso, modulo: ModuloId): string {
    if (this.noKeycloak(u, Modulos.Administracao)) return 'Admin (Keycloak)';
    switch (modulo) {
      case Modulos.Demandas:
        if (this.noKeycloak(u, Modulos.Demandas)) return 'Perfil gestor (Keycloak)';
        return 'Consulta (concedido)';
      case Modulos.Pgia:
        if (u.PapelPgia) return this.rotuloPapel(u.PapelPgia);
        if (this.concedido(u, Modulos.Pgia)) return 'Agente (concedido)';
        return 'Agente (grupo do Keycloak)';
      case Modulos.Contratacoes:
        return 'Supervisão contínua';
      default:
        return 'Keycloak';
    }
  }

  rotuloPapel(papel: string | null): string {
    return rotuloCurtoPapelPgia(papel);
  }

  // ── Edição ────────────────────────────────────────────────────────────────

  editar(u: UsuarioAcesso): void {
    if (this.edicao?.usuario.Id === u.Id) {
      this.edicao = null;
      return;
    }
    this.edicao = {
      usuario: u,
      unidadeId: u.UnidadeId,
      form: {
        Demandas: this.concedido(u, Modulos.Demandas),
        Pgia: this.concedido(u, Modulos.Pgia) || !!u.PapelPgia,
        PapelPgia: u.PapelPgia,
        Contratacoes: u.PapelContratacoes === PapeisContratacoes.Analise
      }
    };
  }

  alternarPgia(ligado: boolean): void {
    if (!this.edicao) return;
    this.edicao.form.Pgia = ligado;
    // Sem o módulo, não há papel dentro dele
    if (!ligado) this.edicao.form.PapelPgia = null;
  }

  get papelOrgaoSemUnidade(): boolean {
    return !!this.edicao && this.edicao.form.PapelPgia === PapeisPgia.Orgao && !this.edicao.unidadeId;
  }

  salvar(): void {
    if (!this.edicao || this.salvando) return;
    const { usuario, form } = this.edicao;

    // Retirar o PGIA de quem tem papel também tira o papel: confirma antes
    if (!form.Pgia && usuario.PapelPgia) {
      const ok = confirm(`Ao retirar o acesso ao PGIA, ${usuario.Nome} perde também o papel "${this.rotuloPapel(usuario.PapelPgia)}". Continuar?`);
      if (!ok) return;
    }

    this.salvando = true;
    this.acessosService.definirAcessos(usuario.Id, {
      Demandas: form.Demandas,
      Pgia: form.Pgia,
      PapelPgia: form.Pgia ? form.PapelPgia : null,
      Contratacoes: form.Contratacoes
    }).subscribe({
      next: atualizado => {
        this.salvando = false;
        this.substituirNaPagina(atualizado);
        this.edicao = null;
        this.notificacoes.success(`Acessos de ${atualizado.Nome} atualizados. Valem no próximo clique da pessoa, sem precisar sair e entrar de novo.`);
      },
      error: err => {
        this.salvando = false;
        this.notificacoes.error(err?.error?.Message || 'Não foi possível salvar os acessos. Tente de novo.');
      }
    });
  }

  alterarUnidade(): void {
    if (!this.edicao || !this.edicao.unidadeId || this.alterandoUnidade) return;
    const { usuario, unidadeId } = this.edicao;
    this.alterandoUnidade = true;
    this.acessosService.alterarUnidade(usuario.Email, unidadeId).subscribe({
      next: () => {
        this.alterandoUnidade = false;
        const unidade = this.unidades.find(x => x.id === unidadeId);
        const atualizado: UsuarioAcesso = { ...usuario, UnidadeId: unidadeId, UnidadeNome: unidade?.Nome ?? usuario.UnidadeNome };
        this.substituirNaPagina(atualizado);
        if (this.edicao) this.edicao.usuario = atualizado;
        this.notificacoes.success(`Unidade de ${usuario.Nome} alterada.`);
      },
      error: () => {
        this.alterandoUnidade = false;
        this.notificacoes.error('Não foi possível alterar a unidade.');
      }
    });
  }

  private substituirNaPagina(atualizado: UsuarioAcesso): void {
    if (!this.pagina) return;
    this.pagina = {
      ...this.pagina,
      Items: this.pagina.Items.map(u => u.Id === atualizado.Id ? atualizado : u)
    };
  }
}
