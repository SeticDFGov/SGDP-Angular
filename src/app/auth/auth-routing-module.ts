import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './login/login';

export const auth_routes: Routes = [{ path: '', component: Login }];


export class AuthRoutingModule { }
