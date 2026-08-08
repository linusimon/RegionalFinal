import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProjectStateService {
  private selectedProjectSubject = new BehaviorSubject<string>('PRJ-001');
  public selectedProject$: Observable<string> = this.selectedProjectSubject.asObservable();

  constructor() {}

  getSelectedProject(): string {
    return this.selectedProjectSubject.value;
  }

  setSelectedProject(code: string): void {
    if (!code) return;
    this.selectedProjectSubject.next(code);
    
    // Sync with legacy app.js state if running concurrently
    if ((window as any).setProject) {
      (window as any).setProject(code);
    }
  }
}
