import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../services/agent.service';
import { ProjectStateService } from '../../services/project-state.service';

@Component({
  selector: 'app-chat-vision',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-vision.component.html'
})
export class ChatVisionComponent implements OnInit {
  selectedProjectCode: string = 'PRJ-001';
  projectsList: string[] = ['PRJ-001', 'PRJ-002', 'PRJ-003', 'PRJ-004', 'PRJ-005'];
  userQuery: string = 'What are the top risks for PRJ-001?';
  chatResponse: string = '';

  constructor(
    private agentService: AgentService,
    private projectState: ProjectStateService
  ) {}

  ngOnInit(): void {
    this.projectState.selectedProject$.subscribe(code => {
      if (code && code !== this.selectedProjectCode) {
        this.selectedProjectCode = code;
        this.userQuery = `What are the top risks for ${code}?`;
      }
    });
  }

  onProjectChange(code: string): void {
    this.projectState.setSelectedProject(code);
  }

  sendQuery(): void {
    if (!this.userQuery || !this.userQuery.trim()) return;
    
    const query = this.userQuery.trim();
    this.chatResponse = 'Thinking...';
    
    this.agentService.sendAgentChat(query, this.selectedProjectCode).subscribe({
      next: (res) => {
        if (res && res.chat_result) {
          this.chatResponse = res.chat_result.response;
        }
      },
      error: (err) => {
        this.chatResponse = `Error: ${err.message || err}`;
      }
    });
  }
}
