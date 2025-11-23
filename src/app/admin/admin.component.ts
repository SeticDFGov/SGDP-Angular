import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { SERVICE_API_URL } from '../../api/consts';
import { AuthService } from '../auth/services/auth';
import { UserProfile } from '../../api/auth/interface';

interface User {
  Id: string;
  Nome: string;
  Email: string;
  Perfil: string;
  Unidade: {
    id: number;
    Nome: string;
  };
}

interface Unit {
  id: number;
  Nome: string;
}

interface Template {
  TemplateId: string;
  NM_TEMPLATE: string;
  NM_ETAPA: string;
  PERCENT_TOTAL: number;
  DIAS_PREVISTOS: number;
  ORDER: number;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  users: User[] = [];
  loadingUsers = false;
  units: Unit[] = [];
  loadingUnits = false;
  newUnitName = '';
  loadingUnit = false;
  message = '';
  messageType = '';
  selectedUnits: { [key: string]: string } = {};
  selectedProfiles: { [key: string]: string } = {};
  templates: { [key: string]: Template[] } = {};
  expandedTemplates: { [key: string]: boolean } = {};
  editEtapa: Template | null = null;
  modalOpen = false;
  user: any;
  email: any;

  private URL_AUTH_SERVICE = `${SERVICE_API_URL}/api`;
  private URL_TEMPLATE_SERVICE = `${SERVICE_API_URL}/templates`;
  constructor(private http: HttpClient, private authService: AuthService) { }

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      this.user = user;
      this.email = user?.Email;
      this.loadUsers();
      this.loadUnits();
      this.loadTemplates()
    })

  }

  loadUsers(): void {
    if (!this.user?.Email) {
      this.showMessage('E-mail do administrador não encontrado para carregar usuários.', 'error');
      this.loadingUsers = false;
      return;
    }

    this.loadingUsers = true;
    this.http.get<User[]>(`${this.URL_AUTH_SERVICE}/auth/usuarios`, {
      headers: {
        'Content-Type': 'application/json',
        'adminEmail': this.email
      }
    }).subscribe({
      next: (data) => {
        this.users = data;
        this.loadingUsers = false;
      },
      error: (error) => {
        console.error('Erro ao carregar usuários:', error);
        this.showMessage('Erro ao carregar usuários', 'error');
        this.loadingUsers = false;
      }
    });
  }

  loadUnits(): void {
    this.loadingUnits = true;
    this.http.get<Unit[]>(`${this.URL_AUTH_SERVICE}/auth/unidades`).subscribe({
      next: (data) => {
        this.units = data;
        this.loadingUnits = false;
      },
      error: (error) => {
        console.error('Erro ao carregar unidades:', error);
        this.showMessage('Erro ao carregar unidades', 'error');
        this.loadingUnits = false;
      }
    });
  }

  loadTemplates(): void {
    this.http.get<{ [key: string]: Template[] }>(this.URL_TEMPLATE_SERVICE).subscribe({
      next: (data) => {
        this.templates = data;
      },
      error: (error) => {
        console.error('Erro ao carregar templates:', error);
        this.showMessage('Erro ao carregar templates', 'error');
      }
    });
  }

  handleEdit(etapa: Template): void {
    this.editEtapa = { ...etapa };
    this.modalOpen = true;
  }

  handleCreate(): void {
    this.editEtapa = {
      TemplateId: '',
      NM_TEMPLATE: '',
      NM_ETAPA: '',
      PERCENT_TOTAL: 0,
      DIAS_PREVISTOS: 0,
      ORDER: 0,
    };
    this.modalOpen = true;
  }

  handleSave(form: Template): void {
    if (!this.editEtapa || !this.editEtapa.TemplateId) {
      this.http.post(this.URL_TEMPLATE_SERVICE, form).subscribe({
        next: () => {
          this.modalOpen = false;
          this.editEtapa = null;
          this.loadTemplates();
        },
        error: (error) => {
          console.error('Erro ao criar template:', error);
          this.showMessage('Erro ao criar template', 'error');
        }
      });
    } else {
      this.http.put(`${this.URL_TEMPLATE_SERVICE}/${this.editEtapa.TemplateId}`, form).subscribe({
        next: () => {
          this.modalOpen = false;
          this.editEtapa = null;
          this.loadTemplates();
        },
        error: (error) => {
          console.error('Erro ao atualizar template:', error);
          this.showMessage('Erro ao atualizar template', 'error');
        }
      });
    }
  }

  handleClose(): void {
    this.modalOpen = false;
    this.editEtapa = null;
  }

  alterarPerfil(email: string, novoPerfil: string): void {
    this.http.put(`${this.URL_AUTH_SERVICE}/auth/alterar-perfil`, {
      Email: email,
      Perfil: novoPerfil
    }, {
      headers: {
        'Content-Type': 'application/json',
        'adminEmail': this.user.Email
      }
    }).subscribe({
      next: () => {
        this.showMessage('Perfil alterado com sucesso!', 'success');
        this.loadUsers();
      },
      error: (error) => {
        console.error('Erro ao alterar perfil:', error);
        this.showMessage('Erro ao alterar perfil', 'error');
      }
    });
  }

  alterarUnidade(email: string, unidadeId: string): void {
    this.http.put(`${this.URL_AUTH_SERVICE}/auth/modificar-unidade`, {
      email: email,
      unidadeId: unidadeId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'adminEmail': this.email
      },
      responseType: 'text' as 'json'
    }).subscribe({
      next: () => {
        this.showMessage('Unidade do usuário alterada com sucesso!', 'success');
        this.loadUsers();
      },
      error: (error) => {
        console.error('Erro ao alterar unidade do usuário:', error);
        const errorMessage = error.error?.message || 'Erro ao alterar unidade do usuário';
        this.showMessage(errorMessage, 'error');
      }
    });
  }

  cadastrarUnidade(event: Event): void {
    event.preventDefault();
    if (!this.newUnitName.trim()) {
      this.showMessage('Nome da unidade é obrigatório', 'error');
      return;
    }

    this.loadingUnit = true;
    this.http.post(`${this.URL_AUTH_SERVICE}/auth/unidade`, {
      nome: this.newUnitName.trim()
    }).subscribe({
      next: () => {
        this.showMessage('Unidade cadastrada com sucesso!', 'success');
        this.newUnitName = '';
        this.loadUnits();
        this.loadingUnit = false;
      },
      error: (error) => {
        console.error('Erro ao cadastrar unidade:', error);
        this.showMessage('Erro ao cadastrar unidade', 'error');
        this.loadingUnit = false;
      }
    });
  }

  showMessage(msg: string, type: string): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
      this.messageType = '';
    }, 3000);
  }
}
