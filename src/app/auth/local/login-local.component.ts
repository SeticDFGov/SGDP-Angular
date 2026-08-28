import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';
import { NotificationService } from '../../core/services/notification.service';

interface PersonaLocal {
  Email: string;
  Nome: string;
  Perfil: string;
  Descricao: string;
  PapelPgia?: string;
  VincularAoOrgaoDeTeste?: boolean;
  Rota?: string; // destino pós-login; sem ela, vale a navegação padrão por perfil
}

/**
 * MODO LOCAL (execução independente, sem Keycloak) — somente testes.
 * Só funciona quando o backend sobe com Auth:ModoLocal=true (Development);
 * fora disso o endpoint devolve 404 e esta tela avisa.
 * O backend provisiona papel PGIA, unidade e o Órgão de Teste na emissão do
 * token, então cada persona entra direto na visão do seu papel.
 */
@Component({
  selector: 'app-login-local',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login-local.component.html'
})
export class LoginLocalComponent {
  personas: PersonaLocal[] = [
    { Email: 'admin@local.teste', Nome: 'Ana Admin', Perfil: 'admin', Descricao: 'Administra unidades, órgãos e papéis PGIA' },
    { Email: 'gestor@local.teste', Nome: 'Gabriel Gestor', Perfil: 'gestor', Descricao: 'Perfil gestor do SGDP' },
    { Email: 'centralit@local.teste', Nome: 'Carla CentralIT', Perfil: 'centralit', Descricao: 'Página dedicada /centralit' },
    { Email: 'parceiro@local.teste', Nome: 'Paulo Parceiro', Perfil: 'parceiro', Descricao: 'Página dedicada /parceiro' },
    { Email: 'basico@local.teste', Nome: 'Bruna Básico', Perfil: 'basico', Descricao: 'Sem perfil válido: cai no pending-approval até ganhar papel PGIA' }
  ];

  // Uma persona por papel do Decreto 48.901/2026, já entrando na tela do papel.
  // Órgão e agente ficam na unidade do "Órgão de Teste do PGIA" (criado com os
  // prazos de adesão); SGDI/CGTIC/auditoria ficam numa unidade central sem órgão.
  personasPgia: PersonaLocal[] = [
    {
      Email: 'orgao@local.teste', Nome: 'Otávio do Órgão', Perfil: 'basico',
      PapelPgia: 'pgia_orgao', VincularAoOrgaoDeTeste: true, Rota: '/pgia',
      Descricao: 'Órgão responsável: informações do órgão, inventário e risco, incidentes, prazos, capacitação, contratações, relatórios e solicitações do cidadão'
    },
    {
      Email: 'sgdi@local.teste', Nome: 'Sofia da SGDI', Perfil: 'basico',
      PapelPgia: 'pgia_sgdi', Rota: '/pgia/sgdi',
      Descricao: 'Governança central: homologação com pesos e pontuação, plataformas, Registro Público, AIAs, apurações e auditorias'
    },
    {
      Email: 'cgtic@local.teste', Nome: 'Caio do CGTIC', Perfil: 'basico',
      PapelPgia: 'pgia_cgtic', Rota: '/pgia/cgtic',
      Descricao: 'Comitê: casos delegados de Alto Risco e Risco Excessivo, deliberações e autorizações'
    },
    {
      Email: 'agente@local.teste', Nome: 'Alice Agente Pública', Perfil: 'gestor',
      VincularAoOrgaoDeTeste: true, Rota: '/pgia/uso',
      Descricao: 'Servidora do órgão SEM papel PGIA: só registra uso de IA e avisa incidentes (art. 13), além do SGDP normal'
    },
    {
      Email: 'auditoria@local.teste', Nome: 'Aurélio Auditor', Perfil: 'basico',
      PapelPgia: 'pgia_auditoria', Rota: '/pgia/auditoria',
      Descricao: 'Auditoria externa: enxerga somente as auditorias designadas a ela'
    }
  ];

  perfis = ['admin', 'gestor', 'centralit', 'parceiro', 'basico'];
  papeisPgia = ['pgia_orgao', 'pgia_sgdi', 'pgia_cgtic', 'pgia_auditoria'];

  form: { Email: string; Nome: string; Perfil: string; PapelPgia: string } =
    { Email: '', Nome: '', Perfil: 'gestor', PapelPgia: '' };
  entrando = false;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  entrarComo(persona: PersonaLocal): void {
    this.entrando = true;
    this.authService.loginLocal({
      Email: persona.Email,
      Nome: persona.Nome,
      Perfil: persona.Perfil,
      PapelPgia: persona.PapelPgia ?? null,
      VincularAoOrgaoDeTeste: persona.VincularAoOrgaoDeTeste ?? false
    }).subscribe({
      next: () => {
        this.entrando = false;
        this.router.navigate([persona.Rota ?? this.rotaPadrao(persona.Perfil)]);
      },
      error: (err) => this.tratarErro(err)
    });
  }

  entrar(): void {
    if (!this.form.Email.trim() || !this.form.Nome.trim()) {
      this.notificationService.warning('Informe e-mail e nome do usuário de teste.');
      return;
    }
    this.entrando = true;
    const papel = this.form.PapelPgia || null;
    this.authService.loginLocal({
      Email: this.form.Email,
      Nome: this.form.Nome,
      Perfil: this.form.Perfil,
      PapelPgia: papel,
      // Papel de órgão só faz sentido dentro de um órgão de teste
      VincularAoOrgaoDeTeste: papel === 'pgia_orgao'
    }).subscribe({
      next: () => {
        this.entrando = false;
        this.router.navigate([papel ? '/pgia' : this.rotaPadrao(this.form.Perfil)]);
      },
      error: (err) => this.tratarErro(err)
    });
  }

  abrirPaginaPublica(): void {
    this.router.navigate(['/transparencia-ia']);
  }

  private rotaPadrao(perfil: string): string {
    if (perfil === 'centralit') return '/centralit';
    if (perfil === 'parceiro') return '/parceiro';
    return '/demandas';
  }

  private tratarErro(err: any): void {
    this.entrando = false;
    if (err?.status === 404) {
      this.notificationService.error('O modo local está desligado no backend. Suba a API com Auth__ModoLocal=true (só em Development).');
    } else {
      this.notificationService.error('Não foi possível entrar no modo local. A API está rodando em http://localhost:5148?');
    }
  }
}
