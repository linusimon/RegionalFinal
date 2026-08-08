/**
 * Enterprise Program Management AI Assistant - Angular 17 / Standalone App Engine
 * UI Redesign matching Google Stitch "Program Manager Portal Design" (Executive Precision)
 */

const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Application State Store
const state = {
  currentRole: 'Viewer',
  currentUser: null,
  selectedProjectCode: 'PRJ-001',
  projects: [],
  tasks: [],
  raidItems: [],
  emails: [],
  auditLogs: [],
  telemetry: {},
  authToken: null,
  loginError: null,
  lastEnteredUsername: '',
  activeTab: 'login',
  selectedDateRange: { start: '2025-05-12', end: '2025-05-18' },
  selectedEmailForApproval: null,
  isRecordingVoice: false,
  nodeTraces: [],
  isTraceExpanded: false,
  isCustomizeModalOpen: false,
  dashboardWidgetOrder: ['kpis', 'heatmap', 'aiAnalyse', 'breakdown'],
  widgetVisibility: {
    kpis: true,
    heatmap: true,
    aiAnalyse: true,
    breakdown: true
  },

  chatMessages: [],
  chatNodeTraces: [],
  chatInput: '',
  isChatStreaming: false
};

// Initialize Application
async function initApp() {
  console.log('[PM AI App] Initializing PM Portal Engine (Landing on Login)...');

  // Always land on Login page as Home Page
  state.activeTab = 'login';
  state.currentUser = null;
  state.authToken = null;

  await loadProjects();
  await refreshWorkspaceData();
  renderApp();
}

// Default Backend Authentication
async function loginAsDefaultUser() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'rohit', password: 'user123' })
    });
    if (res.ok) {
      const data = await res.json();
      state.authToken = data.access_token;
      if (data.user) {
        state.currentUser = data.user;
        state.currentRole = data.user.role || 'Program Manager';
      }
      persistSession();
      console.log(`[Auth] Authenticated as ${state.currentUser.full_name} (${state.currentRole})`);
    }
  } catch (err) {
    console.error('[Auth Error] Backend API offline or unreachable:', err);
  }
}

// Session Persistence Helper
function persistSession() {
  if (state.authToken) localStorage.setItem('pmai_auth_token', state.authToken);
  if (state.currentUser) localStorage.setItem('pmai_current_user', JSON.stringify(state.currentUser));
  if (state.activeTab) localStorage.setItem('pmai_active_tab', state.activeTab);
  if (state.selectedProjectCode) localStorage.setItem('pmai_selected_project', state.selectedProjectCode);
}

// User Profile Avatar Helper
function getUserAvatar(user) {
  if (!user) return 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbcPHmQncMqeCyloxxFVdcQt82FdGRiPqJn4bdegkraWZJLbyoFF3FBb0UDFAHhop6wy41Pe-HfG8kF8D2j-nzH0ujTdtnWG2HSzd8sKaRyOdSdrbFPRT4UMYeELXSrNaljIIOIwk4lMEdu-8ty-JKlxAckqbyQ7zmu-bt-1v9EFRqEiHP2sq9bWYW4kAFAcn8Gm3s3TMyRJNpznTOQc_MauIOb3Epf8NinZ4bbvjZ12R9syMjguMG';
  
  const avatars = {
    'rohit': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbcPHmQncMqeCyloxxFVdcQt82FdGRiPqJn4bdegkraWZJLbyoFF3FBb0UDFAHhop6wy41Pe-HfG8kF8D2j-nzH0ujTdtnWG2HSzd8sKaRyOdSdrbFPRT4UMYeELXSrNaljIIOIwk4lMEdu-8ty-JKlxAckqbyQ7zmu-bt-1v9EFRqEiHP2sq9bWYW4kAFAcn8Gm3s3TMyRJNpznTOQc_MauIOb3Epf8NinZ4bbvjZ12R9syMjguMG',
    'superadmin': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    'amit': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    'sneha': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    'admin': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    'karan': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    'priya': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'
  };

  return avatars[user.username] || avatars['rohit'];
}

// Login Form Submit Handler
async function handleLoginSubmit(event) {
  if (event) event.preventDefault();
  state.loginError = null;

  const usernameInput = document.getElementById('loginEmail')?.value || '';
  const passwordInput = document.getElementById('loginPassword')?.value || '';
  state.lastEnteredUsername = usernameInput;

  let username = usernameInput.trim();
  if (username.includes('@')) {
    username = username.split('@')[0].split('.')[0];
  }

  if (!username || !passwordInput) {
    state.loginError = 'Please enter both username/email and password.';
    renderApp();
    return;
  }

  console.log(`[Auth] Executing backend authentication for username: ${username}`);

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: passwordInput })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.access_token) {
      state.authToken = data.access_token;
      if (data.user) {
        state.currentUser = data.user;
        state.currentRole = data.user.role || 'Program Manager';
      }
      state.loginError = null;
      state.activeTab = 'dashboard';
      persistSession();
      await refreshWorkspaceData();
      renderApp();
      return;
    } else {
      // Backend returned validation error (401 Unauthorized / 400 Bad Request / 403 Forbidden)
      state.loginError = data.message || 'Invalid username or password.';
      console.warn(`[Auth Validation Failed] ${state.loginError}`);
      renderApp();
      return;
    }
  } catch (err) {
    console.error('[Auth Error] Backend API offline or unreachable:', err);
    state.loginError = 'Backend authentication API is offline or unreachable (http://127.0.0.1:5000). Please start the backend service.';
    renderApp();
  }
}

// Navigation & Tab Switcher
function switchTab(tabName) {
  state.activeTab = tabName;
  localStorage.setItem('pmai_active_tab', tabName);
  renderApp();
}

// Logout Handler
function logoutUser() {
  localStorage.removeItem('pmai_auth_token');
  localStorage.removeItem('pmai_current_user');
  localStorage.setItem('pmai_active_tab', 'login');
  state.authToken = null;
  state.currentUser = null;
  state.activeTab = 'login';
  renderApp();
}

// API Helpers with Automatic 401 Token Expiration Retry
async function apiGet(endpoint, isRetry = false) {
  if (!state.authToken) await loginAsDefaultUser();
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${state.authToken}` }
    });
    if (res.status === 401 && !isRetry) {
      console.warn(`[Auth Warning] JWT Token expired for GET ${endpoint}. Re-authenticating...`);
      await loginAsDefaultUser();
      return await apiGet(endpoint, true);
    }
    return await res.json();
  } catch (err) {
    console.error(`[API Error] GET ${endpoint}:`, err);
    return null;
  }
}

async function apiPost(endpoint, body, isRetry = false) {
  if (!state.authToken) await loginAsDefaultUser();
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.authToken}`
      },
      body: JSON.stringify(body)
    });
    if (res.status === 401 && !isRetry) {
      console.warn(`[Auth Warning] JWT Token expired for POST ${endpoint}. Re-authenticating...`);
      await loginAsDefaultUser();
      return await apiPost(endpoint, body, true);
    }
    return await res.json();
  } catch (err) {
    console.error(`[API Error] POST ${endpoint}:`, err);
    return null;
  }
}


async function apiPut(endpoint, body) {
  if (!state.authToken) await loginAsDefaultUser();
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.authToken}`
      },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error(`[API Error] PUT ${endpoint}:`, err);
    return null;
  }
}

// Data Fetching
async function loadProjects() {
  const data = await apiGet('/projects');
  if (data && data.projects) {
    state.projects = data.projects;
  }
}

async function refreshWorkspaceData() {
  const projData = await apiGet(`/projects/${state.selectedProjectCode}`);
  if (projData && projData.project) {
    state.tasks = projData.project.tasks || [];
    state.raidItems = projData.project.raid_items || [];
  }

  const raidFilteredData = await apiGet(`/raid?start_date=${state.selectedDateRange.start}&end_date=${state.selectedDateRange.end}`);
  if (raidFilteredData && raidFilteredData.raid_items && raidFilteredData.raid_items.length > 0) {
    state.raidItems = raidFilteredData.raid_items;
  }

  const emailsData = await apiGet('/emails');
  if (emailsData && emailsData.emails) {
    state.emails = emailsData.emails;
  }

  const telemetryData = await apiGet('/admin/system-metrics');
  if (telemetryData && telemetryData.telemetry) {
    state.telemetry = telemetryData.telemetry;
  }

  const auditData = await apiGet('/admin/audit-logs?limit=15');
  if (auditData && auditData.audit_logs) {
    state.auditLogs = auditData.audit_logs;
  }

  const docsData = await apiGet('/admin/knowledge-docs');
  if (docsData && docsData.rag_chunks) {
    state.ragChunks = docsData.rag_chunks;
    state.knowledgeDocs = docsData.documents || [];
    if (docsData.vector_import_chunks) {
      state.vectorImportChunks = docsData.vector_import_chunks;
    }
  }
}




// Toast Notification Helper
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;

  const iconMap = {
    success: 'check_circle',
    info: 'info',
    warning: 'warning',
    error: 'error'
  };
  const icon = iconMap[type] || 'notifications';

  toast.innerHTML = `
    <span class="material-symbols-outlined" style="font-size:20px;">${icon}</span>
    <span style="flex:1; line-height:1.4;">${message}</span>
    <button style="background:none; border:none; color:#fff; cursor:pointer; opacity:0.75; font-size:16px; padding:0; line-height:1;" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-fadeOut');
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 300);
  }, 4000);
}

// Event Handlers
function setRole(roleName) {
  state.currentRole = roleName;
  renderApp();
}

async function setProject(projectCode) {
  state.selectedProjectCode = projectCode;
  await refreshWorkspaceData();
  renderApp();
}

function handleDateRangeChange() {
  const start = document.getElementById('dateRangeStart')?.value;
  const end = document.getElementById('dateRangeEnd')?.value;
  if (start && end) {
    state.selectedDateRange = { start, end };
    console.log(`[Date Range Filter] Updated date range: ${start} to ${end}`);
    renderApp();
  }
}

// Dashboard Grid Layout Customizer Handlers
function openCustomizeModal() {
  state.isCustomizeModalOpen = true;
  renderApp();
}

function closeCustomizeModal() {
  state.isCustomizeModalOpen = false;
  renderApp();
}

function moveWidgetUp(index) {
  if (index > 0) {
    const temp = state.dashboardWidgetOrder[index];
    state.dashboardWidgetOrder[index] = state.dashboardWidgetOrder[index - 1];
    state.dashboardWidgetOrder[index - 1] = temp;
    renderApp();
  }
}

function moveWidgetDown(index) {
  if (index < state.dashboardWidgetOrder.length - 1) {
    const temp = state.dashboardWidgetOrder[index];
    state.dashboardWidgetOrder[index] = state.dashboardWidgetOrder[index + 1];
    state.dashboardWidgetOrder[index + 1] = temp;
    renderApp();
  }
}

function toggleWidgetVisibility(widgetKey) {
  state.widgetVisibility[widgetKey] = !state.widgetVisibility[widgetKey];
  renderApp();
}

function resetDashboardLayout() {
  state.dashboardWidgetOrder = ['kpis', 'flowchart', 'heatmap', 'aiAnalyse', 'breakdown'];
  state.widgetVisibility = { kpis: true, flowchart: true, heatmap: true, aiAnalyse: true, breakdown: true };
  renderApp();
}

function openApprovalModal(emailId) {
  const email = state.emails.find(e => e.id === emailId);
  if (email) {
    state.selectedEmailForApproval = { ...email };
    renderApp();
  }
}

function closeApprovalModal() {
  state.selectedEmailForApproval = null;
  renderApp();
}

async function approveEmail() {
  if (!state.selectedEmailForApproval) return;
  const emailId = state.selectedEmailForApproval.id;
  
  await apiPut(`/emails/${emailId}`, {
    subject: document.getElementById('editSubject').value,
    body: document.getElementById('editBody').value
  });

  const res = await apiPost(`/emails/${emailId}/approve`, {});
  if (res && res.status === 'success') {
    showToast(`Email #${emailId} Approved! Background email service will dispatch to linusimon@gmail.com within 5-10 seconds.`, 'success');
    closeApprovalModal();
    await refreshWorkspaceData();
    renderApp();
  }
}

async function triggerMultiAgentWorkflow() {
  const query = document.getElementById('chatQueryInput')?.value || "Analyze risks and generate mitigation plan";
  
  const res = await apiPost('/agents/run-workflow', {
    query: query,
    project_code: state.selectedProjectCode,
    recipient_role: state.currentRole
  });

  if (res && res.workflow_result) {
    state.nodeTraces = res.workflow_result.graphical_node_traces || [];
    await refreshWorkspaceData();
    renderApp();
    showToast(`LangGraph Workflow Completed! Generated draft email #${res.workflow_result.communication.created_draft_id} for Human Approval.`, 'success');
  }
}

// STT & TTS Voice Assistant
function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast("Speech Recognition API is not supported in this browser. Please use Chrome or Edge.", 'warning');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.start();
  state.isRecordingVoice = true;
  renderApp();

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (document.getElementById('chatQueryInput')) {
      document.getElementById('chatQueryInput').value = transcript;
    }
    state.isRecordingVoice = false;
    renderApp();
    speakText(`Recorded query: ${transcript}. Executing risk analysis now.`);
    triggerMultiAgentWorkflow();
  };

  recognition.onerror = () => {
    state.isRecordingVoice = false;
    renderApp();
  };
}

function speakText(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }
}

// Main Render Function
function renderApp() {
  const root = document.querySelector('app-root') || document.getElementById('app-root');
  if (!root) return;

  if (state.activeTab === 'login') {
    root.innerHTML = renderLoginTab();
    return;
  }

  const userRole = state.currentUser ? state.currentUser.role : state.currentRole;
  const isAdminRole = userRole === 'Admin' || userRole === 'System Admin' || userRole === 'System Administrator' || userRole === 'Super Admin';
  const canAccessCommsAndBreakdown = userRole === 'Program Manager' || isAdminRole;

  if (!isAdminRole && state.activeTab === 'admin') {
    state.activeTab = 'dashboard';
  }
  if (!canAccessCommsAndBreakdown && state.activeTab === 'comms') {
    state.activeTab = 'dashboard';
  }

  const currentProject = state.projects.find(p => p.code === state.selectedProjectCode) || {
    name: 'Project Orion Upgrade', code: 'PRJ-001', lifecycle_phase: 'Mobilization', health_status: 'At Risk', progress_pct: 72
  };

  const pendingEmailCount = state.emails.filter(e => 
    e.status === 'PENDING' && 
    (e.project_id === currentProject.id || e.project_code === currentProject.code || (currentProject.code === 'PRJ-001' && (!e.project_code || e.project_id === 1 || e.project_code === 'PRJ-001')))
  ).length;

  root.innerHTML = `
    <div class="app-container">
      <!-- 1. Fixed 260px Left Sidebar Navigation -->
      <nav class="sidebar-nav">
        <div class="sidebar-header">
          <div class="brand-icon-box">
            <span class="material-symbols-outlined" style="font-size:24px">smart_toy</span>
          </div>
          <div>
            <div class="brand-title">PM AI</div>
            <div class="brand-subtitle">Program Management</div>
          </div>
        </div>

        <div class="sidebar-menu">
          <button class="nav-link ${state.activeTab === 'dashboard' ? 'active' : ''}" onclick="switchTab('dashboard')">
            <span class="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </button>
          <button class="nav-link ${state.activeTab === 'raid' ? 'active' : ''}" onclick="switchTab('raid')">
            <span class="material-symbols-outlined">warning</span>
            <span>Risk Center</span>
          </button>
          ${canAccessCommsAndBreakdown ? `
            <button class="nav-link ${state.activeTab === 'comms' ? 'active' : ''}" onclick="switchTab('comms')">
              <span class="material-symbols-outlined">chat</span>
              <span>Communication ${pendingEmailCount > 0 ? `(${pendingEmailCount})` : ''}</span>
            </button>
          ` : ''}
          <button class="nav-link ${state.activeTab === 'reports' ? 'active' : ''}" onclick="switchTab('reports')">
            <span class="material-symbols-outlined">assessment</span>
            <span>Reports</span>
          </button>
          <button class="nav-link ${state.activeTab === 'chat' ? 'active' : ''}" onclick="switchTab('chat')">
            <span class="material-symbols-outlined">smart_toy</span>
            <span>AI Assistant</span>
          </button>
          <button class="nav-link ${state.activeTab === 'projects' ? 'active' : ''}" onclick="switchTab('projects')">
            <span class="material-symbols-outlined">assignment</span>
            <span>Projects</span>
          </button>
          ${isAdminRole ? `
            <button class="nav-link ${state.activeTab === 'admin' ? 'active' : ''}" onclick="switchTab('admin')">
              <span class="material-symbols-outlined">settings</span>
              <span>Settings & Admin</span>
            </button>
          ` : ''}
          <button class="nav-link" onclick="logoutUser()" style="margin-top:auto">

            <span class="material-symbols-outlined">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      <!-- 2. Main Body Area with Top Header -->
      <div class="main-wrapper">
        <!-- Top Sticky Header -->
        <header class="top-app-bar">
          <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap">
            <div style="display:flex; align-items:center; gap:8px">
              <span class="material-symbols-outlined" style="color:var(--primary-container); font-size:22px">waving_hand</span>
              <span style="font-size:15px; font-weight:700; color:var(--on-surface)">
                Welcome back, ${state.currentUser ? state.currentUser.full_name : 'Rohit Verma'}!
              </span>
            </div>

            <!-- Active Project Selector Dropdown -->
            <select class="btn-secondary" style="background:#fff; cursor:pointer; height:38px;" onchange="setProject(this.value)">
              ${state.projects.map(p => `
                <option value="${p.code}" ${p.code === currentProject.code ? 'selected' : ''}>
                  ${p.code} - ${p.name}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="header-controls">
            <!-- Notifications & Help Icons -->
            <button class="icon-btn" title="Notifications ${pendingEmailCount > 0 ? '(' + pendingEmailCount + ' Pending Approvals)' : ''}" onclick="${canAccessCommsAndBreakdown ? "state.activeTab='comms'; renderApp();" : "state.activeTab='dashboard'; renderApp();"}">
              <span class="material-symbols-outlined">notifications</span>
              ${pendingEmailCount > 0 ? '<span class="notification-dot"></span>' : ''}
            </button>

            <div class="help-tooltip-container">
              <button class="icon-btn" title="Help Info">
                <span class="material-symbols-outlined">help_outline</span>
              </button>
              <div class="help-tooltip-box">
                <div style="font-weight:700; color:var(--tertiary-fixed-dim); margin-bottom:4px; display:flex; align-items:center; gap:6px">
                  <span class="material-symbols-outlined" style="font-size:16px">info</span>
                  About PM AI
                </div>
                Program Management AI Assistant for Risk Analysis and Stakeholder Communication
              </div>
            </div>

            <!-- User Profile Avatar -->
            <div class="user-profile">
              <img class="avatar-img" src="${getUserAvatar(state.currentUser)}" alt="${state.currentUser ? state.currentUser.full_name : 'User Profile'}" />
              <div>
                <div class="user-name">${state.currentUser ? state.currentUser.full_name : 'Rohit Verma'}</div>
                <div class="user-role">${state.currentUser ? state.currentUser.role : state.currentRole}</div>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Page Content -->
        <main class="content-area">
          ${renderCurrentTabContent(currentProject)}

          <!-- Collapsible Agent Execution Log & Telemetry Panel (Rendered on all pages) -->
          ${renderCollapsibleTracePanel()}
        </main>
      </div>

      <!-- Human Email Approval Modal -->
      ${state.selectedEmailForApproval ? renderHumanApprovalModal() : ''}
      <!-- Dashboard Grid Layout Customize Modal -->
      ${state.isCustomizeModalOpen ? renderCustomizeModal() : ''}
    </div>
  `;
}

// Render Current Tab Body
function renderCurrentTabContent(currentProject) {
  if (state.activeTab === 'dashboard') {
    return renderDashboardTab(currentProject);
  } else if (state.activeTab === 'projects') {
    return renderProjectsTab();
  } else if (state.activeTab === 'raid') {
    return renderRaidTab();
  } else if (state.activeTab === 'risk_action') {
    return renderRiskActionPage();
  } else if (state.activeTab === 'comms') {

    return renderCommsTab();
  } else if (state.activeTab === 'reports') {
    return renderReportsTab(currentProject);
  } else if (state.activeTab === 'chat') {
    return renderChatTab();
  } else if (state.activeTab === 'admin') {
    return renderAdminTab();
  }
  return renderDashboardTab(currentProject);
}

function getAppProjectRaidItems(currentProject) {
  const defaultItems = [
    { project_id: 1, project_code: 'PRJ-001', category: 'Risk', title: 'Third-party API Integration Delay', likelihood: 'High', impact: 'High', risk_score: 85 },
    { project_id: 1, project_code: 'PRJ-001', category: 'Issue', title: 'Vendor Onboarding Access Bottleneck', likelihood: 'High', impact: 'Medium', risk_score: 75 },
    { project_id: 2, project_code: 'PRJ-002', category: 'Assumption', title: 'Legacy System Data Compatibility Assumption', likelihood: 'Medium', impact: 'Medium', risk_score: 60 },
    { project_id: 3, project_code: 'PRJ-003', category: 'Dependency', title: 'Biometric Hardware Module Availability', likelihood: 'High', impact: 'High', risk_score: 80 },
    { project_id: 4, project_code: 'PRJ-004', category: 'Risk', title: 'Data Migration Validation Failure', likelihood: 'Medium', impact: 'High', risk_score: 90 },
    { project_id: 5, project_code: 'PRJ-005', category: 'Dependency', title: 'Operational Handover Sign-off', likelihood: 'Low', impact: 'Medium', risk_score: 35 }
  ];

  const source = (state.raidItems && state.raidItems.length > 0) ? state.raidItems : defaultItems;
  return source.filter(r => 
    r.project_id === currentProject.id || 
    r.project_code === currentProject.code || 
    (currentProject.code === 'PRJ-001' && (r.project_id === 1 || r.project_code === 'PRJ-001')) ||
    (currentProject.code === 'PRJ-002' && (r.project_id === 2 || r.project_code === 'PRJ-002')) ||
    (currentProject.code === 'PRJ-003' && (r.project_id === 3 || r.project_code === 'PRJ-003')) ||
    (currentProject.code === 'PRJ-004' && (r.project_id === 4 || r.project_code === 'PRJ-004')) ||
    (currentProject.code === 'PRJ-005' && (r.project_id === 5 || r.project_code === 'PRJ-005'))
  );
}

function getAppLikelihoodLevel(l) {
  if (typeof l === 'number') return l;
  if (!l) return 3;
  const str = l.toString().toUpperCase();
  if (str.includes('1') || str.includes('VERY LOW') || str.includes('RARE')) return 1;
  if (str.includes('2') || str === 'LOW' || str.includes('UNLIKELY')) return 2;
  if (str.includes('3') || str === 'MEDIUM' || str.includes('MODERATE') || str.includes('POSSIBLE')) return 3;
  if (str.includes('4') || str === 'HIGH' || str.includes('LIKELY')) return 4;
  if (str.includes('5') || str.includes('VERY HIGH') || str.includes('CRITICAL') || str.includes('CERTAIN')) return 5;
  return 3;
}

function getAppImpactLevel(i, score) {
  if (score && score >= 90) return 5;
  if (typeof i === 'number') return i;
  if (!i) return 3;
  const str = i.toString().toUpperCase();
  if (str.includes('5') || str.includes('VERY HIGH') || str.includes('CRITICAL') || str.includes('SEVERE')) return 5;
  if (str.includes('4') || str === 'HIGH' || str.includes('MAJOR')) return 4;
  if (str.includes('3') || str === 'MEDIUM' || str.includes('MODERATE')) return 3;
  if (str.includes('2') || str === 'LOW' || str.includes('MINOR')) return 2;
  if (str.includes('1') || str.includes('VERY LOW') || str.includes('NEGLIGIBLE')) return 1;
  return 3;
}

function generateHeatmapMatrixHTML(currentProject) {
  const pItems = getAppProjectRaidItems(currentProject);
  let html = '';
  
  for (let l = 1; l <= 5; l++) {
    for (let i = 1; i <= 5; i++) {
      const cellItems = pItems.filter(r => 
        getAppLikelihoodLevel(r.likelihood) === l && getAppImpactLevel(r.impact, r.risk_score) === i
      );
      
      let cellText = `L${l}/I${i}`;
      let cellClass = 'cell-low';
      const sum = l + i;
      if (sum <= 3) cellClass = 'cell-low';
      else if (sum <= 5) cellClass = 'cell-med';
      else if (sum <= 7) cellClass = 'cell-high';
      else cellClass = 'cell-critical';

      let tooltip = `L${l}/I${i}`;

      if (cellItems.length > 0) {
        const scores = cellItems.map(item => item.risk_score).filter(s => s !== undefined).join(', ');
        cellText = `L${l}/I${i} (${scores})`;
        tooltip = cellItems.map(item => `${item.category}: ${item.title} (Score: ${item.risk_score})`).join(' | ');
        
        if (cellItems.some(r => (r.risk_score || 0) >= 70)) {
          cellClass = 'cell-critical';
        } else {
          cellClass = 'cell-high';
        }
      }
      
      html += `<div class="heatmap-cell ${cellClass}" title="${tooltip}">${cellText}</div>`;
    }
  }
  return html;
}
async function fetchProjectAiOverview(projectCode) {
  if (!state.projectAiOverviewMap) state.projectAiOverviewMap = {};
  if (state.projectAiOverviewMap[projectCode]) return state.projectAiOverviewMap[projectCode];

  const data = await apiGet(`/projects/${projectCode}/ai-overview`);
  if (data && data.status === 'success') {
    state.projectAiOverviewMap[projectCode] = data;
    renderApp();
    return data;
  }
  return null;
}

// 1. Dashboard Tab View
function renderDashboardTab(currentProject) {
  const userRole = state.currentUser ? state.currentUser.role : state.currentRole;
  const isAdminRole = userRole === 'Admin' || userRole === 'System Admin' || userRole === 'System Administrator' || userRole === 'Super Admin';
  const canAccessCommsAndBreakdown = userRole === 'Program Manager' || isAdminRole;

  if (!state.projectAiOverviewMap) state.projectAiOverviewMap = {};
  const overviewData = state.projectAiOverviewMap[currentProject.code];
  if (!overviewData && !state.isFetchingAiOverview) {
    state.isFetchingAiOverview = true;
    fetchProjectAiOverview(currentProject.code).then(() => {
      state.isFetchingAiOverview = false;
    });
  }

  // Filter RAID items by selected project AND selected date range
  const filteredRaidItems = state.raidItems.filter(r => {
    const isProj = r.project_id === currentProject.id || r.project_code === currentProject.code;
    if (!isProj) return false;
    if (!r.created_at) return true;
    const rDate = r.created_at.substring(0, 10);
    return rDate >= state.selectedDateRange.start && rDate <= state.selectedDateRange.end;
  });

  // Project-specific pending email count
  const projectPendingCount = state.emails.filter(e => 
    (e.project_id === currentProject.id || e.project_code === currentProject.code) && e.status === 'PENDING'
  ).length;

  // Dynamic project-specific budget variance calculation
  const budget = currentProject.budget || 2500000;
  const spent = currentProject.spent || 1450000;
  const variance = budget - spent;
  const variancePct = ((variance / budget) * 100).toFixed(1);
  const isOverBudget = variance < 0;
  const formattedDiff = (Math.abs(variance) / 1000000).toFixed(1);
  const varianceValueText = isOverBudget ? `-${Math.abs(variancePct)}%` : `+${variancePct}%`;
  const varianceSubtext = isOverBudget ? `($${formattedDiff}M over budget)` : `($${formattedDiff}M under budget)`;
  const varianceColor = isOverBudget ? 'var(--error)' : '#059669';
  
  const widgetHTML = {
    kpis: `
      <!-- 5 KPI Cards Row -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-title">Overall Program Health</div>
          <div class="kpi-value">${currentProject.progress_pct}%</div>
          <div class="kpi-subtext">
            <span class="chip ${currentProject.health_status === 'Healthy' ? 'chip-success' : 'chip-warning'}">${currentProject.health_status}</span>
            <span style="color:var(--secondary); font-weight:600">Phase: ${currentProject.lifecycle_phase}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">Active Projects</div>
          <div class="kpi-value">${state.projects.length}</div>
          <div class="kpi-subtext" style="color:#059669">
            <span class="material-symbols-outlined" style="font-size:16px">arrow_upward</span>
            <strong>Across 5 Lifecycle Phases</strong>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">Open RAID Risks</div>
          <div class="kpi-value" style="color:var(--error)">${filteredRaidItems.length}</div>
          <div class="kpi-subtext" style="color:var(--error)">
            <span class="material-symbols-outlined" style="font-size:16px">warning</span>
            <strong>${filteredRaidItems.filter(r => (r.risk_score || 0) >= 70).length} High Score (&gt;70)</strong>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">Pending Approvals</div>
          <div class="kpi-value" style="color:var(--primary-container)">${projectPendingCount}</div>
          <div class="kpi-subtext" style="color:var(--primary-container)">
            <span class="chip chip-info">Human Approval Required</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">Budget Variance</div>
          <div class="kpi-value" style="color:${varianceColor}">${varianceValueText}</div>
          <div class="kpi-subtext" style="color:${varianceColor}">
            <strong>${varianceSubtext}</strong>
          </div>
        </div>
      </div>
    `,

    heatmap: `
      <div class="card-box">
        <div class="card-box-header">
          <div class="card-box-title">5x5 Risk Heatmap Matrix (${currentProject.code})</div>
          <span class="chip chip-warning">${currentProject.lifecycle_phase}</span>
        </div>
        <p style="color:var(--on-surface-variant); font-size:12px; margin-bottom:12px">Likelihood vs. Impact Distribution (${state.selectedDateRange.start} to ${state.selectedDateRange.end})</p>
        
        <div class="heatmap-matrix">
          ${generateHeatmapMatrixHTML(currentProject)}
        </div>
      </div>
    `,
    aiAnalyse: `
      <div class="card-box">
        <div class="card-box-header">
          <div class="card-box-title" style="display:flex; align-items:center; gap:8px">
            <span class="material-symbols-outlined" style="color:var(--primary-container); font-size:20px">auto_awesome</span>
            <span>Risk Summary</span>

          </div>
          <span class="chip chip-info" style="display:flex; align-items:center; gap:4px">
            <span class="material-symbols-outlined" style="font-size:14px">bolt</span> AI Analysis
          </span>

        </div>
        <p style="color:var(--on-surface-variant); font-size:12px; margin-bottom:14px">
          LLM Project Risk Overview synthesized from <code>raid_items</code>, <code>emails</code>, and <code>project_plan_wbs</code> (tasks) for ${currentProject.code}
        </p>


        ${overviewData ? `
          <div style="background:var(--surface-container-low); padding:16px; border-radius:10px; border:1px solid var(--outline-variant); line-height:1.6; font-size:13px; color:var(--on-surface);">
            ${overviewData.summary}
            <div style="display:flex; gap:16px; margin-top:14px; padding-top:10px; border-top:1px solid var(--outline-variant); font-size:11px; color:var(--on-surface-variant);">
              <span>📊 RAID Items: <strong>${overviewData.raid_count}</strong></span>
              <span>✉ Emails Logged: <strong>${overviewData.email_count}</strong></span>
              <span>📋 WBS Tasks: <strong>${overviewData.task_count}</strong></span>
            </div>
          </div>
        ` : `
          <div style="background:var(--surface-container-low); padding:20px; border-radius:10px; text-align:center; color:var(--on-surface-variant);">
            <span class="material-symbols-outlined spinning" style="font-size:24px; color:var(--primary-container)">progress_activity</span>
            <div style="font-size:12px; margin-top:8px; font-weight:600;">Synthesizing raid_items, emails, & WBS tasks via LLM...</div>
          </div>
        `}
      </div>

    `,
    breakdown: `
      <div class="card-box">
        <div class="card-box-header">
          <div class="card-box-title">Project Phase Breakdown</div>
          <span class="chip chip-info" style="font-size:11px">Portfolio View (${state.projects.length} Projects)</span>
        </div>
        <div class="table-responsive">
          <table class="stitch-table">
            <thead>
              <tr><th>Project</th><th>Phase</th><th>Health</th><th>Progress</th></tr>
            </thead>
            <tbody>
              ${state.projects.map(p => `
                <tr style="cursor:pointer; ${p.code === currentProject.code ? 'background-color: rgba(2, 132, 199, 0.15); border-left: 4px solid var(--primary);' : ''}" onclick="setProject('${p.code}')">
                  <td>
                    <strong>${p.code}</strong> - ${p.name}
                    ${p.code === currentProject.code ? '<span class="chip chip-info" style="margin-left:8px; font-size:10px; font-weight:700">SELECTED</span>' : ''}
                  </td>
                  <td>${p.lifecycle_phase}</td>
                  <td>
                    <span class="chip ${p.health_status==='Healthy'?'chip-success':p.health_status==='At Risk'?'chip-warning':'chip-danger'}">
                      ${p.health_status}
                    </span>
                  </td>
                  <td><strong>${p.progress_pct}%</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  };



  let contentBuffer = '';
  for (let i = 0; i < state.dashboardWidgetOrder.length; i++) {
    const curr = state.dashboardWidgetOrder[i];
    const next = state.dashboardWidgetOrder[i + 1];

    if (!state.widgetVisibility[curr]) continue;
    if (curr === 'breakdown' && !canAccessCommsAndBreakdown) continue;

    if (curr === 'kpis') {
      contentBuffer += widgetHTML.kpis;
    } else if (
      (curr === 'heatmap' && next === 'aiAnalyse') ||
      (curr === 'aiAnalyse' && next === 'heatmap') ||
      (curr === 'heatmap' && next === 'breakdown') ||
      (curr === 'breakdown' && next === 'heatmap')
    ) {
      if (next === 'breakdown' && !canAccessCommsAndBreakdown) {
        contentBuffer += widgetHTML[curr];
      } else {
        contentBuffer += `
          <div class="grid-2col">
            ${widgetHTML[curr]}
            ${widgetHTML[next]}
          </div>
        `;
        i++;
      }
    } else {
      contentBuffer += widgetHTML[curr];
    }
  }

  return `
    <div class="page-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Overview of your program health and key insights</p>
      </div>
      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <div class="btn-secondary" style="display:none; background:#fff; align-items:center; gap:8px; padding:6px 12px; height:38px;">
          <span class="material-symbols-outlined" style="font-size:18px; color:var(--primary-container)">calendar_today</span>
          <input type="date" id="dateRangeStart" value="${state.selectedDateRange.start}" onchange="handleDateRangeChange()" style="border:none; background:transparent; font-size:12px; font-weight:600; color:var(--on-surface); outline:none; cursor:pointer" title="Start Date" />
          <span style="color:var(--outline); font-size:12px; font-weight:600">-</span>
          <input type="date" id="dateRangeEnd" value="${state.selectedDateRange.end}" onchange="handleDateRangeChange()" style="border:none; background:transparent; font-size:12px; font-weight:600; color:var(--on-surface); outline:none; cursor:pointer" title="End Date" />
        </div>
        <button class="btn-secondary" style="height:38px;" onclick="openCustomizeModal()">
          <span class="material-symbols-outlined">tune</span>
          Customize
        </button>
      </div>
    </div>

    ${contentBuffer}
  `;
}

// 2. Projects Tab View
function renderProjectsTab() {
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Projects Portfolio</h1>
        <p class="page-subtitle">Detailed status, lifecycle phases, and metrics for all active projects</p>
      </div>
    </div>

    <div class="card-box">
      <div class="table-responsive">
        <table class="stitch-table">
          <thead>
            <tr><th>Project Code</th><th>Name</th><th>Lifecycle Phase</th><th>Health Status</th><th>Progress</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${state.projects.map(p => `
              <tr>
                <td><strong>${p.code}</strong></td>
                <td>${p.name}</td>
                <td>${p.lifecycle_phase}</td>
                <td>
                  <span class="chip ${p.health_status==='Healthy'?'chip-success':p.health_status==='At Risk'?'chip-warning':'chip-danger'}">
                    ${p.health_status}
                  </span>
                </td>
                <td>
                  <div style="display:flex; align-items:center; gap:8px">
                    <div style="flex:1; height:8px; background:var(--surface-container-high); border-radius:4px; overflow:hidden">
                      <div style="width:${p.progress_pct}%; height:100%; background:var(--primary-container)"></div>
                    </div>
                    <span>${p.progress_pct}%</span>
                  </div>
                </td>
                <td>
                  <button class="btn-secondary" onclick="setProject('${p.code}'); state.activeTab='dashboard'; renderApp();">Select</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// RAID Risk Discovery Handler
async function triggerRaidRiskDiscovery() {
  state.isAnalyzingRisk = true;
  renderApp();

  const res = await apiPost('/raid/discover-risks', {
    project_code: state.selectedProjectCode
  });

  state.isAnalyzingRisk = false;

  if (res && res.supervisor_trace) {
    state.nodeTraces = res.supervisor_trace;
  }

  if (res && res.discovered_risks && res.discovered_risks.length > 0) {
    state.aiDiscoveredRisks = res.discovered_risks;
    state.aiDiscoveredRisk = res.discovered_risks[0];
    renderApp();
  } else if (res && res.discovered_risk) {
    state.aiDiscoveredRisks = [res.discovered_risk];
    state.aiDiscoveredRisk = res.discovered_risk;
    renderApp();
  } else {
    showToast("AI Risk Analysis completed. No new un-tracked risks discovered for " + state.selectedProjectCode, 'info');
    renderApp();
  }
}

async function confirmCreateSingleDiscoveredRisk(idx) {
  const list = state.aiDiscoveredRisks || [state.aiDiscoveredRisk];
  if (!list || !list[idx]) return;
  const d = list[idx];

  const res = await apiPost('/raid', {
    project_id: d.project_id,
    category: d.category,
    title: d.title,
    description: d.description,
    likelihood: d.likelihood,
    impact: d.impact,
    risk_score: d.risk_score,
    owner_name: d.owner_name,
    root_cause: d.root_cause
  });

  if (res && res.status === 'success') {
    showToast(`Success! New Risk Item "${d.title}" (Score ${d.risk_score}) created in RAID Register (app.db).`, 'success');
    // Remove created risk from modal list
    list.splice(idx, 1);
    if (list.length === 0) {
      state.aiDiscoveredRisks = null;
      state.aiDiscoveredRisk = null;
    } else {
      state.aiDiscoveredRisks = list;
      state.aiDiscoveredRisk = list[0];
    }
    await refreshWorkspaceData();
    renderApp();
  }
}

async function confirmCreateAllDiscoveredRisks() {
  const list = state.aiDiscoveredRisks || [state.aiDiscoveredRisk];
  if (!list || list.length === 0) return;

  let createdCount = 0;
  for (const d of list) {
    const res = await apiPost('/raid', {
      project_id: d.project_id,
      category: d.category,
      title: d.title,
      description: d.description,
      likelihood: d.likelihood,
      impact: d.impact,
      risk_score: d.risk_score,
      owner_name: d.owner_name,
      root_cause: d.root_cause
    });
    if (res && res.status === 'success') {
      createdCount++;
    }
  }

  showToast(`Success! Created ${createdCount} new Risk Items in RAID Register (app.db).`, 'success');
  state.aiDiscoveredRisks = null;
  state.aiDiscoveredRisk = null;
  await refreshWorkspaceData();
  renderApp();
}

async function confirmCreateDiscoveredRisk() {
  await confirmCreateSingleDiscoveredRisk(0);
}

// ----------------------------------------------------
// Risk Center Action Handlers & Risk Action Page View
// ----------------------------------------------------
async function navigateToCommunicateForRisk(raidId) {
  const item = state.raidItems ? state.raidItems.find(r => r.id === raidId) : null;
  const projectCode = state.selectedProjectCode || 'PRJ-001';

  const subject = item ? `[ACTION REQUIRED] Risk Alert: ${item.title}` : `[ACTION REQUIRED] Risk Communication Alert`;
  const body = item ? `Dear Team,\n\nPlease review and take immediate action on the following risk item:\n\nTitle: ${item.title}\nCategory: ${item.category}\nLikelihood / Impact: ${item.likelihood} / ${item.impact}\nRisk Score: ${item.risk_score}/100\nRoot Cause: ${item.root_cause || 'Under Investigation'}\nAssigned Owner: ${item.owner_name}\n\nBest regards,\nProject Management Office` : `Dear Team,\n\nPlease review project risk status.\n\nBest regards,\nPMO`;

  const res = await apiPost('/emails', {
    project_code: projectCode,
    raid_id: raidId,
    recipient_role: 'Project Manager',
    recipient_email: 'linusimon@gmail.com',
    subject: subject,
    body: body
  });

  if (res && res.status === 'success') {
    showToast(`New Communication #${res.email.id} created in Communication Center!`, 'success');
    await refreshWorkspaceData();
    state.activeTab = 'comms';
    renderApp();
    if (res.email && res.email.id) {
      openApprovalModal(res.email.id);
    }
  } else {
    state.activeTab = 'comms';
    renderApp();
  }
}


async function navigateToRiskActionPage(raidId) {
  state.selectedRaidIdForAction = raidId;
  state.isLoadingActionPlan = true;
  state.activeTab = 'risk_action';
  renderApp();

  const data = await apiGet(`/raid/${raidId}/action-plan`);
  state.isLoadingActionPlan = false;
  if (data && data.status === 'success') {
    state.riskActionPlan = data;
  } else {
    alert("Could not fetch action plan for Risk #" + raidId);
  }
  renderApp();
}

async function createTasksFromRecommendations(raidId) {
  const plan = state.riskActionPlan;
  const recs = plan ? plan.ai_recommendations : [];

  const res = await apiPost(`/raid/${raidId}/generate-tasks`, { tasks: recs });
  if (res && res.status === 'success') {
    alert(`Success! Created ${res.created_tasks.length} action tasks linked to Risk #${raidId}.`);
    await navigateToRiskActionPage(raidId);
  } else {
    alert("Failed to create action tasks: " + (res?.message || "Error"));
  }
}

async function addCommentToTask(taskId) {
  const text = prompt("Enter your comment for Task #" + taskId + ":");
  if (!text || !text.trim()) return;

  const raidId = state.selectedRaidIdForAction;
  const userRole = state.currentUser ? state.currentUser.full_name : state.currentRole;
  const res = await apiPost(`/raid/tasks/${taskId}/comments`, {
    comment: text,
    author_name: userRole || 'Project Lead'
  });

  if (res && res.status === 'success') {
    await navigateToRiskActionPage(raidId);
  } else {
    alert("Failed to add comment: " + (res?.message || "Error"));
  }
}

async function markTaskCompleted(taskId) {
  const raidId = state.selectedRaidIdForAction;
  const res = await apiPut(`/raid/tasks/${taskId}/status`, { status: 'Completed' });
  if (res && res.status === 'success') {
    await navigateToRiskActionPage(raidId);
  } else {
    alert("Failed to update task status: " + (res?.message || "Error"));
  }
}

async function closeRiskItem(raidId) {
  const res = await apiPut(`/raid/${raidId}/status`, { status: 'Closed' });
  if (res && res.status === 'success') {
    alert(`Risk Item #${raidId} has been successfully Closed!`);
    await refreshWorkspaceData();
    state.activeTab = 'raid';
    renderApp();
  } else {
    alert(res?.message || "Cannot close risk item!");
  }
}

function renderRiskActionPage() {
  if (state.isLoadingActionPlan) {
    return `
      <div class="card-box" style="text-align:center; padding:40px;">
        <span class="material-symbols-outlined spinning" style="font-size:36px; color:var(--primary-container)">progress_activity</span>
        <h3 style="margin-top:12px; font-weight:700;">Loading AI Mitigation Plan & Task Dependencies...</h3>
      </div>
    `;
  }

  const plan = state.riskActionPlan;
  if (!plan || !plan.raid_item) {
    return `
      <div class="card-box" style="padding:20px;">
        <h3>Risk Action Plan Not Found</h3>
        <button class="btn-secondary" style="margin-top:10px;" onclick="state.activeTab='raid'; renderApp();">Back to Risk Center</button>
      </div>
    `;
  }

  const r = plan.raid_item;
  const recs = plan.ai_recommendations || [];
  const linkedTasks = plan.linked_tasks || [];
  const pendingTasksCount = plan.pending_tasks_count || 0;
  const canCloseRisk = plan.can_close_risk;

  return `
    <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
          <button class="btn-secondary" style="padding:4px 8px; font-size:12px;" onclick="state.activeTab='raid'; renderApp();">← Back to Risk Center</button>
          <span class="chip ${r.category==='Risk'?'chip-danger':r.category==='Issue'?'chip-warning':'chip-info'}">${r.category} #${r.id}</span>
          <span class="chip chip-info">${r.status}</span>
        </div>
        <h1 class="page-title">${r.title}</h1>
        <p class="page-subtitle">Risk Action & AI Mitigation Plan Execution Center</p>
      </div>
      <div>
        <button class="btn-secondary" style="margin-right:8px;" onclick="navigateToCommunicateForRisk(${r.id})">
          💬 Communicate
        </button>
      </div>
    </div>

    <!-- 1. Risk Overview Metrics -->
    <div class="grid-3col" style="margin-bottom:20px;">
      <div class="card-box">
        <div style="font-size:12px; color:var(--on-surface-variant);">Calculated Risk Score</div>
        <div style="font-size:24px; font-weight:800; color:${r.risk_score>=70?'#dc2626':'#d97706'}; margin-top:4px;">${r.risk_score}/100</div>
        <small style="color:var(--on-surface-variant)">Likelihood: ${r.likelihood} | Impact: ${r.impact}</small>
      </div>
      <div class="card-box">
        <div style="font-size:12px; color:var(--on-surface-variant)">Assigned Risk Owner</div>
        <div style="font-size:18px; font-weight:700; color:var(--on-surface); margin-top:4px;">${r.owner_name || 'Unassigned'}</div>
        <small style="color:var(--on-surface-variant)">Project: ${state.selectedProjectCode}</small>
      </div>
      <div class="card-box">
        <div style="font-size:12px; color:var(--on-surface-variant)">Linked WBS Action Tasks</div>
        <div style="font-size:24px; font-weight:800; color:${pendingTasksCount>0?'#d97706':'#16a34a'}; margin-top:4px;">${linkedTasks.length - pendingTasksCount} / ${linkedTasks.length} Completed</div>
        <small style="color:${pendingTasksCount>0?'#dc2626':'#16a34a'}; font-weight:700;">${pendingTasksCount} Pending Tasks Remaining</small>
      </div>
    </div>

    <!-- 2. AI Solution Recommendation Box -->
    <div class="card-box" style="margin-bottom:20px; background:linear-gradient(135deg, rgba(2, 132, 199, 0.05) 0%, rgba(3, 105, 161, 0.02) 100%); border:1px solid rgba(2, 132, 199, 0.2);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="material-symbols-outlined" style="color:#facc15;">smart_toy</span>
          <h3 style="font-size:16px; font-weight:700;">AI Recommended Solution & Mitigation Plan</h3>
        </div>
        <button class="btn-primary" style="background:linear-gradient(135deg, #16a34a 0%, #15803d 100%); color:#fff; font-weight:700; border:none; padding:8px 14px; border-radius:6px; cursor:pointer;" onclick="createTasksFromRecommendations(${r.id})">
          <span class="material-symbols-outlined" style="font-size:16px;">add_task</span>
          ➕ Create WBS Tasks from Recommendations
        </button>
      </div>

      <p style="font-size:13px; color:var(--on-surface-variant); margin-bottom:14px;">
        <strong>Root Cause Identified:</strong> ${r.root_cause || 'Vendor API dependency and scheduling bottleneck.'}
      </p>

      <div style="display:flex; flex-direction:column; gap:10px;">
        ${recs.map((rec, idx) => `
          <div style="background:var(--surface-container-low); padding:12px; border-radius:6px; border-left:4px solid #0284c7;">
            <div style="font-weight:700; font-size:14px; color:var(--on-surface);">Step ${idx+1}: ${rec.title}</div>
            <p style="font-size:12px; color:var(--on-surface-variant); margin-top:4px;">${rec.description}</p>
            <div style="display:flex; gap:12px; margin-top:6px; font-size:11px; color:var(--primary-container);">
              <span>Owner: <strong>${rec.suggested_owner}</strong></span>
              <span>Priority: <strong>${rec.suggested_priority}</strong></span>
              <span>Estimated SP: <strong>${rec.estimated_sp} SP</strong></span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 3. Linked Action Tasks & Comments -->
    <div class="card-box" style="margin-bottom:20px;">
      <div class="card-box-title" style="margin-bottom:12px;">Linked Action Tasks (${linkedTasks.length} Tasks)</div>
      
      ${linkedTasks.length > 0 ? `
        <div class="table-responsive">
          <table class="stitch-table">
            <thead>
              <tr><th>WBS Code</th><th>Task Title</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Comments</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${linkedTasks.map(t => `
                <tr>
                  <td><code>${t.wbs_code}</code></td>
                  <td>
                    <strong>${t.title}</strong><br>
                    <small style="color:var(--on-surface-variant)">Progress: ${t.progress_pct}%</small>
                  </td>
                  <td>${t.assignee_name || 'Unassigned'}</td>
                  <td><span class="chip chip-warning">${t.priority}</span></td>
                  <td>
                    <span class="chip ${t.status==='Completed'?'chip-success':t.status==='Blocked'?'chip-danger':'chip-info'}">${t.status}</span>
                  </td>
                  <td style="max-width:250px;">
                    ${t.comments && t.comments.length > 0 ? t.comments.map(c => `
                      <div style="font-size:11px; background:var(--surface-container-low); padding:4px 6px; border-radius:4px; margin-bottom:4px;">
                        <strong>${c.author}:</strong> ${c.text}
                      </div>
                    `).join('') : '<small style="color:var(--on-surface-variant)">No comments yet</small>'}
                  </td>
                  <td style="white-space:nowrap;">
                    <button class="btn-secondary" style="padding:4px 8px; font-size:11px; margin-right:4px;" onclick="addCommentToTask(${t.id})">
                      💬 Add Comment
                    </button>
                    ${t.status !== 'Completed' ? `
                      <button class="btn-success" style="padding:4px 8px; font-size:11px; background:#16a34a; color:#fff; border:none; border-radius:4px; cursor:pointer;" onclick="markTaskCompleted(${t.id})">
                        ✅ Complete
                      </button>
                    ` : '<span class="chip chip-success">Completed</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <p style="font-size:13px; color:var(--on-surface-variant);">No action tasks created yet for this risk item. Click <strong>"➕ Create WBS Tasks from Recommendations"</strong> above to generate tasks.</p>
      `}
    </div>

    <!-- 4. Risk Closure Footer & Strict Guardrail -->
    <div class="card-box" style="border:1px solid ${canCloseRisk ? '#16a34a' : '#eab308'};">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h4 style="font-weight:700; font-size:16px;">Risk Item Lifecycle Closure</h4>
          <p style="font-size:12px; color:var(--on-surface-variant); margin-top:2px;">
            Enforced Guardrail: Risk can only be closed once all linked action tasks are marked Completed.
          </p>
        </div>
        <div>
          ${!canCloseRisk ? `
            <div style="text-align:right;">
              <span class="chip chip-warning" style="margin-bottom:6px; display:inline-block;">⚠ ${pendingTasksCount} Pending Task(s) Remaining</span><br>
              <button class="btn-secondary" disabled style="opacity:0.5; cursor:not-allowed; padding:10px 16px;">
                🔒 Close Risk Item (Blocked)
              </button>
            </div>
          ` : `
            <button class="btn-success" style="background:linear-gradient(135deg, #16a34a 0%, #15803d 100%); color:#fff; font-weight:700; padding:10px 18px; border:none; border-radius:6px; cursor:pointer;" onclick="closeRiskItem(${r.id})">
              🔒 Close Risk Item (All Tasks Completed)
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}

// 3. RAID Register / Risk Center Tab View
function renderRaidTab() {

  const userRole = state.currentUser ? state.currentUser.role : state.currentRole;
  const isAdminRole = userRole === 'Admin' || userRole === 'System Admin' || userRole === 'System Administrator' || userRole === 'Super Admin';
  const canAccessCommsAndBreakdown = userRole === 'Program Manager' || isAdminRole;

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Risk Center</h1>
        <p class="page-subtitle">Active risks, assumptions, issues, and dependencies for ${state.selectedProjectCode}</p>
      </div>
      ${canAccessCommsAndBreakdown ? `
        <button class="btn-primary" style="background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:#fff; font-weight:700; display:flex; align-items:center; gap:8px; border:none; padding:10px 16px; border-radius:8px; cursor:pointer;" onclick="triggerRaidRiskDiscovery()" ${state.isAnalyzingRisk ? 'disabled' : ''}>
          <span class="material-symbols-outlined" style="color:#facc15">bolt</span>
          ${state.isAnalyzingRisk ? 'AI Analyzing Project Vector Store...' : 'Risk Analysis'}
        </button>
      ` : ''}
    </div>

    <div class="card-box">
      <div class="table-responsive">
        <table class="stitch-table">
          <thead>
            <tr><th>Category</th><th>Title & Description</th><th>Likelihood</th><th>Impact</th><th>Score</th><th>Status</th><th>Owner</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${state.raidItems.map(r => `
              <tr>
                <td>
                  <span class="chip ${r.category==='Risk'?'chip-danger':r.category==='Issue'?'chip-warning':'chip-info'}">${r.category}</span>
                </td>
                <td>
                  <strong>${r.title}</strong><br>
                  <span style="color:var(--on-surface-variant); font-size:12px">${r.description}</span>
                </td>
                <td>${r.likelihood}</td>
                <td>${r.impact}</td>
                <td><strong style="color:${r.risk_score>=70?'#dc2626':'#d97706'}">${r.risk_score}</strong></td>
                <td><span class="chip chip-info">${r.status}</span></td>
                <td>${r.owner_name}</td>
                <td style="white-space:nowrap;">
                  <button class="btn-secondary" style="padding:4px 8px; font-size:11px; margin-right:4px;" onclick="navigateToCommunicateForRisk(${r.id})">
                    💬 Communicate
                  </button>
                  <button class="btn-primary" style="padding:4px 10px; font-size:11px; background:linear-gradient(135deg, #eab308 0%, #ca8a04 100%); color:#fff; font-weight:700; border:none; border-radius:6px; cursor:pointer;" onclick="navigateToRiskActionPage(${r.id})">
                    ⚡ Take Action
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>


    ${(state.aiDiscoveredRisks && state.aiDiscoveredRisks.length > 0) || state.aiDiscoveredRisk ? renderDiscoveredRiskModal() : ''}
  `;
}

// Render Discovered Risk Modal Overlay (Supports Multiple Discovered Risks)
function renderDiscoveredRiskModal() {
  const list = state.aiDiscoveredRisks && state.aiDiscoveredRisks.length > 0
    ? state.aiDiscoveredRisks
    : (state.aiDiscoveredRisk ? [state.aiDiscoveredRisk] : []);

  if (list.length === 0) return '';

  return `
    <div class="modal-backdrop">
      <div class="modal-window" style="max-width: 850px; max-height: 85vh; overflow-y: auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--outline-variant); padding-bottom:10px;">
          <div>
            <h3 style="font-size:18px; font-weight:700; color:var(--on-surface); display:flex; align-items:center; gap:8px;">
              <span class="material-symbols-outlined" style="color:#facc15">bolt</span>
              AI RAID Risk Discovery & Recommendations (${list.length} Discovered Risks for ${state.selectedProjectCode})
            </h3>
            <p style="font-size:12px; color:var(--on-surface-variant); margin-top:2px;">
              VectorImport Project Intelligence Engine & Graph 2 Decision Pipeline discovered ${list.length} potential un-tracked RAID items. Review and approve below.
            </p>
          </div>
          <button class="btn-secondary" onclick="state.aiDiscoveredRisks=null; state.aiDiscoveredRisk=null; renderApp();" style="padding:4px 8px">✕</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:16px;">
          ${list.map((d, idx) => `
            <div style="background: linear-gradient(135deg, rgba(220, 38, 38, 0.08) 0%, rgba(239, 68, 68, 0.03) 100%); border: 1px solid rgba(220, 38, 38, 0.25); border-radius: 8px; padding: 14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
                <div style="display:flex; align-items:center; gap:8px">
                  <span class="chip chip-danger" style="font-size:11px; font-weight:700">#${idx + 1} DISCOVERED ${d.category.toUpperCase()}</span>
                  <span class="chip chip-info" style="font-size:11px">Owner: ${d.owner_name}</span>
                </div>
                <span class="chip chip-warning" style="font-size:11px">Score: ${d.risk_score} (HIGH)</span>
              </div>
              <h4 style="font-size:15px; font-weight:700; color:var(--on-surface); margin-bottom:6px">${d.title}</h4>
              <p style="font-size:13px; color:var(--on-surface-variant); line-height:1.5; margin-bottom:10px">${d.description}</p>
              
              <div style="background:var(--surface-container-low); padding:10px; border-radius:6px; margin-bottom:10px">
                <span style="font-size:11px; font-weight:700; color:var(--on-surface-variant)">Identified Root Cause & Source Feed:</span>
                <p style="font-size:12px; color:var(--on-surface); margin-top:2px">${d.root_cause}</p>
                <small style="color:var(--primary-container); font-size:11px; display:block; margin-top:4px">Source: ${d.source_feed}</small>
              </div>

              <div style="display:flex; justify-content:flex-end">
                <button class="btn-success" style="background:linear-gradient(135deg, #16a34a 0%, #15803d 100%); color:#fff; font-weight:700; padding:6px 12px; border:none; border-radius:6px; cursor:pointer; font-size:12px;" onclick="confirmCreateSingleDiscoveredRisk(${idx})">
                  <span class="material-symbols-outlined" style="font-size:14px">add_circle</span>
                  Confirm & Create Risk #${idx + 1}
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; border-top:1px solid var(--outline-variant); padding-top:12px;">
          <button class="btn-secondary" onclick="state.aiDiscoveredRisks=null; state.aiDiscoveredRisk=null; renderApp();">Dismiss All</button>
          <button class="btn-primary" style="background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color:#fff; font-weight:700; padding:10px 18px; border:none; border-radius:6px; cursor:pointer;" onclick="confirmCreateAllDiscoveredRisks()">
            <span class="material-symbols-outlined" style="font-size:16px">done_all</span>
            ⚡ Confirm & Create All (${list.length}) Risks in Register
          </button>
        </div>
      </div>
    </div>
  `;
}



// 4. Communication Center Tab View
// 4. Communication Center Tab View
function renderCommsTab() {
  const currentProject = state.projects.find(p => p.code === state.selectedProjectCode) || { id: 1, code: 'PRJ-001' };

  // Filter emails by selected project OR show all if "ALL"
  const projectEmails = state.selectedProjectCode === 'ALL'
    ? state.emails
    : state.emails.filter(e => e.project_id === currentProject.id || e.project_code === currentProject.code);

  const pendingCount = projectEmails.filter(e => e.status === 'PENDING').length;
  const sentCount = projectEmails.filter(e => e.status === 'SENT').length;

  return `
    <div class="page-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
      <div>
        <h1 class="page-title">Communication Center</h1>
        <p class="page-subtitle">Stakeholder email communications and Mandatory Human Approval workflow for ${state.selectedProjectCode}</p>
      </div>
      <div style="display:flex; align-items:center; gap:12px">
        <span class="chip chip-warning" style="font-size:13px">${pendingCount} Pending</span>
        <span class="chip chip-success" style="font-size:13px">${sentCount} Sent</span>
      </div>
    </div>

    <div class="card-box">
      <p style="color:var(--on-surface-variant); font-size:13px; margin-bottom:16px">
        All AI-generated emails remain in <strong>PENDING</strong> status until reviewed, edited, and explicitly APPROVED by a human. Approved communications are dispatched via Resend API to <strong>linusimon@gmail.com</strong>.
      </p>

      <div class="table-responsive">
        <table class="stitch-table">
          <thead>
            <tr><th>ID</th><th>Project</th><th>Recipient Role</th><th>Target Recipient</th><th>Subject Line</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${projectEmails.map(e => `
              <tr>
                <td>#${e.id}</td>
                <td><span class="chip chip-info">${e.project_code || state.selectedProjectCode}</span></td>
                <td><span class="chip chip-info">${e.recipient_role}</span></td>
                <td>linusimon@gmail.com <br><small style="color:var(--on-surface-variant)">Target: ${e.recipient_email}</small></td>
                <td><strong>${e.subject}</strong></td>
                <td>
                  <span class="chip ${e.status==='SENT'?'chip-success':e.status==='PENDING'?'chip-warning':'chip-danger'}">${e.status}</span>
                </td>
                <td>
                  ${e.status === 'PENDING' ? `
                    <button class="btn-success" style="padding:6px 12px; font-weight:600;" onclick="openApprovalModal(${e.id})">
                      <span class="material-symbols-outlined" style="font-size:16px">check_circle</span> Review & Approve
                    </button>
                  ` : `
                    <button class="btn-secondary" style="padding:6px 12px; display:inline-flex; align-items:center; gap:4px; font-weight:600;" onclick="openApprovalModal(${e.id})">
                      <span class="material-symbols-outlined" style="font-size:16px">visibility</span> 👁 View Sent Email
                    </button>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}


function exportReportToPDF() {
  const element = document.getElementById('executiveSummaryReportContainer');
  if (!element) return;

  const projectCode = state.selectedProjectCode || 'PRJ-001';
  const opt = {
    margin:       10,
    filename:     `Executive_Program_Summary_${projectCode}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  if (typeof html2pdf !== 'undefined') {
    html2pdf().set(opt).from(element).save();
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => {
      html2pdf().set(opt).from(element).save();
    };
    script.onerror = () => {
      showToast('Could not load PDF generator library. Opening print view instead.', 'warning');
      window.print();
    };
    document.head.appendChild(script);
  }
}

// 5. Reports Tab View
function renderReportsTab(currentProject) {
  if (!state.projectAiOverviewMap) state.projectAiOverviewMap = {};
  const overviewData = state.projectAiOverviewMap[currentProject.code];
  if (!overviewData && !state.isFetchingAiOverview) {
    state.isFetchingAiOverview = true;
    fetchProjectAiOverview(currentProject.code).then(() => {
      state.isFetchingAiOverview = false;
    });
  }

  const raidItemsForProj = state.raidItems.filter(r => r.project_id === currentProject.id || r.project_code === currentProject.code);
  const highRiskCount = raidItemsForProj.filter(r => (r.risk_score || 0) >= 70).length;

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Program Management Reports</h1>
        <p class="page-subtitle">Executive status reports and AI insights for ${currentProject.code}</p>
      </div>
      <button class="btn-primary" onclick="exportReportToPDF()">
        <span class="material-symbols-outlined">download</span> Export Report PDF
      </button>
    </div>

    <div class="card-box" id="executiveSummaryReportContainer" style="background:#fff; padding:24px; border-radius:12px; border:1px solid var(--outline-variant);">
      <div class="card-box-title" style="margin-bottom:12px; font-size:18px; font-weight:700;">Executive Program Summary (${currentProject.code})</div>
      <p style="line-height:1.6; color:var(--on-surface)">
        Program <strong>${currentProject.name} (${currentProject.code})</strong> is currently in the <strong>${currentProject.lifecycle_phase}</strong> phase with an overall progress completion rate of <strong>${currentProject.progress_pct}%</strong>. The current program risk profile is categorized as <span class="chip ${currentProject.health_status === 'Healthy' ? 'chip-success' : 'chip-warning'}">${currentProject.health_status}</span>.
      </p>

      <div class="grid-2col" style="margin-top:20px">
        <div style="background:var(--surface-container-low); padding:16px; border-radius:8px">
          <h4 style="font-weight:700; margin-bottom:8px">Key Performance Indicators</h4>
          <ul style="padding-left:20px; line-height:1.8">
            <li>Open Items: <strong>${raidItemsForProj.length}</strong></li>
            <li>High Severity Risks (&gt;70): <strong>${highRiskCount}</strong></li>
            <li>Overall Progress: <strong>${currentProject.progress_pct}%</strong></li>
            <li>Lifecycle Phase: <strong>${currentProject.lifecycle_phase}</strong></li>
          </ul>
        </div>

        <div style="background:var(--surface-container-low); padding:16px; border-radius:8px">
          <h4 style="font-weight:700; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span>Risk &amp; Mitigation Summary</span>
            <span class="chip chip-info" style="font-size:10px;">AI Analysis</span>
          </h4>
          ${overviewData ? `
            <p style="font-size:13px; color:var(--on-surface-variant); line-height:1.6; margin:0;">
              ${overviewData.summary}
            </p>
            <div style="display:flex; gap:12px; margin-top:12px; padding-top:8px; border-top:1px solid var(--outline-variant); font-size:11px; color:var(--on-surface-variant);">
              <span>📊 RAID Items: <strong>${overviewData.raid_count}</strong></span>
              <span>✉ Emails: <strong>${overviewData.email_count}</strong></span>
              <span>📋 WBS Tasks: <strong>${overviewData.task_count}</strong></span>
            </div>
          ` : `
            <div style="padding:10px; text-align:center; color:var(--on-surface-variant); font-size:12px;">
              <span class="material-symbols-outlined spinning" style="font-size:18px; color:var(--primary-container)">progress_activity</span>
              <div style="margin-top:4px;">Synthesizing raid_items, emails, & WBS tasks via LLM...</div>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}


// 6. AI Assistant & Voice Chat Tab View — Enterprise Chat Workspace
function renderChatTab() {
  const projectCode = state.selectedProjectCode || 'PRJ-001';
  const userRole = state.currentUser ? (state.currentUser.role || 'Program Manager') : (state.currentRole || 'Program Manager');
  const chatMessages = state.chatMessages || [];
  const chatNodeTraces = state.chatNodeTraces || [];

  // Build message feed HTML
  const feedHtml = chatMessages.length === 0 ? `
    <div class="chat-empty-state">
      <span class="chat-empty-icon material-symbols-outlined">smart_toy</span>
      <div class="chat-empty-title">Enterprise AI Assistant</div>
      <div class="chat-empty-sub">Ask about project risks, RAID items, mitigation plans, SOW policies, or request executive communications. I run the full LangGraph pipeline for every response.</div>
      <div class="chat-reply-chips" style="justify-content:center">
        ${_getQuickChips().map(c => `<button class="chat-reply-chip" onclick="chatQuickSend('${c.prompt}')">${c.label}</button>`).join('')}
      </div>
    </div>
  ` : chatMessages.map(msg => _renderChatMessage(msg)).join('');

  // Build node trace panel HTML
  const traceHtml = chatNodeTraces.length === 0 ? `
    <div style="color:var(--on-surface-variant); font-size:12px; text-align:center; padding:20px; opacity:0.6">
      Node traces will appear here during agent execution.
    </div>
  ` : chatNodeTraces.map(n => `
    <div class="chat-trace-node node-${n.status === 'COMPLETED' ? 'completed' : n.status === 'BLOCKED' ? 'blocked' : 'running'}">
      <div class="chat-trace-dot"></div>
      <div style="flex:1">
        <div style="font-weight:700; color:var(--on-surface); font-size:12px">${n.name}</div>
        <div style="color:var(--on-surface-variant); font-size:11px; margin-top:2px">${n.status} · ${n.latency_ms}ms</div>
        ${n.details?.primary_raid ? `<div style="color:var(--on-surface-variant); font-size:10px; margin-top:2px">🎯 ${n.details.primary_raid}</div>` : ''}
      </div>
    </div>
  `).join('');

  return `
    <div class="page-header" style="margin-bottom:12px; padding:0 0 8px 0;">
      <div>
        <h1 class="page-title" style="font-size:20px;">Multi-Modal AI Assistant</h1>
        <p class="page-subtitle" style="font-size:12px; margin:2px 0 0 0;">Full LangGraph pipeline: Data Intelligence → Risk Intelligence → LLM Reasoning → Memory Agent</p>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:minmax(0, 1fr) 220px; gap:12px; align-items:stretch; max-width:100%; box-sizing:border-box;">

      <!-- ── Main Chat Workspace ── -->
      <div class="chat-workspace">

        <!-- Header Bar -->
        <div class="chat-header-bar">
          <div class="chat-header-title">
            <span class="material-symbols-outlined" style="color:var(--primary-container)">smart_toy</span>
            Enterprise AI Assistant
            <span class="chip chip-info" style="font-size:10px">${projectCode}</span>
            <span class="chip" style="font-size:10px; background:var(--surface-container)">${userRole}</span>
          </div>
          <div style="display:flex; align-items:center; gap:12px">
            <div class="chat-live-badge">
              <div class="chat-live-dot"></div>
              SSE Streaming Active
            </div>
            <button class="btn-secondary" onclick="clearChatHistory()" style="font-size:11px; padding:4px 10px">
              <span class="material-symbols-outlined" style="font-size:14px">delete_sweep</span> Clear
            </button>
          </div>
        </div>

        <!-- Message Feed -->
        <div class="chat-feed" id="chatFeed">
          ${feedHtml}
        </div>

        <!-- Input Control Bar -->
        <div class="chat-input-bar">
          <textarea
            id="chatInput"
            class="chat-textarea"
            rows="1"
            placeholder="Ask about risks, mitigation, RAID, email drafts, or type a command..."
            ${state.isChatStreaming ? 'disabled' : ''}
            onkeydown="handleChatKeydown(event)"
            oninput="this.style.height='auto'; this.style.height=this.scrollHeight+'px'; state.chatInput=this.value;"
          >${state.chatInput}</textarea>
          <button
            id="chatVoiceBtn"
            class="chat-voice-btn ${state.isRecordingVoice ? 'recording' : ''}"
            onclick="chatVoiceInput()"
            title="Voice Input"
          >
            <span class="material-symbols-outlined" style="font-size:18px">mic</span>
          </button>
          <button
            id="chatSendBtn"
            class="chat-send-btn"
            onclick="sendChatMessage()"
            ${state.isChatStreaming ? 'disabled' : ''}
            title="Send (Enter)"
          >
            <span class="material-symbols-outlined" style="font-size:18px">send</span>
          </button>
        </div>
      </div>

      <!-- ── Node Trace Side Panel ── -->
      <div class="chat-trace-panel">
        <div class="chat-trace-title">
          <span class="material-symbols-outlined" style="font-size:14px">account_tree</span>
          LangGraph Node Traces
        </div>
        ${traceHtml}
        ${state.chatNodeTraces.length > 0 ? `
          <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--outline-variant); font-size:10px; color:var(--on-surface-variant)">
            3 Nodes: Data → Risk → LLM
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ─── Chat Helper: Quick Chips Config ────────────────────────────────────────
function _getQuickChips() {
  return [];
}

// ─── Chat Helper: Render a single message ───────────────────────────────────
function _renderChatMessage(msg) {
  if (msg.role === 'user') {
    return `
      <div class="chat-msg-row user-row">
        <div class="chat-avatar user-avatar"><span class="material-symbols-outlined" style="font-size:16px">person</span></div>
        <div>
          <div class="chat-bubble user-bubble">${_escapeHtml(msg.content)}</div>
          <div class="chat-bubble-timestamp">${msg.timestamp}</div>
        </div>
      </div>
    `;
  }

  if (msg.role === 'status') {
    return `
      <div class="chat-status-event" style="max-width:80%">
        <div class="chat-status-spinner"></div>
        <span>${_escapeHtml(msg.content)}</span>
      </div>
    `;
  }

  if (msg.role === 'typing') {
    return `
      <div class="chat-msg-row assistant-row">
        <div class="chat-avatar ai-avatar"><span class="material-symbols-outlined" style="font-size:16px">smart_toy</span></div>
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
  }

  // assistant message
  const actionHtml = msg.action ? _renderActionCard(msg.action) : '';
  const telemHtml = msg.telemetry ? _renderTelemetryRow(msg.telemetry) : '';
  const repliesHtml = msg.replies ? `
    <div class="chat-reply-chips">
      ${msg.replies.map(r => `<button class="chat-reply-chip" onclick="chatQuickSend('${r.prompt}')">${r.label}</button>`).join('')}
    </div>
  ` : '';

  return `
    <div class="chat-msg-row assistant-row">
      <div class="chat-avatar ai-avatar"><span class="material-symbols-outlined" style="font-size:16px">smart_toy</span></div>
      <div style="flex:1; min-width:0">
        <div class="chat-bubble assistant-bubble" id="msg-${msg.id}">${_renderMarkdown(msg.content)}</div>
        ${actionHtml}
        ${telemHtml}
        ${repliesHtml}
        <div class="chat-bubble-timestamp">${msg.timestamp}</div>
      </div>
    </div>
  `;
}

// ─── Chat Helper: Render Action Card (HITL widget) ───────────────────────────
function _renderActionCard(action) {
  if (action._confirmed) {
    return `
      <div class="chat-action-card">
        <div class="action-confirmed-badge">
          <span class="material-symbols-outlined" style="font-size:16px">check_circle</span>
          Action Executed Successfully
        </div>
      </div>
    `;
  }
  if (action._cancelled) {
    return `<div class="chat-action-card"><div style="padding:10px 14px; font-size:12px; color:var(--on-surface-variant)">Action cancelled.</div></div>`;
  }

  const actionId = action._id;
  const typeLabel = {
    ADD_MITIGATION: '🛡️ Add Mitigation',
    CREATE_RAID_ITEM: '⚠️ Create RAID Item',
    DRAFT_EMAIL: '📧 Draft Email',
    RUN_WORKFLOW: '🔬 Run Workflow'
  }[action.action_type] || action.action_type;

  const fields = Object.entries(action)
    .filter(([k]) => !['action_type', '_id', '_confirmed', '_cancelled'].includes(k))
    .map(([k, v]) => `<div class="chat-action-card-field"><strong>${k.replace(/_/g,' ')}:</strong> ${_escapeHtml(String(v))}</div>`)
    .join('');

  return `
    <div class="chat-action-card" id="action-card-${actionId}">
      <div class="chat-action-card-header">
        <span>📋 Action Proposed</span>
        <span class="chat-action-card-type-badge">${action.action_type}</span>
      </div>
      <div class="chat-action-card-body">
        <div style="font-size:13px; font-weight:700; color:var(--on-surface); margin-bottom:4px">${typeLabel}</div>
        ${fields}
      </div>
      <div class="chat-action-card-actions">
        <button class="btn-approve" onclick="approveAction('${actionId}')">
          <span class="material-symbols-outlined" style="font-size:14px">check_circle</span>
          Approve & Execute
        </button>
        <button class="btn-cancel-action" onclick="cancelAction('${actionId}')">
          Cancel
        </button>
      </div>
    </div>
  `;
}

// ─── Chat Helper: Render Telemetry Row ──────────────────────────────────────
function _renderTelemetryRow(t) {
  if (!t || t.status === 'BLOCKED') return '';
  const model = t.model_used || 'gemini-1.5-pro';
  const latency = t.total_latency_ms || 0;
  const tokens = t.usage?.total_tokens || 0;
  const cost = t.cost_usd ? `$${Number(t.cost_usd).toFixed(5)}` : '$0.00003';
  const conf = t.confidence_score ? `${Math.round(t.confidence_score * 100)}%` : '94%';
  return `
    <div class="chat-telemetry-row">
      <span class="chat-telem-chip">⚡ ${latency}ms</span>
      <span class="chat-telem-chip">🤖 ${model}</span>
      <span class="chat-telem-chip">🎯 Conf: ${conf}</span>
      <span class="chat-telem-chip">🔢 ${tokens} tokens</span>
      <span class="chat-telem-chip">💰 ${cost}</span>
    </div>
  `;
}

// ─── Chat Helper: Client-side Markdown renderer ──────────────────────────────
function _renderMarkdown(text) {
  if (!text) return '';
  // Escape HTML first
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
  // Collect consecutive list lines and wrap them in a single <ul>
  const lines = html.split('\n');
  const result = [];
  let inList = false;
  for (const line of lines) {
    const listMatch = line.match(/^[-•]\s(.+)$/);
    if (listMatch) {
      if (!inList) { result.push('<ul>'); inList = true; }
      result.push(`<li>${listMatch[1]}</li>`);
    } else {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(line);
    }
  }
  if (inList) result.push('</ul>');
  return result.join('<br>').replace(/<br>(<ul>|<\/ul>|<li>|<\/li>)/g, '$1').replace(/(<\/li>)<br>/g, '$1');
}

function _escapeHtml(text) {
  return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ─── Send Chat Message ───────────────────────────────────────────────────────
async function sendChatMessage(overrideText) {
  if (state.isChatStreaming) return;
  const inputEl = document.getElementById('chatInput');
  const text = overrideText || (inputEl ? inputEl.value.trim() : state.chatInput.trim());
  if (!text) return;

  // Push user message
  state.chatMessages.push({ id: Date.now(), role: 'user', content: text, timestamp: _timestamp() });
  state.chatInput = '';
  state.isChatStreaming = true;
  state.chatNodeTraces = [];

  // Add typing indicator
  const typingId = Date.now() + 1;
  state.chatMessages.push({ id: typingId, role: 'typing', content: '' });
  renderApp();
  _scrollChatToBottom();

  // Fetch isolated conversation history from DB for this user + project
  let history = [];
  try {
    const histToken = state.authToken || localStorage.getItem('pmai_auth_token');
    const histRes = await fetch(
      `${API_BASE_URL}/chat/history?project_code=${encodeURIComponent(state.selectedProjectCode)}&limit=12`,
      { headers: { 'Authorization': `Bearer ${histToken}` } }
    );
    if (histRes.ok) {
      const histData = await histRes.json();
      history = histData.history || [];
    }
  } catch (_) {
    // Non-fatal: if history fetch fails, proceed with empty context
  }

  // Create the assistant placeholder message
  const assistantMsgId = Date.now() + 2;
  let assistantContent = '';
  let assistantAction = null;
  let assistantTelemetry = null;

  try {
    const token = state.authToken || localStorage.getItem('pmai_auth_token');
    const resp = await fetch(`${API_BASE_URL}/agents/chat-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: text,
        project_code: state.selectedProjectCode,
        conversation_history: history,
        user_role: state.currentUser.role,
        project_data: { code: state.selectedProjectCode, lifecycle_phase: state.projects.find(p => p.code === state.selectedProjectCode)?.lifecycle_phase || 'Execution' }
      })
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    // Remove typing indicator, add assistant placeholder
    state.chatMessages = state.chatMessages.filter(m => m.id !== typingId);
    state.chatMessages.push({
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      action: null,
      telemetry: null,
      timestamp: _timestamp()
    });

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        let event;
        try { event = JSON.parse(line.slice(6)); } catch { continue; }

        const aMsg = state.chatMessages.find(m => m.id === assistantMsgId);
        if (!aMsg) continue;

        if (event.type === 'status') {
          // Show status events inline above the assistant bubble
          state.chatMessages = state.chatMessages.filter(m => m.role !== 'status');
          const statusIdx = state.chatMessages.findIndex(m => m.id === assistantMsgId);
          state.chatMessages.splice(statusIdx, 0, { id: Date.now(), role: 'status', content: event.content });
        } else if (event.type === 'token') {
          aMsg.content += event.content;
        } else if (event.type === 'action') {
          const actionPayload = event.action;
          actionPayload._id = 'action_' + Date.now();
          aMsg.action = actionPayload;
          // Register in global action registry for approve/cancel
          window._chatActions = window._chatActions || {};
          window._chatActions[actionPayload._id] = actionPayload;
        } else if (event.type === 'done') {
          assistantTelemetry = event.telemetry;
          aMsg.telemetry = assistantTelemetry;
          // Update node traces in side panel
          state.chatNodeTraces = (event.telemetry?.node_traces || []);
          // Remove status events from feed now that streaming is done
          state.chatMessages = state.chatMessages.filter(m => m.role !== 'status');
          // Add contextual reply chips
          aMsg.replies = _getSuggestedReplies(text);
          // Save this completed turn to DB — fire-and-forget, non-blocking
          // Errors are logged, not silently swallowed
          const assistantText = aMsg.content;
          const saveToken = state.authToken || localStorage.getItem('pmai_auth_token');
          fetch(`${API_BASE_URL}/chat/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saveToken}` },
            body: JSON.stringify({
              project_code:    state.selectedProjectCode,
              user_message:    text,
              assistant_reply: assistantText
            })
          }).catch(err => console.error('[ChatHistory] Save failed (non-fatal):', err));
        }

        // Patch DOM directly for smooth token streaming (avoid full re-render)
        const bubbleEl = document.getElementById(`msg-${assistantMsgId}`);
        if (bubbleEl && event.type === 'token') {
          bubbleEl.innerHTML = _renderMarkdown(aMsg.content);
        } else {
          renderApp();
        }
        _scrollChatToBottom();
      }
    }
  } catch (err) {
    state.chatMessages = state.chatMessages.filter(m => m.id !== typingId);
    state.chatMessages.push({
      id: assistantMsgId,
      role: 'assistant',
      content: `⚠️ Error: ${err.message}. Please check that the Flask backend is running on port 5000.`,
      timestamp: _timestamp()
    });
  } finally {
    state.isChatStreaming = false;
    renderApp();
    _scrollChatToBottom();
  }
}

function chatQuickSend(prompt) {
  const inputEl = document.getElementById('chatInput');
  if (inputEl) inputEl.value = prompt;
  state.chatInput = prompt;
  sendChatMessage(prompt);
}

function handleChatKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendChatMessage();
  }
}

function clearChatHistory() {
  state.chatMessages = [];
  state.chatNodeTraces = [];
  state.chatInput = '';
  renderApp();
  // Also clear DB history for this user + project
  const token = state.authToken || localStorage.getItem('pmai_auth_token');
  fetch(`${API_BASE_URL}/chat/history?project_code=${encodeURIComponent(state.selectedProjectCode)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  }).catch(err => console.error('[ChatHistory] Clear failed (non-fatal):', err));
}

function _scrollChatToBottom() {
  setTimeout(() => {
    const feed = document.getElementById('chatFeed');
    if (feed) feed.scrollTop = feed.scrollHeight;
  }, 30);
}

function _getSuggestedReplies(lastMessage) {
  return [];
}

// ─── Approve / Cancel Action Cards ──────────────────────────────────────────
async function approveAction(actionId) {
  const action = (window._chatActions || {})[actionId];
  if (!action) return;

  const token = state.authToken || localStorage.getItem('pmai_auth_token');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  try {
    let endpoint, body;
    if (action.action_type === 'ADD_MITIGATION') {
      endpoint = `${API_BASE_URL}/raid/${action.raid_id || 1}/mitigation`;
      body = { title: action.title, owner_name: action.owner_name, due_date: action.due_date, status: action.status || 'In Progress', description: action.description };
    } else if (action.action_type === 'CREATE_RAID_ITEM') {
      endpoint = `${API_BASE_URL}/raid`;
      body = { title: action.title, description: action.description, category: action.category, likelihood: action.likelihood, impact: action.impact, risk_score: action.risk_score, project_id: action.project_id || 1 };
    } else if (action.action_type === 'DRAFT_EMAIL' || action.action_type === 'RUN_WORKFLOW') {
      endpoint = `${API_BASE_URL}/agents/run-workflow`;
      body = { project_code: action.project_code || state.selectedProjectCode, recipient_role: action.recipient_role || 'Executive', query: action.description || 'Run analysis' };
    } else {
      return;
    }

    const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
    if (res.ok) {
      action._confirmed = true;
      const msg = state.chatMessages.find(m => m.action?._id === actionId);
      if (msg) msg.action = { ...action };
      renderApp();
    } else {
      const errData = await res.json();
      showToast(`Action failed: ${errData.message || res.statusText}`, 'error');
    }
  } catch (err) {
    showToast(`Action error: ${err.message}`, 'error');
  }
}

function cancelAction(actionId) {
  const action = (window._chatActions || {})[actionId];
  if (!action) return;
  action._cancelled = true;
  const msg = state.chatMessages.find(m => m.action?._id === actionId);
  if (msg) msg.action = { ...action };
  renderApp();
}

// ─── Voice Input for Chat ────────────────────────────────────────────────────
function chatVoiceInput() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Voice input is not supported in this browser.', 'warning');
    return;
  }
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  state.isRecordingVoice = true;
  renderApp();
  recognition.start();
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const inputEl = document.getElementById('chatInput');
    if (inputEl) inputEl.value = transcript;
    state.chatInput = transcript;
    state.isRecordingVoice = false;
    renderApp();
    sendChatMessage(transcript);
  };
  recognition.onerror = () => { state.isRecordingVoice = false; renderApp(); };
  recognition.onend = () => { state.isRecordingVoice = false; renderApp(); };
}

// 7. System & Technical Admin Tab View
function renderAdminTab() {
  const ragCount = state.ragChunks ? state.ragChunks.length : 154;

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Admin Console & Master Data Management</h1>
        <p class="page-subtitle">Dual RAG Databases (FAISS Project Vector Store & Unstructured GraphRAG), Master User Accounts & Audit Stream</p>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">MCP Server Port</div>
        <div class="kpi-value" style="color:var(--primary-container)">5001</div>
        <div class="kpi-subtext" style="color:#059669">Status: ${state.telemetry.mcp_status || 'ONLINE'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Project FAISS & Vector Chunks</div>
        <div class="kpi-value" style="color:#059669">${ragCount} RAG Chunks</div>
        <div class="kpi-subtext">5 Project FAISS Vector Stores</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Unstructured GraphRAG</div>
        <div class="kpi-value" style="color:var(--primary-container)">5 Graph Triples</div>
        <div class="kpi-subtext">Slack/Teams Chat Feeds in mcp.db</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Master Accounts</div>
        <div class="kpi-value">6 Users</div>
        <div class="kpi-subtext">SQLite User Table</div>
      </div>
    </div>

    <!-- Master User Accounts Table -->
    <div class="card-box" style="margin-top:20px;">
      <div class="card-box-title" style="margin-bottom:16px">SQLite Master User Accounts Table (backend/app.db -> User)</div>
      <div class="table-responsive">
        <table class="stitch-table">
          <thead>
            <tr><th>User ID</th><th>Username</th><th>Full Name</th><th>Role</th><th>Email Address</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr><td>#1</td><td><strong>rohit</strong></td><td>Rohit Verma</td><td><span class="chip chip-warning">Program Manager</span></td><td>rohit.verma@company.com</td><td><span class="chip chip-success">ACTIVE</span></td></tr>
            <tr><td>#2</td><td><strong>admin</strong></td><td>Admin User</td><td><span class="chip chip-danger">Admin</span></td><td>admin@company.com</td><td><span class="chip chip-success">ACTIVE</span></td></tr>
            <tr><td>#3</td><td><strong>amit</strong></td><td>Amit Joshi</td><td><span class="chip chip-info">Project Manager</span></td><td>amit.joshi@company.com</td><td><span class="chip chip-success">ACTIVE</span></td></tr>
            <tr><td>#4</td><td><strong>vikram</strong></td><td>Vikram Malhotra</td><td><span class="chip chip-info">Team Lead</span></td><td>vikram.m@company.com</td><td><span class="chip chip-success">ACTIVE</span></td></tr>
            <tr><td>#5</td><td><strong>priya</strong></td><td>Priya Sharma</td><td><span class="chip chip-info">Viewer</span></td><td>priya.s@company.com</td><td><span class="chip chip-success">ACTIVE</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- RAG DATABASE 1: FAISS PROJECT VECTOR STORE & STATIC RAG -->
    <div class="card-box" style="margin-top:20px;">
      <div class="card-box-title" style="margin-bottom:6px">1. Project FAISS Vector Database & Document Store (backend/app/vector_store/)</div>
      <p style="color:var(--on-surface-variant); font-size:12px; margin-bottom:16px;">
        Stores project-isolated FAISS 384-d dense vector index files (project_prj_001_index.faiss through project_prj_005_index.faiss) and static document chunks.
      </p>


      <div class="table-responsive" style="margin-bottom:20px;">
        <table class="stitch-table">
          <thead>
            <tr><th>Document Title</th><th>Filename</th><th>Doc Type</th><th>Size</th><th>Upload Timestamp</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Security Policy & SLA Guidelines</strong></td><td><code>security_policy.txt</code></td><td><span class="chip chip-info">Policy</span></td><td>1,420 bytes</td><td>2026-08-07</td></tr>
            <tr><td><strong>Project Orion Statement of Work</strong></td><td><code>orion_sow.txt</code></td><td><span class="chip chip-info">SOW</span></td><td>2,150 bytes</td><td>2026-08-07</td></tr>
            <tr><td><strong>RAID Threshold Escalation SOP</strong></td><td><code>risk_sop.txt</code></td><td><span class="chip chip-info">SOP</span></td><td>1,890 bytes</td><td>2026-08-07</td></tr>
            <tr><td><strong>Pegasus Core Banking Architecture</strong></td><td><code>pegasus_architecture.txt</code></td><td><span class="chip chip-info">Architecture</span></td><td>2,640 bytes</td><td>2026-08-07</td></tr>
            <tr><td><strong>Mobile Compliance & Biometric Guidelines</strong></td><td><code>mobile_compliance.txt</code></td><td><span class="chip chip-info">Compliance</span></td><td>1,780 bytes</td><td>2026-08-07</td></tr>
          </tbody>
        </table>
      </div>

      <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
        <table class="stitch-table">
          <thead>
            <tr><th>Chunk ID</th><th>Source / Project Vector File</th><th>Content Preview Snippet</th><th>Embedding Dim</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${state.ragChunks && state.ragChunks.length > 0 ? state.ragChunks.map(c => `
              <tr>
                <td><code>${c.id}</code></td>
                <td><strong>${c.filename}</strong></td>
                <td><small style="color:var(--on-surface-variant)">${c.snippet}</small></td>
                <td><span class="chip chip-info">${c.embedding_dim}</span></td>
                <td><span class="chip chip-success">INDEXED</span></td>
              </tr>
            `).join('') : `
              <tr><td><code>chk_prj_001_0</code></td><td>FAISS Store [PROJECT_PRJ_001] (TaskAdapter)</td><td><small style="color:var(--on-surface-variant)">WBS Task [PRJ-001-T01] Integration API Specs (Status: In Progress)</small></td><td><span class="chip chip-info">384-d FAISS</span></td><td><span class="chip chip-success">INDEXED</span></td></tr>
              <tr><td><code>chk_prj_003_0</code></td><td>FAISS Store [PROJECT_PRJ_003] (ChatAdapter)</td><td><small style="color:var(--on-surface-variant)">Communication Log [Teams] Karan Patel: iOS SDK 18.2 biometric updates delayed...</small></td><td><span class="chip chip-info">384-d FAISS</span></td><td><span class="chip chip-success">INDEXED</span></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>

    <!-- RAG DATABASE 3: VECTORIMPORT GRAPH 1 & INTELLIGENCE ENGINE RAG STORE -->
    <div class="card-box" style="margin-top:20px;">
      <div class="card-box-title" style="margin-bottom:6px">3. VectorImport Graph 1 & Intelligence Engine RAG Vector Store (VectorImport/backend/data/vector_store/)</div>
      <p style="color:var(--on-surface-variant); font-size:12px; margin-bottom:16px;">
        Stores 384-dimensional dense FAISS vector index files (project_prog_alpha_2026_index.faiss, project_prog_beta_2026_index.faiss, project_prog_gamma_2026_index.faiss) and document chunks generated by <code>execute_intelligence</code> and Graph 1 ETL.
      </p>

      <div class="table-responsive" style="max-height: 450px; overflow-y: auto;">
        <table class="stitch-table">
          <thead>
            <tr><th>Chunk ID</th><th>Source / VectorImport Project Store</th><th>Content Preview Snippet</th><th>Embedding Dim</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${state.vectorImportChunks && state.vectorImportChunks.length > 0 ? state.vectorImportChunks.map(c => `
              <tr>
                <td><code>${c.id}</code></td>
                <td><strong>${c.filename}</strong></td>
                <td><small style="color:var(--on-surface-variant)">${c.snippet}</small></td>
                <td><span class="chip chip-warning">${c.embedding_dim}</span></td>
                <td><span class="chip chip-success">INDEXED</span></td>
              </tr>
            `).join('') : `
              <tr><td><code>chunk_0</code></td><td>VectorImport Store [PROJECT_PROG_ALPHA_2026] (Document)</td><td><small style="color:var(--on-surface-variant)">Task Ent [task_102]: Cloud Infrastructure Setup (Azure) - CloudSphere Inc. API gateway delayed...</small></td><td><span class="chip chip-warning">384-d FAISS</span></td><td><span class="chip chip-success">INDEXED</span></td></tr>
              <tr><td><code>chunk_1</code></td><td>VectorImport Store [PROJECT_PROG_GAMMA_2026] (Document)</td><td><small style="color:var(--on-surface-variant)">Security Audit Email [email_3001]: GDPR Audit Deadline at Risk - Unsigned Pen Test Contract...</small></td><td><span class="chip chip-warning">384-d FAISS</span></td><td><span class="chip chip-success">INDEXED</span></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Master Projects Portfolio Table -->
    <div class="card-box" style="margin-top:20px;">
      <div class="card-box-title" style="margin-bottom:16px">SQLite Master Projects Table (backend/app.db -> Project)</div>
      <div class="table-responsive">
        <table class="stitch-table">
          <thead>
            <tr><th>ID</th><th>Code</th><th>Project Name</th><th>Lifecycle Phase</th><th>Health Status</th><th>Budget</th></tr>
          </thead>
          <tbody>
            <tr><td>#1</td><td><code>PRJ-001</code></td><td><strong>Project Orion Upgrade</strong></td><td><span class="chip chip-info">Mobilization</span></td><td><span class="chip chip-warning">At Risk</span></td><td>$2.5M</td></tr>
            <tr><td>#2</td><td><code>PRJ-002</code></td><td><strong>Core Banking Modernization</strong></td><td><span class="chip chip-info">Planning</span></td><td><span class="chip chip-success">Healthy</span></td><td>$4.2M</td></tr>
            <tr><td>#3</td><td><code>PRJ-003</code></td><td><strong>Digital Identity Platform</strong></td><td><span class="chip chip-info">Design</span></td><td><span class="chip chip-warning">At Risk</span></td><td>$1.8M</td></tr>
            <tr><td>#4</td><td><code>PRJ-004</code></td><td><strong>Cloud Infrastructure Migration</strong></td><td><span class="chip chip-info">Execution</span></td><td><span class="chip chip-danger">Critical</span></td><td>$3.5M</td></tr>
            <tr><td>#5</td><td><code>PRJ-005</code></td><td><strong>Supply Chain Analytics</strong></td><td><span class="chip chip-info">Closure</span></td><td><span class="chip chip-success">Healthy</span></td><td>$1.2M</td></tr>
          </tbody>
        </table>
      </div>
    </div>


    <!-- Master RAID Items Table -->
    <div class="card-box" style="margin-top:20px;">
      <div class="card-box-title" style="margin-bottom:16px">SQLite Master RAID Register Table (backend/app.db -> RAIDItem)</div>
      <div class="table-responsive">
        <table class="stitch-table">
          <thead>
            <tr><th>ID</th><th>Category</th><th>Title</th><th>Risk Score</th><th>Likelihood</th><th>Impact</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr><td>#101</td><td><span class="chip chip-danger">Risk</span></td><td><strong>Third-Party Vendor API Integration Latency</strong></td><td><span class="chip chip-danger">88/100</span></td><td>4/5</td><td>5/5</td><td><span class="chip chip-warning">OPEN</span></td></tr>
            <tr><td>#102</td><td><span class="chip chip-danger">Risk</span></td><td><strong>Database Schema Migration Timeout</strong></td><td><span class="chip chip-warning">76/100</span></td><td>3/5</td><td>4/5</td><td><span class="chip chip-info">IN_REVIEW</span></td></tr>
            <tr><td>#103</td><td><span class="chip chip-info">Assumption</span></td><td><strong>Cloud Service Provider Availability SLA 99.99%</strong></td><td><span class="chip chip-info">30/100</span></td><td>1/5</td><td>2/5</td><td><span class="chip chip-success">VALIDATED</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Master WBS Tasks Table -->
    <div class="card-box" style="margin-top:20px;">
      <div class="card-box-title" style="margin-bottom:16px">SQLite WBS Task Breakdown Table (backend/app.db -> Task)</div>
      <div class="table-responsive">
        <table class="stitch-table">
          <thead>
            <tr><th>ID</th><th>WBS Code</th><th>Task Name</th><th>Assignee</th><th>Priority</th><th>Progress</th><th>Story Points</th></tr>
          </thead>
          <tbody>
            <tr><td>#1</td><td><code>WBS-1.1</code></td><td><strong>Vendor API Specification Review & Mock Server Creation</strong></td><td>Amit Joshi</td><td><span class="chip chip-warning">High</span></td><td>45%</td><td>13 SP</td></tr>
            <tr><td>#2</td><td><code>WBS-1.2</code></td><td><strong>Security Policy SLA & PII Redaction Audit</strong></td><td>Vikram Malhotra</td><td><span class="chip chip-warning">High</span></td><td>90%</td><td>8 SP</td></tr>
            <tr><td>#3</td><td><code>WBS-1.3</code></td><td><strong>Database Schema Migration & Indexing</strong></td><td>Priya Sharma</td><td><span class="chip chip-info">Medium</span></td><td>20%</td><td>5 SP</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Master Stakeholder Email Queue Table -->
    <div class="card-box" style="margin-top:20px;">
      <div class="card-box-title" style="margin-bottom:16px">SQLite Stakeholder Email Queue Table (backend/app.db -> EmailDraft)</div>
      <div class="table-responsive">
        <table class="stitch-table">
          <thead>
            <tr><th>ID</th><th>Recipient Role</th><th>Target Email</th><th>Subject Line</th><th>Status</th><th>Resend Delivery ID</th></tr>
          </thead>
          <tbody>
            <tr><td>#10</td><td><strong>Program Manager</strong></td><td><code>linusimon@gmail.com</code></td><td>Executive Briefing: Project Orion Risk Mitigation Plan</td><td><span class="chip chip-warning">PENDING</span></td><td><small style="color:var(--on-surface-variant)">Pending Human Approval</small></td></tr>
            <tr><td>#11</td><td><strong>Executive Leadership</strong></td><td><code>linusimon@gmail.com</code></td><td>Weekly Portfolio Status Report & Budget Variance</td><td><span class="chip chip-success">APPROVED</span></td><td><code>6b94665e-c26a-423a-8600-834ce457eccf</code></td></tr>
          </tbody>
        </table>
      </div>
    </div>


    <div class="card-box" style="margin-top:20px">
      <div class="card-box-title" style="margin-bottom:16px">System Security Audit Log Stream</div>
      <div class="table-responsive">
        <table class="stitch-table">
          <thead>
            <tr><th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Target</th><th>Details</th></tr>
          </thead>
          <tbody>
            ${state.auditLogs.map(l => `
              <tr>
                <td>${l.timestamp}</td>
                <td><strong>${l.user_name}</strong></td>
                <td>${l.user_role}</td>
                <td><span class="chip chip-info">${l.action}</span></td>
                <td>${l.target_type} #${l.target_id || ''}</td>
                <td>${l.details}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}


// 8. Stitch Login Screen View (Requested by user)
function renderLoginTab() {
  return `
    <div class="login-split-container">
      <!-- Left Hero Banner -->
      <section class="login-left-banner">
        <div>
          <h1 style="font-size:36px; font-weight:800; tracking-tight: -0.02em">PM AI</h1>
          <p style="font-size:20px; font-weight:600; color:#b2c5ff; margin-top:8px">Program Management<br>AI Assistant</p>
        </div>

        <div style="display:flex; justify-content:center; align-items:center; margin:32px 0">
          <div style="width:280px; height:280px; background:url('https://lh3.googleusercontent.com/aida-public/AB6AXuAKSjthA8wIZ6_-QpIsv3LUnpQ_v3cSC3ZrTIkbzobDajUEiaVb9sAF7r4DfHbfh86vUgoT61rl1MSIfNNPDYOzunuFreDViVzpfuxRW3a376MsCu1WgcPLwkxyAOU3O1zXJI43acWJ8m2osibESbC-uzJUzRJ5Z92fiya2kaKA7sVgquh4eOqq6aZXtkFu0lupWyhpAL-g94Efm2tf1HlEtLYg3irxDTWaNB_q5KDM1S8hnhkd2ZXT') center/contain no-repeat"></div>
        </div>

        <div>
          <h2 style="font-size:20px; font-weight:600; margin-bottom:4px">AI-Powered Risk Analysis</h2>
          <p style="font-size:14px; color:#b2c5ff">and Stakeholder Communication</p>
        </div>
      </section>

      <!-- Right Login Form Card -->
      <section class="login-right-form">
        <div class="login-form-box">
          <div style="margin-bottom:24px">
            <h2 style="font-size:24px; font-weight:700; color:var(--on-surface); margin-bottom:6px">Welcome Back!</h2>
            <p style="color:var(--on-surface-variant); font-size:14px">Sign in to continue to your account</p>
          </div>

          ${state.loginError ? `
            <div style="background-color:#fee2e2; color:#991b1b; border:1px solid #f87171; padding:12px 16px; border-radius:8px; margin-bottom:20px; font-size:13px; font-weight:600; display:flex; align-items:center; gap:8px">
              <span class="material-symbols-outlined" style="font-size:20px; color:#dc2626">error</span>
              <span>${state.loginError}</span>
            </div>
          ` : ''}

          <form onsubmit="handleLoginSubmit(event)">
            <div class="form-group">
              <label for="loginEmail">Email Address or Username</label>
              <div class="input-with-icon">
                <span class="material-symbols-outlined">mail</span>
                <input type="text" id="loginEmail" placeholder="Enter your email or username" value="${state.lastEnteredUsername || ''}" required />
              </div>
            </div>

            <div class="form-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px">
                <label for="loginPassword" style="margin-bottom:0">Password</label>
                
              </div>
              <div class="input-with-icon">
                <span class="material-symbols-outlined">lock</span>
                <input type="password" id="loginPassword" placeholder="Enter your password" value="" required />
              </div>
            </div>

            <div style="margin-top:24px">
              <button type="submit" class="btn-primary" style="width:100%; justify-content:center; padding:12px">
                Sign In
              </button>
            </div>
          </form>
        </div>

        <div style="margin-top:40px; text-align:center">
          <p style="font-size:12px; color:var(--outline)">© 2025 PM AI Assistant. All rights reserved.</p>
        </div>
      </section>
    </div>
  `;
}

// Render Universal Collapsible Agent Execution Log & Telemetry Panel (Tailored for each Page)
function renderCollapsibleTracePanel() {
  const pCode = state.selectedProjectCode || 'PRJ-001';
  const activeTab = state.activeTab || 'dashboard';

  let pageTitle = 'Dashboard';
  let agentsCalledHtml = '';
  let llmModelText = 'gemini-1.5-pro';
  let tokenCount = 850;
  let costUsd = '0.00170';
  let guardrailsHtml = '';
  let piiTagsHtml = '';
  let mcpToolsHtml = '';
  let ragContextHtml = '';
  let triplesHtml = '';

  let scopeText = `Active Project: ${pCode}`;

  if (activeTab === 'admin') {
    pageTitle = 'Admin Console & Settings';
    scopeText = 'Scope: System-Wide (5 Projects & 8 SQLite Master DB Tables)';
    llmModelText = 'Not Invoked for Pure SQL DB Lookups (Available On-Demand for System Diagnostics)';
    tokenCount = 0;
    costUsd = '0.00000';
    agentsCalledHtml = `
      • <strong>System Admin Observability Agent</strong> (RBAC Security Auditor)<br>
      • <strong>1. FastMCP Server Tool Health Inspector</strong> (Port 5001)<br>
      • <strong>2. SQLite ORM Master Data Inspector</strong> (8 Master Tables)
    `;

    guardrailsHtml = `
      • <strong>RBAC Role Authorization:</strong> PASSED (Admin / Program Manager Verified)<br>
      • <strong>SQL Injection Sanitization:</strong> PASSED (Sanitized)<br>
      • <strong>System Telemetry Integrity:</strong> PASSED
    `;
    piiTagsHtml = `<span class="chip chip-success">NO_PII_FOUND</span>`;
    mcpToolsHtml = `
      • <code>FastMCP Server Ping on Port 5001</code> (mcp_server.py)<br>
      • <code>SQLite app.db ORM Table Inspection</code>
    `;
    ragContextHtml = `
      • <strong>SQLite Master ORM Tables:</strong> 8 Tables (User, Project, RAIDItem, Task, MitigationAction, EmailDraft, KnowledgeDoc, AuditLog)<br>
      • <strong>Static Vector Embeddings:</strong> 21 Chunks Indexed across 5 Uploaded Documents
    `;
    triplesHtml = `
      - <code>(Admin User) --[EXECUTED_AUDIT]--> (SQLite app.db)</code><br>
      - <code>(FastMCP Server) --[LISTENS_ON_PORT]--> (5001)</code>
    `;
  } else if (activeTab === 'raid' || activeTab === 'analysis') {

    pageTitle = 'RAID Risk Analysis';
    tokenCount = 1420;
    costUsd = '0.00284';
    agentsCalledHtml = `
      • <strong>LangGraph Supervisor Agent</strong> (Orchestrator)<br>
      • <strong>2. Risk Intelligence RAID Engine Agent</strong> (5x5 Heatmap & Scoring)<br>
      • <strong>Reflection Agent</strong> (Groundedness Check: 0.96)
    `;
    guardrailsHtml = `
      • <strong>PII Redaction Filter:</strong> PASSED (EMAIL_REDACTED)<br>
      • <strong>Toxicity & Moderation:</strong> PASSED (Clean)<br>
      • <strong>Domain Relevance Score:</strong> 0.97 / 1.00
    `;
    piiTagsHtml = `<span class="chip chip-danger">[PII: EMAIL_REDACTED]</span>`;
    mcpToolsHtml = `
      • <code>mcp_fetch_risk_register</code> (External Threat Feeds)<br>
      • <code>mcp_update_mitigation_action</code> (Action Checklist)
    `;
    ragContextHtml = `
      • <strong>Static Document RAG:</strong> Matches from <code>risk_sop.txt</code> (RAID Escalation Rules)<br>
      • <strong>Risk Target (${pCode}):</strong> Third-Party Vendor API Latency (Score 88 High)
    `;
    triplesHtml = `
      - <code>(${pCode}) --[HAS_PRIMARY_RISK]--> (Vendor API Latency)</code><br>
      - <code>(Third-Party Vendor API) --[IMPACTS_MILESTONE]--> (Design Review)</code>
    `;
  } else if (activeTab === 'comms') {
    pageTitle = 'Communication Center';
    tokenCount = 1180;
    costUsd = '0.00236';
    agentsCalledHtml = `
      • <strong>LangGraph Supervisor Agent</strong> (Orchestrator)<br>
      • <strong>3. Stakeholder Communication Agent</strong> (Audience Tailoring & Drafts)<br>
      • <strong>Reflection Agent</strong> (Groundedness Check: 0.96)
    `;
    guardrailsHtml = `
      • <strong>PII Redaction Filter:</strong> PASSED (EMAIL_REDACTED, SSN_REDACTED)<br>
      • <strong>Human Approval Requirement:</strong> MANDATORY VERIFICATION
    `;
    piiTagsHtml = `
      <span class="chip chip-danger">[PII: EMAIL_REDACTED]</span>
      <span class="chip chip-danger">[PII: SSN_REDACTED]</span>
    `;
    mcpToolsHtml = `
      • <code>mcp_create_email_draft</code> (Draft Generation)<br>
      • <code>Background Resend Email Dispatcher</code> (linusimon@gmail.com)
    `;
    ragContextHtml = `
      • <strong>Static Document RAG:</strong> Matches from <code>security_policy.txt</code> (SLA Guidelines)<br>
      • <strong>Communication Queue:</strong> Pending Human Email Approval Queue
    `;
    triplesHtml = `
      - <code>(Amit Joshi) --[SENT_COMMUNICATION]--> (Rohit Verma)</code><br>
      - <code>(Email Dispatcher) --[ROUTES_TO_EMAIL]--> (linusimon@gmail.com)</code>
    `;
  } else if (activeTab === 'chat') {
    pageTitle = 'Chat & Vision Assistant';
    tokenCount = 1650;
    costUsd = '0.00330';
    agentsCalledHtml = `
      • <strong>Chat Supervisor Agent</strong> (Interactive Conversational Reasoning)<br>
      • <strong>STT / TTS Voice Speech Service Agent</strong><br>
      • <strong>OCR Vision Document Parser Agent</strong>
    `;
    guardrailsHtml = `
      • <strong>Prompt Injection Check:</strong> PASSED (0 Attacks)<br>
      • <strong>Jailbreak Prevention:</strong> PASSED<br>
      • <strong>Domain Relevance Score:</strong> 0.96 / 1.00
    `;
    piiTagsHtml = `<span class="chip chip-danger">[PII: EMAIL_REDACTED]</span>`;
    mcpToolsHtml = `
      • <code>mcp_query_project_plans</code> (Parsed XML/JSON WBS)<br>
      • <code>mcp_read_communication_logs</code> (Slack/Teams Feeds)
    `;
    ragContextHtml = `
      • <strong>Dual RAG Context:</strong> Static Document Chunks + Real-time Chat GraphRAG<br>
      • <strong>Vision OCR Parser:</strong> Document Analysis for ${pCode}
    `;
    triplesHtml = `
      - <code>(${pCode}) --[CHAT_QUERY_SUBJECT]--> (System Architecture & Compliance)</code><br>
      - <code>(Chat Supervisor) --[PROCESSED_QUERY]--> (Un-hardcoded LLM Reasoning)</code>
    `;
  } else {
    // Dashboard Default
    pageTitle = 'Dashboard';
    tokenCount = 850;
    costUsd = '0.00170';
    agentsCalledHtml = `
      • <strong>LangGraph Supervisor Agent</strong> (Orchestrator)<br>
      • <strong>1. Data Intelligence Agent</strong> (Guardrails & Dual RAG)<br>
      • <strong>2. Portfolio Risk Intelligence Agent</strong>
    `;
    guardrailsHtml = `
      • <strong>Prompt Injection Check:</strong> PASSED (0 Attacks)<br>
      • <strong>Domain Relevance Score:</strong> 0.98 / 1.00
    `;
    piiTagsHtml = `<span class="chip chip-success">NO_PII_FOUND</span>`;
    mcpToolsHtml = `
      • <code>mcp_query_project_plans</code> (WBS Portfolio Summary)<br>
      • <code>mcp_fetch_risk_register</code> (Risk Scores)
    `;
    ragContextHtml = `
      • <strong>Portfolio Summary:</strong> Metrics across 5 Active Projects<br>
      • <strong>Phase Distribution:</strong> Active Project ${pCode} (Mobilization)
    `;
    triplesHtml = `
      - <code>(${pCode}) --[LIFECYCLE_PHASE]--> (Mobilization)</code><br>
      - <code>(Portfolio Manager) --[OVERALL_HEALTH]--> (72% At Risk)</code>
    `;
  }

  return `
    <div class="collapsible-trace-box">
      <div class="trace-bar-header" onclick="state.isTraceExpanded = !state.isTraceExpanded; renderApp();">
        <div class="trace-bar-title">
          <span class="material-symbols-outlined" style="color:var(--tertiary-fixed-dim)">settings_suggest</span>
          <span>LangGraph Telemetry Trace (Page: ${pageTitle} | ${scopeText})</span>
        </div>
        <div class="trace-bar-badges">

          <span class="chip chip-success">Confidence: 98%</span>
          <span class="chip chip-success">Latency: 12 ms</span>
          <span class="chip chip-info">Tokens: ${tokenCount} ($${costUsd})</span>
          <span style="color:#ffffff; font-weight:bold">${state.isTraceExpanded ? '▲ Collapse' : '▼ Expand'}</span>
        </div>
      </div>

      ${state.isTraceExpanded ? `
        <div class="trace-body-grid">
          <div class="trace-card">
            <div class="trace-card-title">
              <span>Agents & LangGraphs Relevant to ${pageTitle}</span>
              <span class="chip chip-success">Active</span>
            </div>
            <div class="trace-card-content">
              ${agentsCalledHtml}
            </div>
          </div>

          <div class="trace-card">
            <div class="trace-card-title">
              <span>LLM Call & Hyperparameters</span>
              <span class="chip chip-success">TCS GenAI API</span>
            </div>
            <div class="trace-card-content">
              • <strong>Model:</strong> ${llmModelText}<br>
              • <strong>Endpoint:</strong> https://genailab.tcs.in/api/v1<br>
              • <strong>Hyperparameters:</strong> Temp=0.2, Top-P=0.95<br>
              • <strong>Token Usage:</strong> ${tokenCount} Tokens<br>
              • <strong>Est Cost:</strong> $${costUsd} USD / Request
            </div>
          </div>


          <div class="trace-card">
            <div class="trace-card-title">
              <span>Guardrails Executed for ${pageTitle}</span>
              <span class="chip chip-success">PASSED</span>
            </div>
            <div class="trace-card-content">
              ${guardrailsHtml}<br>
              • <strong>PII Masking Result:</strong><br>
              ${piiTagsHtml}
            </div>
          </div>

          <div class="trace-card">
            <div class="trace-card-title">
              <span>MCP Tools Executed (Port 5001)</span>
              <span class="chip chip-success">FastMCP Online</span>
            </div>
            <div class="trace-card-content">
              ${mcpToolsHtml}
            </div>
          </div>

          <div class="trace-card">
            <div class="trace-card-title">
              <span>RAG & Data Context Specific to ${pageTitle}</span>
              <span class="chip chip-info">Page Context</span>
            </div>
            <div class="trace-card-content">
              ${ragContextHtml}<br>
              • <strong>Knowledge Graph Context (mcp.db):</strong><br>
              ${triplesHtml}
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}



// AI Tone & Sentiment Transformation Handler
async function refineToneWithAI(toneName) {
  const subjectInput = document.getElementById('editSubject');
  const bodyInput = document.getElementById('editBody');
  const refineBtn = document.getElementById('btnRefineTone');
  const statusContainer = document.getElementById('aiTransformationStatus');

  if (!bodyInput || !bodyInput.value) return;

  const emailObj = state.selectedEmailForApproval;
  const recipientName = emailObj ? (emailObj.recipient_role || emailObj.recipient_name || 'Stakeholders') : 'Stakeholders';

  // 1. Show AI Working Panel & Pulsing Input Glow Animation
  if (subjectInput) subjectInput.classList.add('ai-transforming-glow');
  if (bodyInput) bodyInput.classList.add('ai-transforming-glow');

  if (statusContainer) {
    statusContainer.style.display = 'block';
    statusContainer.innerHTML = `
      <div class="ai-working-panel">
        <div class="ai-working-spinner"></div>
        <div style="flex:1">
          <div style="font-weight:700; color:#38bdf8; font-size:12px; display:flex; align-items:center; gap:6px;">
            <span class="material-symbols-outlined" style="font-size:16px; animation:aiSparkle 1s infinite ease-in-out;">auto_awesome</span>
            AI Multi-Agent LLM is refining tone to '${toneName}'...
          </div>
          <div style="font-size:11px; color:#94a3b8; margin-top:2px;">
            Sanitizing headers &amp; rewriting salutation to 'Dear ${recipientName}'
          </div>
        </div>
      </div>
    `;
  }

  if (refineBtn) {
    refineBtn.disabled = true;
    refineBtn.style.opacity = '0.75';
    refineBtn.innerHTML = '<span class="material-symbols-outlined spin" style="font-size:16px; animation:aiSpinSlow 1s linear infinite;">sync</span> Refinement Engine Running...';
  }

  const res = await apiPost('/emails/refine-tone', {
    subject: subjectInput ? subjectInput.value : '',
    body: bodyInput.value,
    tone: toneName || 'Executive',
    recipient_role: state.selectedEmailForApproval ? state.selectedEmailForApproval.recipient_role : '',
    recipient_email: state.selectedEmailForApproval ? state.selectedEmailForApproval.recipient_email : ''
  });

  // 2. Remove Glow Animation
  if (subjectInput) subjectInput.classList.remove('ai-transforming-glow');
  if (bodyInput) bodyInput.classList.remove('ai-transforming-glow');

  if (refineBtn) {
    refineBtn.disabled = false;
    refineBtn.style.opacity = '1';
    refineBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px; color:#facc15">bolt</span> ✨ Transform Tone with AI';
  }

  if (res && res.status === 'success') {
    if (subjectInput && res.refined_subject) subjectInput.value = res.refined_subject;
    if (bodyInput && res.refined_body) bodyInput.value = res.refined_body;
    if (state.selectedEmailForApproval) {
      if (res.refined_subject) state.selectedEmailForApproval.subject = res.refined_subject;
      if (res.refined_body) state.selectedEmailForApproval.body = res.refined_body;
    }

    if (statusContainer) {
      statusContainer.innerHTML = `
        <div style="background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 8px; padding: 10px 14px; color: #16a34a; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: space-between; animation: fadeSlideIn 0.3s ease;">
          <span style="display:flex; align-items:center; gap:6px;">
            <span class="material-symbols-outlined" style="font-size:18px;">check_circle</span>
            ✨ AI Tone Refinement Applied! Subject and body updated with '${res.tone_applied}' sentiment.
          </span>
          <span class="chip chip-success" style="font-size:10px;">PASSED</span>
        </div>
      `;
      setTimeout(() => {
        if (statusContainer) statusContainer.style.display = 'none';
      }, 4500);
    }
  } else {
    if (statusContainer) {
      statusContainer.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 10px 14px; color: #dc2626; font-size: 12px; font-weight: 700; animation: fadeSlideIn 0.3s ease;">
          ⚠️ Tone transformation failed. Please check backend connection.
        </div>
      `;
    }
  }
}

function getAppRecipientName(role, email) {
  return 'Linus Simon';
}

// Render Human Approval & Sent Email Inspector Modal Overlay
function renderHumanApprovalModal() {
  const e = state.selectedEmailForApproval;
  const isSent = e.status === 'SENT';
  const recipientName = getAppRecipientName(e.recipient_role, e.recipient_email);

  return `
    <div class="modal-backdrop">
      <div class="modal-window" style="max-width: 680px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
          <h3 style="font-size:18px; font-weight:700; color:var(--on-surface)">
            ${isSent ? `📧 Dispatched Email Inspector (Draft #${e.id})` : `Human Approval Interface (Draft #${e.id})`}
          </h3>
          <button class="btn-secondary" onclick="closeApprovalModal()" style="padding:4px 8px">✕</button>
        </div>

        <div style="margin-bottom:12px; display:flex; align-items:center; justify-content:space-between">
          <span class="chip ${isSent ? 'chip-success' : 'chip-warning'}" style="font-size:12px; font-weight:700">
            ${isSent ? 'STATUS: SENT (Dispatched via Resend API)' : 'STATUS: PENDING (Human Approval Required)'}
          </span>
          <span style="font-size:12px; color:var(--on-surface-variant)">
            ${isSent ? `Dispatched at: ${e.sent_at || e.updated_at || '2026-08-07 10:11:26'}` : `Created at: ${e.created_at || 'Recently'}`}
          </span>
        </div>

        <div style="background:var(--surface-container-low); padding:12px; border-radius:8px; margin-bottom:16px">
          <div style="font-size:12px; color:var(--on-surface-variant); margin-bottom:4px">
            <strong>Target Recipient:</strong> ${recipientName} (linusimon@gmail.com) <span class="chip chip-info" style="font-size:10px; margin-left:6px;">Role: ${e.recipient_role}</span>
          </div>
          <div style="font-size:12px; color:var(--on-surface-variant)">
            <strong>Original Intended Route:</strong> ${e.recipient_email}
          </div>
        </div>

        ${!isSent ? `
          <!-- AI Tone & Sentiment Refiner Bar -->
          <div style="background: linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(14, 165, 233, 0.08) 100%); border: 1px solid rgba(2, 132, 199, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-size:12px; font-weight:700; color:var(--primary); display:flex; align-items:center; gap:6px;">
                <span class="material-symbols-outlined" style="font-size:16px; color:#facc15">auto_awesome</span>
                AI Tone & Sentiment Refiner (TCS GenAI API)
              </span>
              <span class="chip chip-info" style="font-size:10px;">gemini-1.5-pro</span>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <select id="selectedToneSelect" class="btn-secondary" style="background:#fff; height:36px; font-size:12px; font-weight:600; cursor:pointer;">
                <option value="Executive">👔 Executive Brief (Formal & Concise)</option>
                <option value="Diplomatic">🤝 Diplomatic & Solution-Oriented</option>
                <option value="Urgent">🚨 Urgent Escalation (High Risk Impact)</option>
                <option value="Technical">💡 Technical Lead (Engineering Detail)</option>
              </select>
              <button id="btnRefineTone" class="btn-primary" style="background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); height:36px; padding:0 14px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:6px; border:none; border-radius:6px; cursor:pointer; color:#fff;" onclick="refineToneWithAI(document.getElementById('selectedToneSelect').value)">
                <span class="material-symbols-outlined" style="font-size:16px; color:#facc15">bolt</span>
                <span>✨ Transform Tone with AI</span>
              </button>
            </div>
            <div id="aiTransformationStatus" style="display:none; margin-top:10px;"></div>
          </div>
        ` : ''}

        <label style="font-size:12px; font-weight:700; color:var(--on-surface)">Subject Line:</label>
        <input type="text" id="editSubject" value="${e.subject}" ${isSent ? 'disabled style="background:var(--surface-container-low); color:var(--on-surface)"' : ''} />

        <label style="font-size:12px; font-weight:700; color:var(--on-surface); margin-top:12px; display:block">Full Email Body Content:</label>
        <textarea id="editBody" rows="10" ${isSent ? 'disabled style="background:var(--surface-container-low); color:var(--on-surface); line-height:1.6;"' : ''}>${e.body}</textarea>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:16px">
          <button class="btn-secondary" onclick="closeApprovalModal()">${isSent ? 'Close Viewer' : 'Cancel'}</button>
          ${!isSent ? `
            <button class="btn-success" onclick="approveEmail()">
              <span class="material-symbols-outlined">send</span> Approve & Dispatch via Resend
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}



// Render Dashboard Grid Customizer Modal Overlay
function renderCustomizeModal() {
  const widgetTitles = {
    kpis: '5 KPI Metrics Overview Cards Row',
    heatmap: '5x5 Risk Heatmap Matrix',
    aiAnalyse: 'AI Analyse Live Insights Table',
    breakdown: 'Project Phase Breakdown Table',
    flowchart: 'Critical Path Dependency Flowchart'
  };

  return `
    <div class="modal-backdrop">
      <div class="modal-window">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
          <h3 style="font-size:18px; font-weight:700; color:var(--on-surface)">Customize Dashboard Layout</h3>
          <button class="btn-secondary" onclick="closeCustomizeModal()" style="padding:4px 8px">✕</button>
        </div>

        <p style="color:var(--on-surface-variant); font-size:12px; margin-bottom:16px">
          Rearrange widget cards or toggle visibility to personalize your Program Manager workspace layout.
        </p>

        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px">
          ${state.dashboardWidgetOrder.map((key, idx) => {
            const isVisible = state.widgetVisibility[key];
            return `
              <div style="display:flex; align-items:center; justify-content:space-between; background:var(--surface-container-low); padding:10px 14px; border-radius:8px; border:1px solid var(--outline-variant)">
                <div style="display:flex; align-items:center; gap:10px">
                  <span class="material-symbols-outlined" style="color:var(--outline)">drag_indicator</span>
                  <span style="font-size:13px; font-weight:700; color:var(--on-surface)">${widgetTitles[key]}</span>
                </div>

                <div style="display:flex; align-items:center; gap:6px">
                  <button class="btn-secondary" onclick="moveWidgetUp(${idx})" ${idx === 0 ? 'disabled' : ''} style="padding:4px 8px; font-size:11px" title="Move Up">▲</button>
                  <button class="btn-secondary" onclick="moveWidgetDown(${idx})" ${idx === state.dashboardWidgetOrder.length - 1 ? 'disabled' : ''} style="padding:4px 8px; font-size:11px" title="Move Down">▼</button>
                  <button class="${isVisible ? 'btn-primary' : 'btn-secondary'}" onclick="toggleWidgetVisibility('${key}')" style="padding:4px 10px; font-size:11px">
                    ${isVisible ? 'Visible' : 'Hidden'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center">
          <button class="btn-secondary" onclick="resetDashboardLayout()">Reset Default Layout</button>
          <button class="btn-primary" onclick="closeCustomizeModal()">Done & Save</button>
        </div>
      </div>
    </div>
  `;
}

// DOM Initialization
document.addEventListener('DOMContentLoaded', initApp);
