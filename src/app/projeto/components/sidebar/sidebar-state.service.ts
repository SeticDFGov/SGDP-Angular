import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarStateService {
  private isExpandedSubject = new BehaviorSubject<boolean>(true);
  public isExpanded$: Observable<boolean> = this.isExpandedSubject.asObservable();

  constructor() {
    // Carregar estado do localStorage
    const savedState = localStorage.getItem('sidebarExpanded');
    if (savedState !== null) {
      this.isExpandedSubject.next(savedState === 'true');
    }
  }

  setExpanded(expanded: boolean): void {
    this.isExpandedSubject.next(expanded);
    localStorage.setItem('sidebarExpanded', expanded.toString());
  }

  getExpanded(): boolean {
    return this.isExpandedSubject.value;
  }
}
