import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, PapeisPgia, Perfis } from '../../auth/services/auth';

export type AbaPgia = 'orgao' | 'sistemas' | 'incidentes' | 'uso' | 'capacitacao'
  | 'contratacoes' | 'relatorios' | 'solicitacoes' | 'prazos' | 'sgdi' | 'cgtic' | 'auditoria';

/**
 * Barra de navegação do PGIA, compartilhada pelas telas do órgão e das instâncias
 * centrais. Os itens da SGDI e do CGTIC aparecem apenas para quem tem o papel
 * (ou é admin) — a autorização real continua sendo do backend.
 */
@Component({
  selector: 'app-pgia-abas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pgia-abas.component.html'
})
export class PgiaAbasComponent implements OnInit {
  @Input() ativa: AbaPgia = 'orgao';

  veSgdi = false;
  veCgtic = false;
  /**
   * Telas de gestão do órgão e das instâncias centrais (capacitação, contratações
   * e relatórios). A entidade auditora externa não entra nelas.
   */
  veGestao = false;
  /** Área da entidade auditora externa: ela e o admin. */
  veAuditoria = false;
  /**
   * Agente sem papel no PGIA: entra só no aviso de problema e no registro de uso
   * (art. 13). As demais telas fazem GETs que o backend nega para ele.
   */
  semPapel = false;
  /** Entidade auditora externa: só a área dela e o registro de uso (art. 13). */
  isAuditoria = false;

  readonly classeAtiva = 'border border-blue-600 bg-blue-50 text-blue-700 font-bold rounded-lg px-4 py-2 text-sm';
  readonly classeInativa = 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      const papel = user?.PapelPgia ?? null;
      const isAdmin = user?.Perfil === Perfis.Admin;
      this.veSgdi = isAdmin || papel === PapeisPgia.Sgdi;
      this.veCgtic = isAdmin || papel === PapeisPgia.Cgtic;
      this.veGestao = isAdmin || papel === PapeisPgia.Orgao
        || papel === PapeisPgia.Sgdi || papel === PapeisPgia.Cgtic;
      this.veAuditoria = isAdmin || papel === PapeisPgia.Auditoria;
      this.semPapel = !papel && !isAdmin;
      this.isAuditoria = papel === PapeisPgia.Auditoria && !isAdmin;
    });
  }

  classe(aba: AbaPgia): string {
    return this.ativa === aba ? this.classeAtiva : this.classeInativa;
  }
}
