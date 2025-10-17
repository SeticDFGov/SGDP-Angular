import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ProjetoDetalhado, ProjetoInterfaceForm } from '../../api/projeto/inteface';
import { SERVICE_API_URL } from '../../api/consts';
import { AuthService } from '../auth/services/auth';
import { CommonModule } from '@angular/common';
import { Sidebar } from './components/sidebar/sidebar';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-projeto',
  standalone: true,
  imports: [
    CommonModule,
    Sidebar,
    RouterLink
  ],
  templateUrl: './projeto.html',
  styleUrl: './projeto.css'
})

export class Projeto {
  constructor(private http:HttpClient, private authService: AuthService){};
  projetos:ProjetoDetalhado[] = [];

  getProjetos(unidade:string): Observable<ProjetoDetalhado[]> {
    const params = new HttpParams().set('unidade', unidade);
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`)
    return this.http.get<ProjetoDetalhado[]>(`${SERVICE_API_URL}/api/projeto`, {params:params, headers:headers});
  };

   ngOnInit() {
    this.carregarProjetos();
  }

  carregarProjetos() {
    const unidadeId = `string`;

    this.getProjetos(unidadeId).subscribe(dadosRecebidos => {
      this.projetos = dadosRecebidos;
    });
  }

  postProjetos(request:ProjetoInterfaceForm)
  {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`)
    return this.http.post(`${SERVICE_API_URL}/api/projeto`, {headers:headers, body:request});
  }
}
