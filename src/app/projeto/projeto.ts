import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import {Unidade,  AreaDemandante, Esteira, ProjetoDetalhado, ProjetoInterfaceForm } from '../../api/projeto/inteface';
import { SERVICE_API_URL } from '../../api/consts';
import { AuthService } from '../auth/services/auth';
import { CommonModule } from '@angular/common';
import { Sidebar } from './components/sidebar/sidebar';
import { RouterLink } from '@angular/router';
import { ProjetoForm } from './components/projeto-form/projeto-form';
import { UnidadeService } from './service/unidade';
import { DemandanteService } from './service/demandante';
import { EsteiraService } from './service/esteira';

@Component({
  selector: 'app-projeto',
  standalone: true,
  imports: [
    CommonModule,
    Sidebar,
    RouterLink,
    ProjetoForm
  ],
  templateUrl: './projeto.html',
  styleUrl: './projeto.css'
})

export class Projeto {
  constructor(
    private http:HttpClient,
    private authService: AuthService,
    private unidadeService:UnidadeService,
    private demandanteService:DemandanteService,
    private esteiraService:EsteiraService
  ){};
  projetos:ProjetoDetalhado[] = [];
  listaEsteiras: Esteira[] = [];
  listaUnidades: Unidade[] = [];
  listaDemandantes: AreaDemandante[] = [];

  isModalOpen = false;
  getProjetos(unidade:string): Observable<ProjetoDetalhado[]> {
    const params = new HttpParams().set('unidade', unidade);
  const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`)
    return this.http.get<ProjetoDetalhado[]>(`${SERVICE_API_URL}/api/projeto`, {params:params, headers:headers});
  };

   ngOnInit() {
    this.carregarProjetos();
    this.carregarOpcoes();
  }

  abrirModal() {
    this.isModalOpen = true;
  }

  fecharModal() {
    this.isModalOpen = false;
  }
  carregarProjetos() {
    this.authService.getUser().subscribe(user => {
      if (user && user.Unidade && user.Unidade.Nome) {
        this.getProjetos(user.Unidade.Nome).subscribe(dadosRecebidos => {
          this.projetos = dadosRecebidos;
        });
      } else {
        console.error('Usuário ou unidade não encontrados.');
      }
    });
  }

  salvarProjetos(request: ProjetoInterfaceForm) {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    request.DT_INICIO = new Date(request.DT_INICIO).toISOString();
    request.DT_TERMINO = new Date(request.DT_TERMINO).toISOString();
    this.http.post(`${SERVICE_API_URL}/api/projeto`, request, { headers: headers })
      .subscribe({
        next: () => {
          this.fecharModal();
          this.carregarProjetos();
        },
        error: (err) => {
          console.error('Erro ao salvar o projeto', err);
        }
      });
  }

  carregarOpcoes(){
    this.esteiraService.getEsteira().subscribe(dados => this.listaEsteiras=dados);
    this.demandanteService.getDemandantes().subscribe(dados => this.listaDemandantes=dados);
    this.unidadeService.getUnidades().subscribe(dados=> this.listaUnidades=dados)
  }

}
