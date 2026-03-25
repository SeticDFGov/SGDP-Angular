import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { SERVICE_API_URL } from '../../api/consts';
import { AuthService } from '../auth/services/auth';
import { AreaExecutoraService } from '../area-executora/area-executora.service';
import { AreaExecutora } from '../../api/area-executora/interface';
import { AreaDemandante, Esteira } from '../../api/demanda/interface';

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

  // AreaDemandante
  demandantes: AreaDemandante[] = [];
  loadingDemandantes = false;
  newDemandanteNome = '';
  newDemandanteSigla = '';
  loadingDemandante = false;

  // Esteira
  esteiras: Esteira[] = [];
  loadingEsteiras = false;
  newEsteiraNome = '';
  loadingEsteira = false;

  private URL_AUTH_SERVICE = `${SERVICE_API_URL}/api`;
  private URL_DEMANDANTE = `${SERVICE_API_URL}/api/Demandante`;
  private URL_ESTEIRA = `${SERVICE_API_URL}/api/Esteira`;

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
      this.loadDemandantes();
      this.loadEsteiras();
    });
  }

  // ── Usuários ──────────────────────────────────────────────────────────────

  loadUsers(): void {
    if (!this.user?.Email) return;
    this.loadingUsers = true;
    this.http.get<User[]>(`${this.URL_AUTH_SERVICE}/auth/usuarios`, {
      headers: { 'Content-Type': 'application/json', 'adminEmail': this.email }
    }).subscribe({
      next: (data) => { this.users = data; this.loadingUsers = false; },
      error: () => { this.showMessage('Erro ao carregar usuários', 'error'); this.loadingUsers = false; }
    });
  }

  alterarPerfil(email: string, novoPerfil: string): void {
    this.http.put(`${this.URL_AUTH_SERVICE}/auth/alterar-perfil`,
      { Email: email, Perfil: novoPerfil },
      { headers: { 'Content-Type': 'application/json', 'adminEmail': this.user.Email } }
    ).subscribe({
      next: () => { this.showMessage('Perfil alterado com sucesso!', 'success'); this.loadUsers(); },
      error: () => this.showMessage('Erro ao alterar perfil', 'error')
    });
  }

  alterarUnidade(email: string, unidadeId: string): void {
    this.http.put(`${this.URL_AUTH_SERVICE}/auth/modificar-unidade`,
      { email, unidadeId },
      { headers: { 'Content-Type': 'application/json', 'adminEmail': this.email }, responseType: 'text' as 'json' }
    ).subscribe({
      next: () => { this.showMessage('Unidade alterada com sucesso!', 'success'); this.loadUsers(); },
      error: (err) => this.showMessage(err.error?.message || 'Erro ao alterar unidade', 'error')
    });
  }

  // ── Unidades ──────────────────────────────────────────────────────────────

  loadUnits(): void {
    this.loadingUnits = true;
    this.http.get<Unit[]>(`${this.URL_AUTH_SERVICE}/auth/unidades`).subscribe({
      next: (data) => { this.units = data; this.loadingUnits = false; },
      error: () => { this.showMessage('Erro ao carregar unidades', 'error'); this.loadingUnits = false; }
    });
  }

  cadastrarUnidade(event: Event): void {
    event.preventDefault();
    if (!this.newUnitName.trim()) { this.showMessage('Nome da unidade é obrigatório', 'error'); return; }
    this.loadingUnit = true;
    this.http.post(`${this.URL_AUTH_SERVICE}/auth/unidade`, { nome: this.newUnitName.trim() }).subscribe({
      next: () => { this.showMessage('Unidade cadastrada com sucesso!', 'success'); this.newUnitName = ''; this.loadUnits(); this.loadingUnit = false; },
      error: () => { this.showMessage('Erro ao cadastrar unidade', 'error'); this.loadingUnit = false; }
    });
  }

  // ── Áreas Executoras ──────────────────────────────────────────────────────

  loadAreasExecutoras(): void {
    this.loadingAreas = true;
    this.areaExecutoraService.getAll().subscribe({
      next: (areas) => { this.areasExecutoras = areas; this.loadingAreas = false; },
      error: () => { this.showMessage('Erro ao carregar áreas executoras', 'error'); this.loadingAreas = false; }
    });
  }

  cadastrarArea(event: Event): void {
    event.preventDefault();
    if (!this.newAreaNome.trim()) { this.showMessage('Nome da área executora é obrigatório', 'error'); return; }
    this.loadingArea = true;
    this.areaExecutoraService.create(this.newAreaNome.trim()).subscribe({
      next: () => { this.showMessage('Área executora cadastrada com sucesso!', 'success'); this.newAreaNome = ''; this.loadAreasExecutoras(); this.loadingArea = false; },
      error: () => { this.showMessage('Erro ao cadastrar área executora', 'error'); this.loadingArea = false; }
    });
  }

  startEditArea(area: AreaExecutora): void { this.editingArea = area; this.editAreaNome = area.Nome; }
  cancelEditArea(): void { this.editingArea = null; this.editAreaNome = ''; }

  saveEditArea(): void {
    if (!this.editingArea || !this.editAreaNome.trim()) return;
    this.areaExecutoraService.update(this.editingArea.AreaExecutoraId, this.editAreaNome.trim()).subscribe({
      next: () => { this.showMessage('Área executora atualizada!', 'success'); this.editingArea = null; this.editAreaNome = ''; this.loadAreasExecutoras(); },
      error: () => this.showMessage('Erro ao atualizar área executora', 'error')
    });
  }

  deleteArea(id: number): void {
    if (!confirm('Deseja remover esta área executora?')) return;
    this.areaExecutoraService.delete(id).subscribe({
      next: () => { this.showMessage('Área executora removida!', 'success'); this.loadAreasExecutoras(); },
      error: () => this.showMessage('Erro ao remover área executora', 'error')
    });
  }

  // ── Áreas Demandantes ─────────────────────────────────────────────────────

  loadDemandantes(): void {
    this.loadingDemandantes = true;
    this.http.get<AreaDemandante[]>(this.URL_DEMANDANTE).subscribe({
      next: (data) => { this.demandantes = data; this.loadingDemandantes = false; },
      error: () => { this.showMessage('Erro ao carregar áreas demandantes', 'error'); this.loadingDemandantes = false; }
    });
  }

  cadastrarDemandante(event: Event): void {
    event.preventDefault();
    if (!this.newDemandanteNome.trim() || !this.newDemandanteSigla.trim()) {
      this.showMessage('Nome e sigla são obrigatórios', 'error'); return;
    }
    this.loadingDemandante = true;
    this.http.post(this.URL_DEMANDANTE, {
      NM_DEMANDANTE: this.newDemandanteNome.trim(),
      NM_SIGLA: this.newDemandanteSigla.trim()
    }).subscribe({
      next: () => { this.showMessage('Área demandante cadastrada!', 'success'); this.newDemandanteNome = ''; this.newDemandanteSigla = ''; this.loadDemandantes(); this.loadingDemandante = false; },
      error: () => { this.showMessage('Erro ao cadastrar área demandante', 'error'); this.loadingDemandante = false; }
    });
  }

  deleteDemandante(id: number): void {
    if (!confirm('Deseja remover esta área demandante?')) return;
    this.http.delete(`${this.URL_DEMANDANTE}/${id}`).subscribe({
      next: () => { this.showMessage('Área demandante removida!', 'success'); this.loadDemandantes(); },
      error: () => this.showMessage('Erro ao remover área demandante', 'error')
    });
  }

  // ── Esteiras ──────────────────────────────────────────────────────────────

  loadEsteiras(): void {
    this.loadingEsteiras = true;
    this.http.get<Esteira[]>(this.URL_ESTEIRA).subscribe({
      next: (data) => { this.esteiras = data; this.loadingEsteiras = false; },
      error: () => { this.showMessage('Erro ao carregar esteiras', 'error'); this.loadingEsteiras = false; }
    });
  }

  cadastrarEsteira(event: Event): void {
    event.preventDefault();
    if (!this.newEsteiraNome.trim()) { this.showMessage('Nome da esteira é obrigatório', 'error'); return; }
    this.loadingEsteira = true;
    this.http.post(this.URL_ESTEIRA, {
      EsteiraId: crypto.randomUUID(),
      Nome: this.newEsteiraNome.trim()
    }).subscribe({
      next: () => { this.showMessage('Esteira cadastrada!', 'success'); this.newEsteiraNome = ''; this.loadEsteiras(); this.loadingEsteira = false; },
      error: () => { this.showMessage('Erro ao cadastrar esteira', 'error'); this.loadingEsteira = false; }
    });
  }

  deleteEsteira(id: string): void {
    if (!confirm('Deseja remover esta esteira?')) return;
    this.http.delete(`${this.URL_ESTEIRA}/${id}`).subscribe({
      next: () => { this.showMessage('Esteira removida!', 'success'); this.loadEsteiras(); },
      error: () => this.showMessage('Erro ao remover esteira', 'error')
    });
  }

  // ── Utilitários ───────────────────────────────────────────────────────────

  showMessage(msg: string, type: string): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => { this.message = ''; this.messageType = ''; }, 3000);
  }
}
