import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth'; // Assumindo que existe
import { Unidade } from '../../../api/auth/interface';
import { SERVICE_API_URL } from '../../../api/consts';
import { UnidadeService } from './unidade.service';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-selecionar-unidade',
  templateUrl: './selecionar-unidade.component.html',
  standalone: true,
  imports: [CommonModule]
})
export class SelecionarUnidadeComponent implements OnInit {
  unidades: Unidade[] = [];
  loading: boolean = true;

  constructor(
    private unidadeService: UnidadeService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchUnidades();
  }

  fetchUnidades(): void {
    this.unidadeService.getAllUnidades().subscribe({
      next: (data) => {
        this.unidades = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
      }
    });
  }

  handleSelecionar(unidadeId: string): void {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
      return;
    }

    const user = JSON.parse(userJson);
    const unidadeSelecionada = this.unidades.find(u => u.id === unidadeId);

    if (user && user.Email && unidadeSelecionada) {
      this.unidadeService.informarUnidade(user.Email, unidadeId).subscribe({
        next: () => {
          this.authService.updateUserUnidade(unidadeSelecionada);
          this.authService.getPerfil().subscribe(perfil => {
            if (perfil === 'centralit') {
              this.router.navigate(['/centralit']);
            } else if (perfil === 'parceiro') {
              this.router.navigate(['/parceiro']);
            } else {
              this.router.navigate(['/demandas']);
            }
          });
        },
        error: (err) => {
        }
      });
    } else {
    }
  }
}
