import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';
import { NotificationService } from '../../core/services/notification.service';
import { OPCOES_PAPEL_PLANEJAMENTO, PapeisPlanejamento } from '../../core/acessos/papeis-planejamento';

interface PersonaLocal {
  Email: string;
  Nome: string;
  Perfil: string;
  Descricao: string;
  PapelPgia?: string;
  PapelContratacoes?: string;
  VincularAoOrgaoDeTeste?: boolean;
  // Acessos concedidos no sistema (como a tela de Gestão de acessos faria)
  ConcederModulos?: string[];
  // Papel na Governança Estratégica: o back-end grava o papel e o acesso juntos
  PapelPlanejamento?: string;
}

/**
 * Persona da Governança Estratégica: manda só o papel (o back-end dá o acesso junto,
 * põe os papéis de órgão na unidade SES e os globais na Unidade Central de Teste).
 * Nada de VincularAoOrgaoDeTeste, que daria a role do PGIA e o órgão de teste.
 */
function personaPlanejamento(Email: string, Nome: string, PapelPlanejamento: string, Descricao: string): PersonaLocal {
  return { Email, Nome, Perfil: 'basico', PapelPlanejamento, Descricao };
}

/**
 * MODO LOCAL (execução independente, sem Keycloak): somente testes.
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
  // Isolamento entre módulos: o que cada um enxerga na tela inicial depende só dos
  // acessos dele (roles do token + concessões do sistema + papéis de módulo).
  personasIsolamento: PersonaLocal[] = [
    {
      Email: 'basico@local.teste', Nome: 'Bruna Básico', Perfil: 'basico',
      Descricao: 'Entrou só pelo login, sem nenhum acesso: vê os três módulos em cinza (a Administração nem aparece) e pede acesso pelo card'
    },
    {
      Email: 'demandas@local.teste', Nome: 'Débora Demandas', Perfil: 'basico', ConcederModulos: ['demandas'],
      Descricao: 'Só Demandas e Projetos, em modo consulta, com acesso concedido pela tela de Gestão de acessos'
    },
    {
      Email: 'multi@local.teste', Nome: 'Marina Multimódulo', Perfil: 'gestor',
      PapelPgia: 'pgia_orgao', VincularAoOrgaoDeTeste: true, PapelContratacoes: 'ctr_analise',
      Descricao: 'Três módulos: Demandas (perfil gestor), PGIA (papel de órgão) e Supervisão Contínua'
    }
  ];

  personas: PersonaLocal[] = [
    { Email: 'admin@local.teste', Nome: 'Ana Admin', Perfil: 'admin', Descricao: 'Todos os módulos, inclusive a Administração (pedidos de acesso, gestão de acessos e cadastros)' },
    { Email: 'gestor@local.teste', Nome: 'Gabriel Gestor', Perfil: 'gestor', Descricao: 'Perfil gestor do Keycloak: só Demandas e Projetos, criando e editando' }
  ];

  // Uma persona por papel do Decreto 48.901/2026, já entrando na tela do papel.
  // Órgão e agente ficam na unidade do "Órgão de Teste do PGIA" (criado com os
  // prazos de adesão); SGDI/CGTIC/auditoria ficam numa unidade central sem órgão.
  personasPgia: PersonaLocal[] = [
    {
      Email: 'orgao@local.teste', Nome: 'Otávio do Órgão', Perfil: 'basico',
      PapelPgia: 'pgia_orgao', VincularAoOrgaoDeTeste: true,
      Descricao: 'Órgão responsável: informações do órgão, inventário e risco, incidentes, prazos, capacitação, contratações, relatórios e solicitações do cidadão'
    },
    {
      Email: 'sgdi@local.teste', Nome: 'Sofia da SGDI', Perfil: 'basico',
      PapelPgia: 'pgia_sgdi',
      Descricao: 'Governança central: pedidos de acesso ao PGIA, homologação com pesos e pontuação, plataformas, Registro Público, AIAs, apurações e auditorias'
    },
    {
      Email: 'cgtic@local.teste', Nome: 'Caio do CGTIC', Perfil: 'basico',
      PapelPgia: 'pgia_cgtic',
      Descricao: 'Comitê: casos delegados de Alto Risco e Risco Excessivo, deliberações e autorizações'
    },
    {
      Email: 'agente@local.teste', Nome: 'Alice Agente Pública', Perfil: 'basico',
      VincularAoOrgaoDeTeste: true,
      Descricao: 'Servidora do órgão SEM papel PGIA (entra pelo grupo do órgão): trilha do agente para registrar uso de IA e avisar incidentes (art. 13)'
    },
    {
      Email: 'auditoria@local.teste', Nome: 'Aurélio Auditor', Perfil: 'basico',
      PapelPgia: 'pgia_auditoria',
      Descricao: 'Auditoria externa: enxerga somente as auditorias designadas a ela'
    }
  ];

  // Persona do módulo Supervisão Contínua das Contratações (papel
  // Users.PapelContratacoes). A analista é 'basico' com o papel do módulo: o
  // confinamento do perfil admite /analises para quem o tem.
  personasContratacoes: PersonaLocal[] = [
    {
      Email: 'contratacoes@local.teste', Nome: 'Clara das Contratações', Perfil: 'basico',
      PapelContratacoes: 'ctr_analise',
      Descricao: 'Analista da SGDI na Supervisão Contínua das Contratações: processos de TIC, painel, manifestações ao TCDF e importação da planilha'
    }
  ];

  // Uma persona por papel da Governança Estratégica (Decreto nº 48.900/2026). Os
  // papéis de órgão ficam na Secretaria de Estado de Saúde (SES): o back-end do
  // modo local liga a persona à unidade SES (e cria o órgão SES se faltar).
  personasPlanejamento: PersonaLocal[] = [
    personaPlanejamento('pe-admin@local.teste', 'Patrícia do Planejamento', PapeisPlanejamento.Admin,
      'Administradora do módulo: prepara o modelo, cadastra princípios e PETIC-DF, responde aos pedidos de acesso e define os papéis'),
    personaPlanejamento('pe-sgdi@local.teste', 'Gustavo da Governança', PapeisPlanejamento.Sgdi,
      'Equipe da SGDI: acompanha e analisa os PDTICs de todos os órgãos, registra notificações e inadimplências'),
    personaPlanejamento('pe-cgtic@local.teste', 'Célia do Comitê', PapeisPlanejamento.Cgtic,
      'Secretaria do CGTIC: recebe os PDTICs e o PETIC-DF enviados e registra as deliberações do comitê'),
    personaPlanejamento('pe-orgao@local.teste', 'Sérgio da Saúde', PapeisPlanejamento.Orgao,
      'Equipe do órgão (SES): elabora e acompanha o PDTIC da Secretaria de Saúde, com a trilha de sete etapas'),
    personaPlanejamento('pe-consulta@local.teste', 'Solange da Saúde', PapeisPlanejamento.OrgaoConsulta,
      'Consulta do órgão (SES): só lê o PDTIC da Secretaria de Saúde')
  ];

  perfis = ['admin', 'gestor', 'basico'];
  papeisPgia = ['pgia_orgao', 'pgia_sgdi', 'pgia_cgtic', 'pgia_auditoria'];
  papeisContratacoes = ['ctr_analise'];
  opcoesPapelPlanejamento = OPCOES_PAPEL_PLANEJAMENTO;

  form: {
    Email: string; Nome: string; Perfil: string; PapelPgia: string; PapelContratacoes: string;
    ConcederDemandas: boolean; ConcederPgia: boolean;
    ConcederPlanejamento: boolean; PapelPlanejamento: string;
  } = {
    Email: '', Nome: '', Perfil: 'gestor', PapelPgia: '', PapelContratacoes: '', ConcederDemandas: false, ConcederPgia: false,
    ConcederPlanejamento: false, PapelPlanejamento: PapeisPlanejamento.Orgao
  };
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
      PapelContratacoes: persona.PapelContratacoes ?? null,
      VincularAoOrgaoDeTeste: persona.VincularAoOrgaoDeTeste ?? false,
      ConcederModulos: persona.ConcederModulos ?? null,
      PapelPlanejamento: persona.PapelPlanejamento ?? null
    }).subscribe({
      next: () => {
        this.entrando = false;
        // Como no login normal: todo mundo entra pela tela inicial dos módulos
        this.router.navigate(['/inicio']);
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
    const papelCtr = this.form.PapelContratacoes || null;
    // A Governança Estratégica não entra em ConcederModulos: o papel já dá o acesso
    // (e "planejamento" sem papel o back-end recusa)
    const concessoes = [
      ...(this.form.ConcederDemandas ? ['demandas'] : []),
      ...(this.form.ConcederPgia ? ['pgia'] : [])
    ];
    this.authService.loginLocal({
      Email: this.form.Email,
      Nome: this.form.Nome,
      Perfil: this.form.Perfil,
      PapelPgia: papel,
      PapelContratacoes: papelCtr,
      // Papel de órgão só faz sentido dentro de um órgão de teste
      VincularAoOrgaoDeTeste: papel === 'pgia_orgao',
      ConcederModulos: concessoes.length > 0 ? concessoes : null,
      // Governança Estratégica: só o papel (o acesso vem junto)
      PapelPlanejamento: this.form.ConcederPlanejamento ? this.form.PapelPlanejamento : null
    }).subscribe({
      next: () => {
        this.entrando = false;
        this.router.navigate(['/inicio']);
      },
      error: (err) => this.tratarErro(err)
    });
  }

  abrirPaginaPublica(): void {
    this.router.navigate(['/transparencia-ia']);
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
