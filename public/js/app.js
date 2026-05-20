/* ─── State ─────────────────────────────────────────────────── */
let currentProject = null;
let allTasks = [];

/* ─── Init ──────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  if (API.token && API.user) {
    showApp();
  } else {
    document.getElementById('auth-page').classList.remove('hidden');
  }
});

function showApp() {
  document.getElementById('auth-page').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('nav-username').textContent = API.user?.name || '';
  navigate('dashboard');
}

/* ─── Auth ──────────────────────────────────────────────────── */
function showAuthTab(tab) {
  ['login', 'signup'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
    document.getElementById(`${t}-form`).classList.toggle('hidden', t !== tab);
  });
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Logging in…';
  try {
    const { token, user } = await API.post('/auth/login', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value,
    });
    API.token = token; API.user = user;
    showApp();
  } catch (err) {
    errEl.textContent = err.message || 'Login failed'; errEl.classList.remove('hidden');
  } finally { btn.disabled = false; btn.textContent = 'Log in'; }
}

async function handleSignup(e) {
  e.preventDefault();
  const btn = document.getElementById('signup-btn');
  const errEl = document.getElementById('signup-error');
  errEl.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Creating…';
  try {
    const { token, user } = await API.post('/auth/signup', {
      name: document.getElementById('signup-name').value,
      email: document.getElementById('signup-email').value,
      password: document.getElementById('signup-password').value,
    });
    API.token = token; API.user = user;
    showApp();
  } catch (err) {
    const msg = err.errors ? err.errors[0].msg : (err.message || 'Signup failed');
    errEl.textContent = msg; errEl.classList.remove('hidden');
  } finally { btn.disabled = false; btn.textContent = 'Create account'; }
}

function logout() {
  API.token = null; API.user = null;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-page').classList.remove('hidden');
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
}

/* ─── Navigation ────────────────────────────────────────────── */
function navigate(view) {
  ['dashboard', 'projects', 'project'].forEach(v => {
    document.getElementById(`view-${v}`)?.classList.add('hidden');
  });
  document.getElementById(`view-${view}`).classList.remove('hidden');
  ['dashboard', 'projects'].forEach(v => {
    document.getElementById(`nav-${v}`)?.classList.toggle('active', v === view);
  });
  if (view === 'dashboard') loadDashboard();
  if (view === 'projects') loadProjects();
}

/* ─── Dashboard ─────────────────────────────────────────────── */
async function loadDashboard() {
  try {
    const data = await API.get('/dashboard');
    document.getElementById('stat-projects').textContent = data.projects;
    document.getElementById('stat-total').textContent = data.tasks.total;
    document.getElementById('stat-inprogress').textContent = data.tasks['in-progress'];
    document.getElementById('stat-overdue').textContent = data.tasks.overdue;

    const list = document.getElementById('my-tasks-list');
    if (!data.myTasks.length) {
      list.innerHTML = '<div class="empty-state"><p>No tasks assigned to you</p></div>';
    } else {
      list.innerHTML = data.myTasks.map(t => taskCardHTML(t, false)).join('');
    }
  } catch { }
}

/* ─── Projects ──────────────────────────────────────────────── */
async function loadProjects() {
  try {
    const projects = await API.get('/projects');
    const grid = document.getElementById('projects-list');
    if (!projects.length) {
      grid.innerHTML = '<div class="empty-state"><p>No projects yet</p><small>Create one to get started</small></div>';
      return;
    }
    grid.innerHTML = projects.map(p => {
      const myRole = p.members.find(m => m.user._id === API.user._id)?.role || 'member';
      return `
        <div class="project-card" onclick="openProject('${p._id}')">
          <div class="project-card-name">${esc(p.name)}</div>
          <div class="project-card-desc">${esc(p.description) || 'No description'}</div>
          <div class="project-card-footer">
            <span>${p.members.length} member${p.members.length !== 1 ? 's' : ''}</span>
            <span class="project-card-role">${myRole}</span>
          </div>
        </div>`;
    }).join('');
  } catch { }
}

/* ─── Project Detail ─────────────────────────────────────────── */
async function openProject(projectId) {
  navigate('project');
  try {
    currentProject = await API.get(`/projects/${projectId}`);
    document.getElementById('project-name-heading').textContent = currentProject.name;
    document.getElementById('project-desc').textContent = currentProject.description || '';

    const myRole = currentProject.members.find(m => m.user._id === API.user._id)?.role;
    const adminActions = document.getElementById('project-admin-actions');
    adminActions.style.display = myRole === 'admin' ? 'flex' : 'none';

    showProjectTab('tasks');
  } catch { }
}

function showProjectTab(tab) {
  document.getElementById('project-tasks-view').classList.toggle('hidden', tab !== 'tasks');
  document.getElementById('project-members-view').classList.toggle('hidden', tab !== 'members');
  document.getElementById('ptab-tasks').classList.toggle('active', tab === 'tasks');
  document.getElementById('ptab-members').classList.toggle('active', tab === 'members');
  if (tab === 'tasks') loadTasks();
  if (tab === 'members') renderMembers();
}

async function loadTasks() {
  if (!currentProject) return;
  try {
    allTasks = await API.get(`/projects/${currentProject._id}/tasks`);
    filterTasks();
  } catch { }
}

function filterTasks() {
  const status = document.getElementById('filter-status').value;
  const filtered = status ? allTasks.filter(t => t.status === status) : allTasks;
  const list = document.getElementById('tasks-list');
  const myRole = currentProject?.members.find(m => m.user._id === API.user._id)?.role;
  const isAdmin = myRole === 'admin';

  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state"><p>No tasks</p></div>';
    return;
  }
  list.innerHTML = filtered.map(t => taskCardHTML(t, isAdmin, true)).join('');
}

function taskCardHTML(t, isAdmin, showActions = false) {
  const due = t.dueDate ? new Date(t.dueDate) : null;
  const isOverdue = due && due < new Date() && t.status !== 'done';
  const dueFmt = due ? due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
  const statusBadge = { todo: 'badge-todo', 'in-progress': 'badge-inprogress', done: 'badge-done' }[t.status];
  const statusLabel = { todo: 'To do', 'in-progress': 'In progress', done: 'Done' }[t.status];
  const priBadge = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high' }[t.priority];

  const isAssignee = t.assignedTo?._id === API.user._id;
  const canChangeStatus = isAdmin || isAssignee;

  return `
    <div class="task-card">
      <div class="task-card-left">
        <div class="task-card-title">${esc(t.title)}</div>
        <div class="task-card-meta">
          ${canChangeStatus && showActions
      ? `<select class="status-select" onchange="updateTaskStatus('${t._id}', this.value)">
                <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>To do</option>
                <option value="in-progress" ${t.status === 'in-progress' ? 'selected' : ''}>In progress</option>
                <option value="done" ${t.status === 'done' ? 'selected' : ''}>Done</option>
               </select>`
      : `<span class="badge ${statusBadge}">${statusLabel}</span>`}
          <span class="badge ${priBadge}">${t.priority}</span>
          ${t.assignedTo ? `<span style="color:var(--text-muted);font-size:12px">→ ${esc(t.assignedTo.name)}</span>` : ''}
          ${dueFmt ? `<span class="badge ${isOverdue ? 'badge-overdue' : ''}" style="${!isOverdue ? 'background:#f3f4f6;color:#6b7280' : ''}">${isOverdue ? '⚠ ' : ''}${dueFmt}</span>` : ''}
        </div>
      </div>
      ${isAdmin && showActions ? `
      <div class="task-card-actions">
        <button class="btn btn-ghost btn-sm" onclick="openEditTask('${t._id}')">Edit</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteTask('${t._id}')">Delete</button>
      </div>` : ''}
    </div>`;
}

async function updateTaskStatus(taskId, status) {
  if (!currentProject) return;
  try {
    await API.put(`/projects/${currentProject._id}/tasks/${taskId}`, { status });
    loadTasks();
    // Refresh dashboard stats if visible
  } catch (err) {
    alert(err.message || 'Failed to update status');
    loadTasks(); // reset select
  }
}

async function deleteTask(taskId) {
  if (!confirm('Delete this task?')) return;
  try {
    await API.delete(`/projects/${currentProject._id}/tasks/${taskId}`);
    loadTasks();
  } catch (err) { alert(err.message || 'Failed to delete task'); }
}

function renderMembers() {
  if (!currentProject) return;
  const myRole = currentProject.members.find(m => m.user._id === API.user._id)?.role;
  const isAdmin = myRole === 'admin';

  document.getElementById('members-list').innerHTML = currentProject.members.map(m => `
    <div class="member-row">
      <div class="member-avatar">${m.user.name[0].toUpperCase()}</div>
      <div class="member-info">
        <div class="member-name">${esc(m.user.name)} ${m.user._id === API.user._id ? '(you)' : ''}</div>
        <div class="member-email">${esc(m.user.email)}</div>
      </div>
      <span class="${m.role === 'admin' ? 'badge-admin' : 'badge-member'}">${m.role}</span>
      ${isAdmin && m.user._id !== currentProject.createdBy
      ? `<button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="removeMember('${m.user._id}')">Remove</button>`
      : ''}
    </div>`).join('');
}

async function removeMember(userId) {
  if (!confirm('Remove this member?')) return;
  try {
    currentProject = await API.delete(`/projects/${currentProject._id}/members/${userId}`);
    renderMembers();
  } catch (err) { alert(err.message || 'Failed to remove member'); }
}

/* ─── Modals ─────────────────────────────────────────────────── */
function openModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.add('hidden');
}

// Create Project
function openCreateProject() {
  openModal('New project', `
    <div class="form-group"><label>Project name</label><input type="text" id="m-proj-name" placeholder="e.g. Website Redesign" /></div>
    <div class="form-group"><label>Description (optional)</label><textarea id="m-proj-desc" placeholder="What is this project about?"></textarea></div>
    <div id="m-proj-error" class="form-error hidden"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-outline" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Cancel</button>
      <button class="btn btn-primary" onclick="submitCreateProject()">Create project</button>
    </div>`);
  setTimeout(() => document.getElementById('m-proj-name')?.focus(), 50);
}

async function submitCreateProject() {
  const name = document.getElementById('m-proj-name').value.trim();
  const desc = document.getElementById('m-proj-desc').value.trim();
  const errEl = document.getElementById('m-proj-error');
  if (!name) { errEl.textContent = 'Name is required'; errEl.classList.remove('hidden'); return; }
  try {
    await API.post('/projects', { name, description: desc });
    document.getElementById('modal-overlay').classList.add('hidden');
    loadProjects();
  } catch (err) { errEl.textContent = err.message || 'Failed'; errEl.classList.remove('hidden'); }
}

// Add Member
function openAddMember() {
  openModal('Add member', `
    <div class="form-group"><label>Email address</label><input type="email" id="m-mem-email" placeholder="member@example.com" /></div>
    <div class="form-group"><label>Role</label>
      <select id="m-mem-role"><option value="member">Member</option><option value="admin">Admin</option></select>
    </div>
    <div id="m-mem-error" class="form-error hidden"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-outline" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Cancel</button>
      <button class="btn btn-primary" onclick="submitAddMember()">Add member</button>
    </div>`);
  setTimeout(() => document.getElementById('m-mem-email')?.focus(), 50);
}

async function submitAddMember() {
  const email = document.getElementById('m-mem-email').value.trim();
  const role = document.getElementById('m-mem-role').value;
  const errEl = document.getElementById('m-mem-error');
  if (!email) { errEl.textContent = 'Email required'; errEl.classList.remove('hidden'); return; }
  try {
    currentProject = await API.post(`/projects/${currentProject._id}/members`, { email, role });
    document.getElementById('modal-overlay').classList.add('hidden');
    renderMembers();
  } catch (err) { errEl.textContent = err.message || 'Failed'; errEl.classList.remove('hidden'); }
}

// Create / Edit Task
function openCreateTask() { openTaskModal(null); }
function openEditTask(taskId) { openTaskModal(allTasks.find(t => t._id === taskId)); }

function openTaskModal(task) {
  const isEdit = !!task;
  const memberOptions = currentProject.members.map(m =>
    `<option value="${m.user._id}" ${task?.assignedTo?._id === m.user._id ? 'selected' : ''}>${esc(m.user.name)}</option>`
  ).join('');

  openModal(isEdit ? 'Edit task' : 'New task', `
    <div class="form-group"><label>Title</label><input type="text" id="m-task-title" value="${esc(task?.title || '')}" placeholder="Task title" /></div>
    <div class="form-group"><label>Description (optional)</label><textarea id="m-task-desc" placeholder="Details…">${esc(task?.description || '')}</textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label>Status</label>
        <select id="m-task-status">
          <option value="todo" ${task?.status === 'todo' || !task ? 'selected' : ''}>To do</option>
          <option value="in-progress" ${task?.status === 'in-progress' ? 'selected' : ''}>In progress</option>
          <option value="done" ${task?.status === 'done' ? 'selected' : ''}>Done</option>
        </select>
      </div>
      <div class="form-group"><label>Priority</label>
        <select id="m-task-priority">
          <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>Low</option>
          <option value="medium" ${task?.priority === 'medium' || !task ? 'selected' : ''}>Medium</option>
          <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>High</option>
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label>Assign to</label>
        <select id="m-task-assignee"><option value="">Unassigned</option>${memberOptions}</select>
      </div>
      <div class="form-group"><label>Due date</label>
        <input type="date" id="m-task-due" value="${task?.dueDate ? task.dueDate.split('T')[0] : ''}" />
      </div>
    </div>
    <div id="m-task-error" class="form-error hidden"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-outline" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Cancel</button>
      <button class="btn btn-primary" onclick="submitTask('${task?._id || ''}')">${isEdit ? 'Save changes' : 'Create task'}</button>
    </div>`);
  setTimeout(() => document.getElementById('m-task-title')?.focus(), 50);
}

async function submitTask(taskId) {
  const title = document.getElementById('m-task-title').value.trim();
  const errEl = document.getElementById('m-task-error');
  if (!title) { errEl.textContent = 'Title is required'; errEl.classList.remove('hidden'); return; }

  const body = {
    title,
    description: document.getElementById('m-task-desc').value.trim(),
    status: document.getElementById('m-task-status').value,
    priority: document.getElementById('m-task-priority').value,
    assignedTo: document.getElementById('m-task-assignee').value || null,
    dueDate: document.getElementById('m-task-due').value || null,
  };

  try {
    if (taskId) {
      await API.put(`/projects/${currentProject._id}/tasks/${taskId}`, body);
    } else {
      await API.post(`/projects/${currentProject._id}/tasks`, body);
    }
    document.getElementById('modal-overlay').classList.add('hidden');
    loadTasks();
  } catch (err) { errEl.textContent = err.message || 'Failed'; errEl.classList.remove('hidden'); }
}

/* ─── Utility ────────────────────────────────────────────────── */
function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
