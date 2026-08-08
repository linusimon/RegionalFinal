import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectStateService } from '../../services/project-state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="top-nav">
      <div class="nav-brand">
        <div class="nav-logo">PM</div>
        <div>
          <div class="brand-title">PM AI Assistant (Angular 17)</div>
          <div class="brand-subtitle">AI-Powered Risk Analysis, RAID Mitigation & Stakeholder Communication</div>
        </div>
      </div>

      <div class="nav-controls">
        <div class="selector-group">
          <span class="selector-label">Workspace Role:</span>
          <select (change)="onRoleSelect($event)">
            <option value="Program Manager">Program Manager</option>
            <option value="Project Manager">Project Manager</option>
            <option value="Team Lead">Tech Lead / Team Lead</option>
            <option value="System Admin">System & Technical Admin</option>
          </select>
        </div>

        <div class="selector-group">
          <span class="selector-label">Active Project:</span>
          <select (change)="onProjectSelect($event)">
            <option value="PRJ-001">PRJ-001 - Project Orion Upgrade (Mobilization)</option>
            <option value="PRJ-002">PRJ-002 - Core Banking Modernization (Planning)</option>
            <option value="PRJ-003">PRJ-003 - Digital Identity Platform (Design)</option>
            <option value="PRJ-004">PRJ-004 - Cloud Infrastructure Migration (Execution)</option>
            <option value="PRJ-005">PRJ-005 - Supply Chain Analytics (Closure)</option>
          </select>
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  @Output() roleChanged = new EventEmitter<string>();
  @Output() projectChanged = new EventEmitter<string>();

  constructor(private projectState: ProjectStateService) {}

  onRoleSelect(event: any): void {
    this.roleChanged.emit(event.target.value);
  }

  onProjectSelect(event: any): void {
    const code = event.target.value;
    this.projectState.setSelectedProject(code);
    this.projectChanged.emit(code);
  }
}
