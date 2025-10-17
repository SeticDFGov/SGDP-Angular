import { Component } from '@angular/core';
import { Sidebar } from '../../projeto/components/sidebar/sidebar';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  imports: [
    Sidebar,
    RouterModule
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayout {

}
