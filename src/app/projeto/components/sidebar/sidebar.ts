import { Component } from '@angular/core';
import { AuthService } from '../../../auth/services/auth';
import { CommonModule } from '@angular/common';
import {  RouterModule } from '@angular/router';
import { UserProfile } from '../../../../api/auth/interface';
import { Observable } from 'rxjs';
import { SidebarStateService } from './sidebar-state.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  user:UserProfile|null = null;
  isExpanded: boolean = true; // Sidebar expandido por padrão

  constructor(
    private authService: AuthService,
    private sidebarStateService: SidebarStateService
  ){};

  logout(){
    this.authService.logout();
  }

  ngOnInit(){
    this.carregarUser();
    // Carregar estado do serviço
    this.isExpanded = this.sidebarStateService.getExpanded();

    // Inscrever-se nas mudanças
    this.sidebarStateService.isExpanded$.subscribe(expanded => {
      this.isExpanded = expanded;
    });
  }

  carregarUser(){
    this.authService.getUser().subscribe(response =>{
      this.user = response
    }
    );
  }

  toggleSidebar(){
    this.sidebarStateService.setExpanded(!this.isExpanded);
  }
}
