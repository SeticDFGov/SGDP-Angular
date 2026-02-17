import { Component, OnInit } from '@angular/core';
import { Sidebar } from '../../projeto/components/sidebar/sidebar';
import { RouterModule } from '@angular/router';
import { SidebarStateService } from '../../projeto/components/sidebar/sidebar-state.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-layout',
  imports: [
    Sidebar,
    RouterModule,
    CommonModule
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayout implements OnInit {
  isSidebarExpanded: boolean = true;

  constructor(private sidebarStateService: SidebarStateService) {}

  ngOnInit(): void {
    // Inscrever-se nas mudanças do estado do sidebar
    this.sidebarStateService.isExpanded$.subscribe(expanded => {
      this.isSidebarExpanded = expanded;
    });
  }
}
