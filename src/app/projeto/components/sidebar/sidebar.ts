import { Component } from '@angular/core';
import { AuthService } from '../../../auth/services/auth';
import { CommonModule } from '@angular/common';
import {  RouterModule } from '@angular/router';
import { UserProfile } from '../../../../api/auth/interface';
import { Observable } from 'rxjs';

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
  constructor(private authService: AuthService){};
  logout(){
    this.authService.logout();
  }
  ngOnInit(){
    this.carregarUser();
  }
  carregarUser(){
    this.authService.getUser().subscribe(response =>{
      this.user = response
    }
    );
  }
}
