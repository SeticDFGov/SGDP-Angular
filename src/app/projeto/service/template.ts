import { Injectable } from '@angular/core';
import { AuthService } from '../../auth/services/auth';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  constructor(private authService:AuthService, private http:HttpClient){}


}
