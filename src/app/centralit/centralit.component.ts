import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/services/auth';
import { DemandaService } from '../demanda/service/demanda.service';
import { EtapaService } from '../projeto/etapa/etapa.service';
import { DemandaDetalhada, Entregavel, EntregavelUpdatePercentForm, DemandaForm, DemandaUpdateForm, EntregavelUpdateBasicoForm, Esteira, AreaDemandante, EntregavelCreateForm } from '../../api/demanda/interface';
import { UserProfile } from '../../api/auth/interface';
import { DemandanteService } from '../projeto/service/demandante';
import { EsteiraService } from '../projeto/service/esteira';
import { AreaExecutoraService } from '../area-executora/area-executora.service';
import { AreaExecutora } from '../../api/area-executora/interface';
import { EtapaEditBasicoComponent } from '../projeto/etapa/etapa-edit-basico/etapa-edit-basico.component';

@Component({
  selector: 'app-centralit',
  standalone: true,
  imports: [CommonModule, FormsModule, EtapaEditBasicoComponent],
  templateUrl: './centralit.component.html',
  styleUrls: ['./centralit.component.css']
})
export class CentralITComponent implements OnInit {
  currentUser: UserProfile | null = null;
  demandas: DemandaDetalhada[] = [];
  loading = false;
  message = '';
  messageType = '';
  expandedDemandas: Set<number> = new Set();
  entregaveisByDemanda: { [demandaId: number]: Entregavel[] } = {};
  loadingEntregaveis: { [demandaId: number]: boolean } = {};

  percentOptions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  editState: { [id: number]: { percent: number; descricao: string } } = {};

  // Modais e formulários
  isModalDemandaOpen = false;
  isModalDemandaEdicaoOpen = false;
  isModalEntregavelOpen = false;
  isModalEntregavelEdicaoOpen = false;

  newDemanda: DemandaForm = { NM_PROJETO: '', NM_AREA_DEMANDANTE: 0, EsteiraId: '' };
  demandaEmEdicao: DemandaDetalhada | null = null;

  newEntregavel: any = {
    NM_ETAPA: '',
    AreaExecutoraId: 0,
    TIPO_ENTREGA: 'Intermediario',
    DT_INICIO: '',
    DT_FIM: '',
    Descricao: ''
  };
  entregavelEmEdicao: Entregavel | null = null;
  demandaIdParaEntregavel: number = 0;

  listaEsteiras: Esteira[] = [];
  listaDemandantes: AreaDemandante[] = [];
  areasExecutoras: AreaExecutora[] = [];
  centraliTId: number = 0;

  constructor(
    private authService: AuthService,
    private demandaService: DemandaService,
    private etapaService: EtapaService,
    private demandanteService: DemandanteService,
    private esteiraService: EsteiraService,
    private areaExecutoraService: AreaExecutoraService
  ) {}

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      this.currentUser = user;
      this.loadDemandas();
      this.carregarOpcoes();
    });
  }

  carregarOpcoes(): void {
    this.esteiraService.getEsteira().subscribe(dados => this.listaEsteiras = dados);
    this.demandanteService.getDemandantes().subscribe(dados => this.listaDemandantes = dados);
    this.areaExecutoraService.getAll().subscribe(areas => {
      this.areasExecutoras = areas;
      const centralit = areas.find(a => a.Nome.toLowerCase().includes('centralit'));
      if (centralit) {
        this.centraliTId = centralit.AreaExecutoraId;
      }
    });
  }

  loadDemandas(): void {
    this.loading = true;
    this.demandaService.getDemandas().subscribe({
      next: (response) => {
        this.demandas = response.Items;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
      }
    });
  }

  toggleDemanda(demandaId: number): void {
    if (this.expandedDemandas.has(demandaId)) {
      this.expandedDemandas.delete(demandaId);
    } else {
      this.expandedDemandas.add(demandaId);
      if (!this.entregaveisByDemanda[demandaId]) {
        this.loadEntregaveis(demandaId);
      }
    }
  }

  loadEntregaveis(demandaId: number): void {
    this.loadingEntregaveis[demandaId] = true;

    this.etapaService.getAllEtapas(demandaId).subscribe({
      next: (data) => {
        const filteredData = data
          .sort((a, b) => new Date(a.DT_INICIO).getTime() - new Date(b.DT_INICIO).getTime());
        this.entregaveisByDemanda[demandaId] = filteredData;
        filteredData.forEach(e => {
          this.editState[e.EtapaProjetoId] = {
            percent: e.PERCENT_EXECUTADO,
            descricao: e.Descricao ?? ''
          };
        });
        this.loadingEntregaveis[demandaId] = false;
      },
      error: (err) => {
        this.loadingEntregaveis[demandaId] = false;
      }
    });
  }

  isExpanded(demandaId: number): boolean {
    return this.expandedDemandas.has(demandaId);
  }

  salvar(entregavel: Entregavel): void {
    const state = this.editState[entregavel.EtapaProjetoId];
    if (!state) return;

    const payload: EntregavelUpdatePercentForm = {
      PERCENT_EXECUTADO: state.percent,
      Descricao: state.descricao
    };

    this.etapaService.updatePercentual(entregavel.EtapaProjetoId, payload).subscribe({
      next: () => {
        entregavel.PERCENT_EXECUTADO = state.percent;
        entregavel.Descricao = state.descricao;
        this.showMessage('✓ Entregável atualizado com sucesso!', 'success');
      },
      error: (err) => {
        this.showMessage('✗ Erro ao salvar entregável. Tente novamente.', 'error');
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }

  showMessage(msg: string, type: string): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
      this.messageType = '';
    }, 5000);
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }

  getSituacaoClass(situacao: string): string {
    const classes: Record<string, string> = {
      'Concluído': 'bg-green-100 text-green-700',
      'Em Andamento': 'bg-blue-100 text-blue-700',
      'Atrasado': 'bg-red-100 text-red-700',
      'Não Iniciado': 'bg-gray-100 text-gray-600'
    };
    return classes[situacao] ?? 'bg-gray-100 text-gray-600';
  }

  // ========== CRUD DEMANDA ==========
  abrirModalDemanda(): void {
    this.newDemanda = { NM_PROJETO: '', NM_AREA_DEMANDANTE: 0, EsteiraId: '' };
    this.isModalDemandaOpen = true;
  }

  fecharModalDemanda(): void {
    this.isModalDemandaOpen = false;
  }

  salvarDemanda(): void {
    this.demandaService.createDemanda(this.newDemanda).subscribe({
      next: () => {
        this.fecharModalDemanda();
        this.loadDemandas();
        this.showMessage('✓ Demanda cadastrada com sucesso!', 'success');
      },
      error: () => {
        this.showMessage('✗ Erro ao cadastrar demanda.', 'error');
      }
    });
  }

  abrirModalEdicaoDemanda(demanda: DemandaDetalhada): void {
    this.demandaEmEdicao = demanda;
    this.newDemanda = {
      NM_PROJETO: demanda.NM_PROJETO,
      NR_PROCESSO_SEI: demanda.NR_PROCESSO_SEI ?? '',
      NM_AREA_DEMANDANTE: demanda.AREA_DEMANDANTE?.AreaDemandanteID ?? 0,
      EsteiraId: demanda.Esteira?.EsteiraId ?? ''
    };
    this.isModalDemandaEdicaoOpen = true;
  }

  fecharModalEdicaoDemanda(): void {
    this.isModalDemandaEdicaoOpen = false;
    this.demandaEmEdicao = null;
  }

  salvarEdicaoDemanda(): void {
    if (!this.demandaEmEdicao) return;

    this.demandaService.updateDemanda(this.demandaEmEdicao.demandaId, this.newDemanda).subscribe({
      next: () => {
        this.fecharModalEdicaoDemanda();
        this.loadDemandas();
        this.showMessage('✓ Demanda atualizada com sucesso!', 'success');
      },
      error: () => {
        this.showMessage('✗ Erro ao atualizar demanda.', 'error');
      }
    });
  }

  // ========== CRUD ENTREGÁVEL ==========
  abrirModalEntregavel(demandaId: number): void {
    this.demandaIdParaEntregavel = demandaId;
    this.newEntregavel = {
      NM_ETAPA: '',
      AreaExecutoraId: 0,
      TIPO_ENTREGA: 'Intermediario',
      DT_INICIO: '',
      DT_FIM: '',
      Descricao: ''
    };
    this.isModalEntregavelOpen = true;
  }

  fecharModalEntregavel(): void {
    this.isModalEntregavelOpen = false;
  }

  salvarEntregavel(): void {
    const payload: EntregavelCreateForm = {
      DemandaId: this.demandaIdParaEntregavel,
      NM_ETAPA: this.newEntregavel.NM_ETAPA,
      AreaExecutoraId: this.newEntregavel.AreaExecutoraId,
      TIPO_ENTREGA: this.newEntregavel.TIPO_ENTREGA,
      DT_INICIO: new Date(this.newEntregavel.DT_INICIO).toISOString(),
      DT_FIM: new Date(this.newEntregavel.DT_FIM).toISOString(),
      Descricao: this.newEntregavel.Descricao
    };

    this.etapaService.cadastrarEtapa(payload).subscribe({
      next: () => {
        this.fecharModalEntregavel();
        this.loadEntregaveis(this.demandaIdParaEntregavel);
        this.showMessage('✓ Entregável cadastrado com sucesso!', 'success');
      },
      error: () => {
        this.showMessage('✗ Erro ao cadastrar entregável.', 'error');
      }
    });
  }

  abrirModalEdicaoEntregavel(entregavel: Entregavel): void {
    this.entregavelEmEdicao = entregavel;
    this.isModalEntregavelEdicaoOpen = true;
  }

  fecharModalEdicaoEntregavel(): void {
    this.isModalEntregavelEdicaoOpen = false;
    this.entregavelEmEdicao = null;
  }

  salvarEdicaoEntregavel(payload: EntregavelUpdateBasicoForm): void {
    if (!this.entregavelEmEdicao) return;

    this.etapaService.updateEntregavelBasico(this.entregavelEmEdicao.EtapaProjetoId, payload).subscribe({
      next: () => {
        if (this.entregavelEmEdicao) {
          this.entregavelEmEdicao.NM_ETAPA = payload.NM_ETAPA;
          this.entregavelEmEdicao.TIPO_ENTREGA = payload.TIPO_ENTREGA;
        }
        this.fecharModalEdicaoEntregavel();
        this.showMessage('✓ Entregável atualizado com sucesso!', 'success');
      },
      error: () => {
        this.showMessage('✗ Erro ao atualizar entregável.', 'error');
      }
    });
  }

  formatarProcessoSEI(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 19) value = value.slice(0, 19);
    value = value.replace(/^(\d{5})(\d)/, '$1-$2');
    value = value.replace(/^(\d{5})-(\d{8})(\d)/, '$1-$2/$3');
    value = value.replace(/^(\d{5})-(\d{8})\/(\d{4})(\d)/, '$1-$2/$3-$4');
    input.value = value;
    this.newDemanda.NR_PROCESSO_SEI = value;
  }
}
