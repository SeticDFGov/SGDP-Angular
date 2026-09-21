import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SERVICE_API_URL } from '../../api/consts';
import { AuthService } from '../auth/services/auth';
import { AreaExecutoraService } from '../area-executora/area-executora.service';
import { AreaExecutora } from '../../api/area-executora/interface';
import { AreaDemandante, Esteira } from '../../api/demanda/interface';
import { PgiaAdminService } from '../pgia/services/pgia-admin.service';
import { NATUREZAS_JURIDICAS, PgiaOrgao, PgiaOrgaoCreateForm } from '../../api/pgia/interface';

interface Unit {
  id: number;
  Nome: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  units: Unit[] = [];
  loadingUnits = false;
  newUnitName = '';
  loadingUnit = false;
  message = '';
  messageType = '';
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

  // PGIA: órgãos (Decreto nº 48.901/2026); o papel das pessoas fica na Gestão de acessos
  pgiaOrgaos: PgiaOrgao[] = [];
  loadingPgiaOrgaos = false;
  naturezasPgia = NATUREZAS_JURIDICAS;
  newPgiaOrgao: PgiaOrgaoCreateForm = {
    Nome: '', NaturezaJuridica: 'Administração direta',
    PrestaServicoCidadao: null, UnidadeId: null
  };
  loadingPgiaOrgao = false;
  vinculandoOrgao: PgiaOrgao | null = null;
  vinculoUnidadeId: string | null = null;
  salvandoVinculo = false;

  private URL_AUTH_SERVICE = `${SERVICE_API_URL}/api`;
  private URL_DEMANDANTE = `${SERVICE_API_URL}/api/Demandante`;
  private URL_ESTEIRA = `${SERVICE_API_URL}/api/Esteira`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private areaExecutoraService: AreaExecutoraService,
    private pgiaAdminService: PgiaAdminService
  ) { }

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      this.user = user;
      this.email = user?.Email;
      this.loadUnits();
      this.loadAreasExecutoras();
      this.loadDemandantes();
      this.loadEsteiras();
      this.loadPgiaOrgaos();
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

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // ── Áreas Demandantes ─────────────────────────────────────────────────────

  loadDemandantes(): void {
    this.loadingDemandantes = true;
    this.http.get<AreaDemandante[]>(this.URL_DEMANDANTE, { headers: this.getAuthHeaders() }).subscribe({
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
    }, { headers: this.getAuthHeaders() }).subscribe({
      next: () => { this.showMessage('Área demandante cadastrada!', 'success'); this.newDemandanteNome = ''; this.newDemandanteSigla = ''; this.loadDemandantes(); this.loadingDemandante = false; },
      error: () => { this.showMessage('Erro ao cadastrar área demandante', 'error'); this.loadingDemandante = false; }
    });
  }

  deleteDemandante(id: number): void {
    if (!confirm('Deseja remover esta área demandante?')) return;
    this.http.delete(`${this.URL_DEMANDANTE}/${id}`, { headers: this.getAuthHeaders() }).subscribe({
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

  // ── PGIA: órgãos ─────────────────────────────────────────────────

  loadPgiaOrgaos(): void {
    this.loadingPgiaOrgaos = true;
    this.pgiaAdminService.listarOrgaos().subscribe({
      next: (orgaos) => { this.pgiaOrgaos = orgaos; this.loadingPgiaOrgaos = false; },
      error: () => { this.showMessage('Erro ao carregar órgãos PGIA', 'error'); this.loadingPgiaOrgaos = false; }
    });
  }

  get pgiaOrgaoPrestaAplicavel(): boolean {
    return this.newPgiaOrgao.NaturezaJuridica === 'Empresa pública'
      || this.newPgiaOrgao.NaturezaJuridica === 'Sociedade de economia mista';
  }

  cadastrarPgiaOrgao(event: Event): void {
    event.preventDefault();
    if (!this.newPgiaOrgao.Nome.trim() || !this.newPgiaOrgao.UnidadeId) {
      this.showMessage('Nome e unidade do órgão são obrigatórios', 'error'); return;
    }
    this.loadingPgiaOrgao = true;
    this.pgiaAdminService.criarOrgao(this.newPgiaOrgao).subscribe({
      next: () => {
        this.showMessage('Órgão PGIA cadastrado! As obrigações com prazo do art. 35 foram carregadas para ele.', 'success');
        this.newPgiaOrgao = { Nome: '', NaturezaJuridica: 'Administração direta', PrestaServicoCidadao: null, UnidadeId: null };
        this.loadPgiaOrgaos();
        this.loadingPgiaOrgao = false;
      },
      error: (err) => {
        this.showMessage(err.error?.Message || 'Erro ao cadastrar órgão PGIA', 'error');
        this.loadingPgiaOrgao = false;
      }
    });
  }

  iniciarVinculoOrgao(orgao: PgiaOrgao): void {
    this.vinculandoOrgao = orgao;
    this.vinculoUnidadeId = orgao.UnidadeId;
  }

  cancelarVinculoOrgao(): void {
    this.vinculandoOrgao = null;
    this.vinculoUnidadeId = null;
  }

  salvarVinculoOrgao(): void {
    if (!this.vinculandoOrgao) return;
    if (!this.vinculoUnidadeId) {
      this.showMessage('Escolha uma unidade: o órgão precisa de uma unidade vinculada.', 'error');
      return;
    }
    this.salvandoVinculo = true;
    const o = this.vinculandoOrgao;
    this.pgiaAdminService.editarOrgao(o.Id, {
      Nome: o.Nome,
      NaturezaJuridica: o.NaturezaJuridica,
      PrestaServicoCidadao: o.PrestaServicoCidadao,
      UnidadeId: this.vinculoUnidadeId,
      Ativo: o.Ativo
    }).subscribe({
      next: () => {
        this.showMessage('Vínculo de unidade atualizado!', 'success');
        this.salvandoVinculo = false;
        this.cancelarVinculoOrgao();
        this.loadPgiaOrgaos();
      },
      error: () => {
        this.showMessage('Erro ao atualizar o vínculo (a unidade pode já estar vinculada a outro órgão)', 'error');
        this.salvandoVinculo = false;
      }
    });
  }

  // ── Utilitários ───────────────────────────────────────────────────────────

  showMessage(msg: string, type: string): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => { this.message = ''; this.messageType = ''; }, 3000);
  }
}
