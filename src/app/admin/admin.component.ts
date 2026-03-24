import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { SERVICE_API_URL } from '../../api/consts';
import { AuthService } from '../auth/services/auth';
import { AreaExecutoraService } from '../area-executora/area-executora.service';
import { AreaExecutora } from '../../api/area-executora/interface';

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
  user: any;
  email: any;

  // AreaExecutora
  areasExecutoras: AreaExecutora[] = [];
  loadingAreas = false;
  newAreaNome = '';
  loadingArea = false;
  editingArea: AreaExecutora | null = null;
  editAreaNome = '';

  private URL_AUTH_SERVICE = `${SERVICE_API_URL}/api`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private areaExecutoraService: AreaExecutoraService
  ) { }

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      this.user = user;
      this.email = user?.Email;
      this.loadUsers();
      this.loadUnits();
      this.loadAreasExecutoras();
    });
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

  loadAreasExecutoras(): void {
    this.loadingAreas = true;
    this.areaExecutoraService.getAll().subscribe({
      next: (areas) => {
        this.areasExecutoras = areas;
        this.loadingAreas = false;
      },
      error: (error) => {
        console.error('Erro ao carregar áreas executoras:', error);
        this.showMessage('Erro ao carregar áreas executoras', 'error');
        this.loadingAreas = false;
      }
    });
  }

  cadastrarArea(event: Event): void {
    event.preventDefault();
    if (!this.newAreaNome.trim()) {
      this.showMessage('Nome da área executora é obrigatório', 'error');
      return;
    }

    this.loadingArea = true;
    this.areaExecutoraService.create(this.newAreaNome.trim()).subscribe({
      next: () => {
        this.showMessage('Área executora cadastrada com sucesso!', 'success');
        this.newAreaNome = '';
        this.loadAreasExecutoras();
        this.loadingArea = false;
      },
      error: (error) => {
        console.error('Erro ao cadastrar área executora:', error);
        this.showMessage('Erro ao cadastrar área executora', 'error');
        this.loadingArea = false;
      }
    });
  }

  startEditArea(area: AreaExecutora): void {
    this.editingArea = area;
    this.editAreaNome = area.Nome;
  }

  cancelEditArea(): void {
    this.editingArea = null;
    this.editAreaNome = '';
  }

  saveEditArea(): void {
    if (!this.editingArea || !this.editAreaNome.trim()) return;

    this.areaExecutoraService.update(this.editingArea.AreaExecutoraId, this.editAreaNome.trim()).subscribe({
      next: () => {
        this.showMessage('Área executora atualizada com sucesso!', 'success');
        this.editingArea = null;
        this.editAreaNome = '';
        this.loadAreasExecutoras();
      },
      error: (error) => {
        console.error('Erro ao atualizar área executora:', error);
        this.showMessage('Erro ao atualizar área executora', 'error');
      }
    });
  }

  deleteArea(id: number): void {
    if (!confirm('Deseja remover esta área executora?')) return;

    this.areaExecutoraService.delete(id).subscribe({
      next: () => {
        this.showMessage('Área executora removida com sucesso!', 'success');
        this.loadAreasExecutoras();
      },
      error: (error) => {
        console.error('Erro ao remover área executora:', error);
        this.showMessage('Erro ao remover área executora', 'error');
      }
    });
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
