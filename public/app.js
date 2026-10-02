// =============================================================================
// app.js — Multi-user ToDoApp Frontend
// Auth layer: Supabase JS (loaded via CDN as window.supabase)
// All API calls include Authorization: Bearer <access_token>
// =============================================================================

// ---------------------------------------------------------------------------
// 1. AUTH STATE
// ---------------------------------------------------------------------------
let supabaseClient = null;   // Supabase JS client (initialised after config fetch)
let currentSession = null;   // Active Supabase session
let currentUser = null;      // Supabase user object

// ---------------------------------------------------------------------------
// 2. TASK STATE
// ---------------------------------------------------------------------------
let todos = [];
let currentFilter = 'all';

// ---------------------------------------------------------------------------
// 3. DOM REFERENCES — Auth
// ---------------------------------------------------------------------------
const authOverlay       = document.getElementById('auth-overlay');
const appContainer      = document.getElementById('app-container');

const authLoginPanel    = document.getElementById('auth-login-panel');
const authSignupPanel   = document.getElementById('auth-signup-panel');

const loginForm         = document.getElementById('login-form');
const loginEmail        = document.getElementById('login-email');
const loginPassword     = document.getElementById('login-password');
const loginError        = document.getElementById('login-error');
const loginBtn          = document.getElementById('login-btn');
const loginSpinner      = document.getElementById('login-spinner');

const signupForm        = document.getElementById('signup-form');
const signupName        = document.getElementById('signup-name');
const signupEmail       = document.getElementById('signup-email');
const signupPassword    = document.getElementById('signup-password');
const signupConfirm     = document.getElementById('signup-confirm');
const signupError       = document.getElementById('signup-error');
const signupSuccess     = document.getElementById('signup-success');
const signupBtn         = document.getElementById('signup-btn');
const signupSpinner     = document.getElementById('signup-spinner');

const gotoSignupBtn     = document.getElementById('goto-signup-btn');
const gotoLoginBtn      = document.getElementById('goto-login-btn');

const userPill          = document.getElementById('user-pill');
const userAvatar        = document.getElementById('user-avatar');
const userNameEl        = document.getElementById('user-name');
const logoutBtn         = document.getElementById('logout-btn');

// ---------------------------------------------------------------------------
// 4. DOM REFERENCES — App
// ---------------------------------------------------------------------------
const todoForm          = document.getElementById('todo-form');
const todoInput         = document.getElementById('todo-input');
const todoList          = document.getElementById('todo-list');
const emptyState        = document.getElementById('empty-state');
const currentDateEl     = document.getElementById('current-date');
const themeToggleBtn    = document.getElementById('theme-toggle');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const progressFill      = document.getElementById('progress-fill');
const progressText      = document.getElementById('progress-text');
const progressPercent   = document.getElementById('progress-percent');
const syncStatus        = document.getElementById('sync-status');
const toastEl           = document.getElementById('toast');

const countAll          = document.getElementById('count-all');
const countActive       = document.getElementById('count-active');
const countCompleted    = document.getElementById('count-completed');
const filterButtons     = document.querySelectorAll('.filter-btn');

const progressCard      = document.getElementById('progress-card');
const tasksView         = document.getElementById('tasks-view');
const statsView         = document.getElementById('stats-view');
const backToTasksBtn    = document.getElementById('back-to-tasks-btn');

const statCreatedToday  = document.getElementById('stat-created-today');
const statCompletedToday= document.getElementById('stat-completed-today');
const statTodayRatio    = document.getElementById('stat-today-ratio');
const statActiveCount   = document.getElementById('stat-active-count');
const statActiveDesc    = document.getElementById('stat-active-desc');
const statTotalCompleted= document.getElementById('stat-total-completed');
const statCompletionRate= document.getElementById('stat-completion-rate');
const statTotalTracked  = document.getElementById('stat-total-tracked');
const statAvgVelocity   = document.getElementById('stat-avg-velocity');
const statVelocityTotal = document.getElementById('stat-velocity-total');
const velocityChartBars = document.getElementById('velocity-chart-bars');
const chartInsightTitle = document.getElementById('chart-insight-title');
const chartInsightText  = document.getElementById('chart-insight-text');

let isStatsViewOpen = false;

// ---------------------------------------------------------------------------
// 5. BOOTSTRAP — entry point
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initDateDisplay();
  initTheme();
  await initSupabase();
  setupAuthListeners();
  setupAppListeners();
});

// ---------------------------------------------------------------------------
// 6. SUPABASE INITIALISATION
// Fetches public config from /api/config, then creates the Supabase client.
// Uses the browser's built-in session persistence (localStorage).
// ---------------------------------------------------------------------------
async function initSupabase() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Could not load configuration');
    const config = await res.json();

    if (!config.isConfigured) {
      showAuthMessage(loginError, 'Server is not configured with Supabase credentials. Contact the administrator.');
      authOverlay.hidden = false;
      return;
    }

    // window.supabase is the UMD global exposed by the CDN script
    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

    let initialHandled = false;

    // Listen for auth state changes (login, logout, token refresh, etc.)
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      currentSession = session;
      currentUser = session?.user ?? null;

      try {
        if (currentUser) {
          await onUserLoggedIn();
        } else {
          onUserLoggedOut();
        }
      } catch (err) {
        console.error('Error handling auth state change:', err);
      }
    });

    // Check existing session once if not handled by onAuthStateChange
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;

    currentSession = session;
    currentUser = session?.user ?? null;

    if (currentUser) {
      await onUserLoggedIn();
    } else {
      onUserLoggedOut();
    }

  } catch (err) {
    console.error('Supabase init error:', err);
    showAuthMessage(loginError, 'Failed to connect to authentication service. Please refresh.');
    authOverlay.hidden = false;
  }
}

// ---------------------------------------------------------------------------
// 7. AUTH STATE HANDLERS
// ---------------------------------------------------------------------------
async function onUserLoggedIn() {
  try {
    // Reset any lingering submit loading states
    setAuthLoading(loginBtn, loginSpinner, false);
    setAuthLoading(signupBtn, signupSpinner, false);

    // Populate user pill
    const displayName = currentUser?.user_metadata?.name
      || currentUser?.email?.split('@')[0]
      || 'User';
    const initials = displayName.charAt(0).toUpperCase();

    if (userAvatar) userAvatar.textContent = initials;
    if (userNameEl) userNameEl.textContent = displayName;
    if (userPill) userPill.hidden = false;

    // Switch view: hide auth overlay, reveal main app
    if (authOverlay) authOverlay.hidden = true;
    if (appContainer) appContainer.hidden = false;

    // Load user tasks safely
    await fetchTodos();
  } catch (err) {
    console.error('Error in onUserLoggedIn:', err);
    showToast('Authenticated, but failed to load initial task data');
  }
}

function onUserLoggedOut() {
  try {
    // Clear state
    todos = [];
    currentSession = null;
    currentUser = null;

    // Reset loading states
    setAuthLoading(loginBtn, loginSpinner, false);
    setAuthLoading(signupBtn, signupSpinner, false);

    // Hide app, show auth overlay
    if (appContainer) appContainer.hidden = true;
    if (authOverlay) authOverlay.hidden = false;
    if (userPill) userPill.hidden = true;

    // Reset to login panel
    showLoginPanel();
  } catch (err) {
    console.error('Error in onUserLoggedOut:', err);
  }
}

// ---------------------------------------------------------------------------
// 8. AUTH — Panel switching helpers
// ---------------------------------------------------------------------------
function showLoginPanel() {
  authLoginPanel.hidden = false;
  authSignupPanel.hidden = true;
  clearAuthMessages();
}

function showSignupPanel() {
  authLoginPanel.hidden = true;
  authSignupPanel.hidden = false;
  clearAuthMessages();
}

function clearAuthMessages() {
  hideAuthMessage(loginError);
  hideAuthMessage(signupError);
  hideAuthMessage(signupSuccess);
}

function showAuthMessage(el, text) {
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
}

function hideAuthMessage(el) {
  if (!el) return;
  el.textContent = '';
  el.hidden = true;
}

function setAuthLoading(btn, spinner, loading) {
  if (btn) btn.disabled = Boolean(loading);
  if (spinner) spinner.hidden = !loading;
}

// ---------------------------------------------------------------------------
// 9. AUTH — Event listeners
// ---------------------------------------------------------------------------
function setupAuthListeners() {
  gotoSignupBtn.addEventListener('click', showSignupPanel);
  gotoLoginBtn.addEventListener('click', showLoginPanel);

  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthMessage(loginError);

    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    if (!email || !password) {
      showAuthMessage(loginError, 'Please enter your email and password.');
      return;
    }

    setAuthLoading(loginBtn, loginSpinner, true);
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange will trigger onUserLoggedIn()
    } catch (err) {
      showAuthMessage(loginError, err.message || 'Login failed. Please check your credentials.');
      setAuthLoading(loginBtn, loginSpinner, false);
    } finally {
      // Keep button state clean
      if (!currentUser) {
        setAuthLoading(loginBtn, loginSpinner, false);
      }
    }
  });

  // Sign up
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthMessage(signupError);
    hideAuthMessage(signupSuccess);

    const name     = signupName.value.trim();
    const email    = signupEmail.value.trim();
    const password = signupPassword.value;
    const confirm  = signupConfirm.value;

    if (!name || !email || !password || !confirm) {
      showAuthMessage(signupError, 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      showAuthMessage(signupError, 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      showAuthMessage(signupError, 'Passwords do not match.');
      return;
    }

    setAuthLoading(signupBtn, signupSpinner, true);
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { name } }
      });

      if (error) throw error;

      // If email confirmation is required, data.session will be null
      if (!data.session) {
        showAuthMessage(
          signupSuccess,
          'Account created! Please check your email to confirm your address, then sign in.'
        );
        signupForm.reset();
        setAuthLoading(signupBtn, signupSpinner, false);
      } else {
        // Auto-confirm enabled: user is signed in
        signupForm.reset();
      }
    } catch (err) {
      showAuthMessage(signupError, err.message || 'Sign up failed. Please try again.');
      setAuthLoading(signupBtn, signupSpinner, false);
    } finally {
      if (!currentUser) {
        setAuthLoading(signupBtn, signupSpinner, false);
      }
    }
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    try {
      await supabaseClient.auth.signOut();
      // onAuthStateChange fires -> onUserLoggedOut()
    } catch (err) {
      console.error('Logout error:', err);
      showToast('Logout failed. Please try again.');
    }
  });
}

// ---------------------------------------------------------------------------
// 10. AUTHENTICATED FETCH WRAPPER
// Attaches the current Supabase JWT to every request to protected endpoints.
// ---------------------------------------------------------------------------
async function authFetch(url, options = {}) {
  const session = (await supabaseClient.auth.getSession()).data.session;
  const token = session?.access_token;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}

// ---------------------------------------------------------------------------
// 11. APP EVENT LISTENERS
// ---------------------------------------------------------------------------
function setupAppListeners() {
  themeToggleBtn.addEventListener('click', toggleTheme);
  todoForm.addEventListener('submit', handleAddTodo);

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });

  clearCompletedBtn.addEventListener('click', handleClearCompleted);

  if (progressCard) {
    progressCard.addEventListener('click', openStatsView);
    progressCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openStatsView();
      }
    });
  }

  if (backToTasksBtn) {
    backToTasksBtn.addEventListener('click', closeStatsView);
  }

  const resetActivityBtn = document.getElementById('reset-activity-btn');
  if (resetActivityBtn) {
    resetActivityBtn.addEventListener('click', handleResetActivity);
  }
}

// ---------------------------------------------------------------------------
// 12. TASK OPERATIONS — All use authFetch
// ---------------------------------------------------------------------------
async function fetchTodos() {
  setSyncing(true);
  try {
    const response = await authFetch('/api/todos');
    if (response.status === 401) { onUserLoggedOut(); return; }
    if (!response.ok) throw new Error('Failed to fetch tasks');
    todos = await response.json();
    renderTodos();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    showToast('Could not load tasks');
  } finally {
    setSyncing(false);
  }
}

async function handleAddTodo(e) {
  e.preventDefault();
  const title = todoInput.value.trim();
  if (!title) return;

  const tempId = 'temp-' + Date.now();
  const tempTodo = { id: tempId, title, completed: false, createdAt: new Date().toISOString() };

  todos.unshift(tempTodo);
  todoInput.value = '';
  renderTodos();
  setSyncing(true);

  try {
    const response = await authFetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ title })
    });

    if (response.status === 401) { onUserLoggedOut(); return; }
    if (!response.ok) throw new Error('Failed to create task');
    const created = await response.json();

    const idx = todos.findIndex(t => t.id === tempId);
    if (idx !== -1) todos[idx] = created;
    renderTodos();
    showToast('Task added');
  } catch (error) {
    console.error('Error adding task:', error);
    todos = todos.filter(t => t.id !== tempId);
    renderTodos();
    showToast('Failed to add task');
  } finally {
    setSyncing(false);
  }
}

async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  const original = todo.completed;
  todo.completed = !original;
  renderTodos();
  setSyncing(true);

  try {
    const response = await authFetch(`/api/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: todo.completed })
    });

    if (response.status === 401) { onUserLoggedOut(); return; }
    if (!response.ok) throw new Error('Failed to update task');
    const updated = await response.json();
    todo.completed = updated.completed;
    renderTodos();
  } catch (error) {
    console.error('Error updating task:', error);
    todo.completed = original;
    renderTodos();
    showToast('Failed to update status');
  } finally {
    setSyncing(false);
  }
}

async function deleteTodo(id) {
  const itemEl = document.querySelector(`[data-id="${id}"]`);
  if (itemEl) itemEl.classList.add('removing');

  setTimeout(async () => {
    const originalTodos = [...todos];
    todos = todos.filter(t => t.id !== id);
    renderTodos();
    setSyncing(true);

    try {
      const response = await authFetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (response.status === 401) { onUserLoggedOut(); return; }
      if (!response.ok) throw new Error('Failed to delete task');
      showToast('Task deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
      todos = originalTodos;
      renderTodos();
      showToast('Failed to delete task');
    } finally {
      setSyncing(false);
    }
  }, 300);
}

async function handleClearCompleted() {
  setSyncing(true);
  try {
    const response = await authFetch('/api/todos', { method: 'DELETE' });
    if (response.status === 401) { onUserLoggedOut(); return; }
    if (!response.ok) throw new Error('Failed to clear completed');
    todos = todos.filter(t => !t.completed);
    renderTodos();
    showToast('Completed tasks cleared');
  } catch (error) {
    console.error('Error clearing completed:', error);
    showToast('Failed to clear completed tasks');
  } finally {
    setSyncing(false);
  }
}

// ---------------------------------------------------------------------------
// 13. STATISTICS
// ---------------------------------------------------------------------------
let cachedStats = null;

async function fetchStats() {
  try {
    const response = await authFetch('/api/stats');
    if (response.status === 401) { onUserLoggedOut(); return; }
    if (!response.ok) throw new Error('Failed to fetch statistics');
    const data = await response.json();
    cachedStats = data;
    renderStats(data);
  } catch (error) {
    console.error('Error fetching statistics:', error);
  }
}

async function handleResetActivity() {
  const confirmed = confirm(
    'Are you sure you want to reset your activity and 7-day velocity logs? Your current task list will not be deleted.'
  );
  if (!confirmed) return;

  setSyncing(true);
  try {
    const response = await authFetch('/api/stats/reset', { method: 'POST' });
    if (response.status === 401) { onUserLoggedOut(); return; }
    if (!response.ok) throw new Error('Failed to reset activity history');
    await Promise.all([fetchTodos(), fetchStats()]);
    showToast('Activity history reset');
  } catch (error) {
    console.error('Error resetting activity:', error);
    showToast('Failed to reset activity');
  } finally {
    setSyncing(false);
  }
}

// ---------------------------------------------------------------------------
// 14. RENDER FUNCTIONS (unchanged from original)
// ---------------------------------------------------------------------------
function renderTodos() {
  const active    = todos.filter(t => !t.completed);
  const completed = todos.filter(t => t.completed);

  if (countAll)       countAll.textContent       = todos.length;
  if (countActive)    countActive.textContent    = active.length;
  if (countCompleted) countCompleted.textContent = completed.length;

  const total    = todos.length;
  const done     = completed.length;
  const percent  = total > 0 ? Math.round((done / total) * 100) : 0;

  if (progressFill)    progressFill.style.width = `${percent}%`;
  if (progressText)    progressText.textContent = `${done} of ${total} task${total !== 1 ? 's' : ''} completed`;
  if (progressPercent) progressPercent.textContent = `${percent}%`;

  let filtered = todos;
  if (currentFilter === 'active')    filtered = active;
  if (currentFilter === 'completed') filtered = completed;

  todoList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  filtered.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    li.setAttribute('data-id', todo.id);

    const checkboxId = `check-${todo.id}`;

    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = checkboxId;
    checkboxLabel.className = 'todo-checkbox-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = checkboxId;
    checkbox.checked = todo.completed;
    checkbox.className = 'todo-checkbox';
    checkbox.setAttribute('aria-label', `Mark "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`);
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    const customCheck = document.createElement('span');
    customCheck.className = 'custom-checkbox';
    customCheck.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>`;

    checkboxLabel.appendChild(checkbox);
    checkboxLabel.appendChild(customCheck);

    const leftContainer = document.createElement('div');
    leftContainer.className = 'todo-item-left';

    const details = document.createElement('div');
    details.className = 'todo-details';

    const titleEl = document.createElement('span');
    titleEl.className = 'todo-title';
    titleEl.textContent = todo.title;

    const timeEl = document.createElement('span');
    timeEl.className = 'todo-time';
    timeEl.textContent = formatTime(todo.createdAt);

    details.appendChild(titleEl);
    details.appendChild(timeEl);
    leftContainer.appendChild(checkboxLabel);
    leftContainer.appendChild(details);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-delete';
    deleteBtn.setAttribute('aria-label', `Delete task: "${todo.title}"`);
    deleteBtn.title = 'Delete task';
    deleteBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>`;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTodo(todo.id);
    });

    li.appendChild(leftContainer);
    li.appendChild(deleteBtn);
    todoList.appendChild(li);
  });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function renderStats(data) {
  if (!data || !data.overview) return;
  const { overview, last7Days } = data;

  if (statCreatedToday)   statCreatedToday.textContent   = overview.createdToday ?? 0;
  if (statCompletedToday) statCompletedToday.textContent = overview.completedToday ?? 0;
  if (statTodayRatio) {
    const c = overview.completedToday ?? 0;
    statTodayRatio.textContent = c === 1 ? '1 task completed today' : `${c} tasks completed today`;
  }
  if (statActiveCount) statActiveCount.textContent = overview.totalActive ?? 0;
  if (statActiveDesc) {
    const c = overview.totalActive ?? 0;
    statActiveDesc.textContent = c === 0 ? 'No pending tasks! All clear' : `${c} waiting for completion`;
  }
  if (statTotalCompleted) statTotalCompleted.textContent = overview.totalCompleted ?? 0;
  if (statCompletionRate) statCompletionRate.textContent = `${overview.completionRate ?? 0}% rate`;
  if (statTotalTracked)   statTotalTracked.textContent   = `${overview.totalAllTime ?? 0} total recorded`;
  if (statAvgVelocity)    statAvgVelocity.textContent    = (overview.avgDailyVelocity ?? 0).toFixed(1);
  if (statVelocityTotal) {
    const c = overview.totalLast7Completed ?? 0;
    statVelocityTotal.textContent = `${c} completed in past 7 days`;
  }

  renderVelocityChart(last7Days || [], overview);
}

function renderVelocityChart(days, overview) {
  if (!velocityChartBars) return;
  velocityChartBars.innerHTML = '';

  if (!days || days.length === 0) {
    velocityChartBars.innerHTML = '<div class="empty-chart-note">No recent activity recorded</div>';
    return;
  }

  const maxDayVal = Math.max(4, ...days.map(d => Math.max(d.created || 0, d.completed || 0)));

  days.forEach(day => {
    const col = document.createElement('div');
    col.className = `chart-day-col ${day.isToday ? 'is-today' : ''}`;
    col.tabIndex = 0;
    col.setAttribute('role', 'group');
    col.setAttribute('aria-label',
      `${day.dayName}, ${day.fullDate}: ${day.created} created, ${day.completed} completed`);

    const barsTrack = document.createElement('div');
    barsTrack.className = 'day-bars-track';

    const cPct = Math.min(100, Math.round(((day.created || 0) / maxDayVal) * 100));
    const createdBar = document.createElement('div');
    createdBar.className = 'chart-bar bar-created';
    createdBar.style.height = `${Math.max(6, cPct)}%`;
    if (day.created > 0) {
      const badge = document.createElement('span');
      badge.className = 'bar-val-badge';
      badge.textContent = day.created;
      createdBar.appendChild(badge);
    }

    const dPct = Math.min(100, Math.round(((day.completed || 0) / maxDayVal) * 100));
    const completedBar = document.createElement('div');
    completedBar.className = 'chart-bar bar-completed';
    completedBar.style.height = `${Math.max(6, dPct)}%`;
    if (day.completed > 0) {
      const badge = document.createElement('span');
      badge.className = 'bar-val-badge';
      badge.textContent = day.completed;
      completedBar.appendChild(badge);
    }

    barsTrack.appendChild(createdBar);
    barsTrack.appendChild(completedBar);

    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-header">${day.isToday ? 'Today' : day.dayName} · ${day.fullDate}</div>
      <div class="tooltip-row">
        <span class="tooltip-dot swatch-created"></span>
        <span>Created: <strong>${day.created}</strong></span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-dot swatch-completed"></span>
        <span>Completed: <strong>${day.completed}</strong></span>
      </div>`;

    const labelGroup = document.createElement('div');
    labelGroup.className = 'day-label-group';

    const dayNameEl = document.createElement('span');
    dayNameEl.className = `day-name ${day.isToday ? 'today-pill' : ''}`;
    dayNameEl.textContent = day.dayName;

    const dateSub = document.createElement('span');
    dateSub.className = 'day-date-sub';
    dateSub.textContent = day.fullDate;

    labelGroup.appendChild(dayNameEl);
    labelGroup.appendChild(dateSub);

    col.appendChild(tooltip);
    col.appendChild(barsTrack);
    col.appendChild(labelGroup);
    velocityChartBars.appendChild(col);
  });

  if (chartInsightTitle && chartInsightText) {
    const todayCompleted = overview.completedToday || 0;
    const avgVelocity    = overview.avgDailyVelocity || 0;
    const activeTasks    = overview.totalActive || 0;

    if (todayCompleted >= 3 || (todayCompleted > avgVelocity && todayCompleted >= 2)) {
      chartInsightTitle.textContent = '🔥 High Velocity Streak!';
      chartInsightText.textContent  = `You've completed ${todayCompleted} tasks today, outperforming your 7-day average of ${avgVelocity} tasks/day. Keep up the momentum!`;
    } else if (todayCompleted > 0) {
      chartInsightTitle.textContent = '⚡ Steady Productivity';
      chartInsightText.textContent  = `Great consistency! You completed ${todayCompleted} task${todayCompleted === 1 ? '' : 's'} today. You're averaging ${avgVelocity} completed tasks daily.`;
    } else if (activeTasks === 0 && overview.totalCompleted > 0) {
      chartInsightTitle.textContent = '✅ Clear Workspace';
      chartInsightText.textContent  = 'All your tasks are completed! Enjoy your well-earned break or plan ahead for tomorrow.';
    } else {
      chartInsightTitle.textContent = '🎯 Daily Target Opportunity';
      chartInsightText.textContent  = `You have ${activeTasks} pending task${activeTasks === 1 ? '' : 's'}. Complete a task now to build your daily velocity!`;
    }
  }
}

// ---------------------------------------------------------------------------
// 15. VIEW SWITCHING
// ---------------------------------------------------------------------------
function openStatsView() {
  isStatsViewOpen = true;
  tasksView.hidden = true;
  tasksView.classList.remove('active');
  statsView.hidden = false;
  statsView.classList.add('active');
  fetchStats();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeStatsView() {
  isStatsViewOpen = false;
  statsView.hidden = true;
  statsView.classList.remove('active');
  tasksView.hidden = false;
  tasksView.classList.add('active');
  if (progressCard) progressCard.focus();
}

// ---------------------------------------------------------------------------
// 16. FILTER
// ---------------------------------------------------------------------------
function setFilter(filter) {
  currentFilter = filter;
  filterButtons.forEach(btn => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  renderTodos();
}

// ---------------------------------------------------------------------------
// 17. THEME
// ---------------------------------------------------------------------------
function initDateDisplay() {
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  currentDateEl.textContent = new Date().toLocaleDateString(undefined, options);
}

function initTheme() {
  const saved = localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

// ---------------------------------------------------------------------------
// 18. UI UTILITIES
// ---------------------------------------------------------------------------
let toastTimeout;
function showToast(message) {
  clearTimeout(toastTimeout);
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

function setSyncing(isSyncing) {
  if (syncStatus) {
    syncStatus.textContent = isSyncing ? 'Syncing...' : 'All changes saved';
  }
}
