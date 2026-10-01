// State Management
let todos = [];
let currentFilter = 'all';

// DOM Elements
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const currentDateEl = document.getElementById('current-date');
const themeToggleBtn = document.getElementById('theme-toggle');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const progressPercent = document.getElementById('progress-percent');
const syncStatus = document.getElementById('sync-status');
const toastEl = document.getElementById('toast');

const countAll = document.getElementById('count-all');
const countActive = document.getElementById('count-active');
const countCompleted = document.getElementById('count-completed');
const filterButtons = document.querySelectorAll('.filter-btn');

// View Switching & Statistics DOM Elements
const progressCard = document.getElementById('progress-card');
const tasksView = document.getElementById('tasks-view');
const statsView = document.getElementById('stats-view');
const backToTasksBtn = document.getElementById('back-to-tasks-btn');

const statCreatedToday = document.getElementById('stat-created-today');
const statCompletedToday = document.getElementById('stat-completed-today');
const statTodayRatio = document.getElementById('stat-today-ratio');
const statActiveCount = document.getElementById('stat-active-count');
const statActiveDesc = document.getElementById('stat-active-desc');
const statTotalCompleted = document.getElementById('stat-total-completed');
const statCompletionRate = document.getElementById('stat-completion-rate');
const statTotalTracked = document.getElementById('stat-total-tracked');
const statAvgVelocity = document.getElementById('stat-avg-velocity');
const statVelocityTotal = document.getElementById('stat-velocity-total');
const velocityChartBars = document.getElementById('velocity-chart-bars');
const chartInsightTitle = document.getElementById('chart-insight-title');
const chartInsightText = document.getElementById('chart-insight-text');

let isStatsViewOpen = false;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initDateDisplay();
  initTheme();
  setupEventListeners();
  fetchTodos();
});

// Format and display today's date
function initDateDisplay() {
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  const today = new Date();
  currentDateEl.textContent = today.toLocaleDateString(undefined, options);
}

// Theme handling (Light / Dark Mode)
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Event Listeners setup
function setupEventListeners() {
  themeToggleBtn.addEventListener('click', toggleTheme);

  todoForm.addEventListener('submit', handleAddTodo);

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      setFilter(filter);
    });
  });

  clearCompletedBtn.addEventListener('click', handleClearCompleted);

  // Statistics View Navigation
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

// Reset activity history
async function handleResetActivity() {
  const confirmed = confirm(
    'Are you sure you want to reset your activity and 7-day velocity logs? Your current task list will not be deleted.'
  );
  if (!confirmed) return;

  setSyncing(true);
  try {
    const response = await fetch('/api/stats/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

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

// View switching logic
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
  if (progressCard) {
    progressCard.focus();
  }
}

// Filter Handling
function setFilter(filter) {
  currentFilter = filter;
  filterButtons.forEach(btn => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  renderTodos();
}

// Toast notification
let toastTimeout;
function showToast(message) {
  clearTimeout(toastTimeout);
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2500);
}

// Network state indicator
function setSyncing(isSyncing) {
  syncStatus.textContent = isSyncing ? 'Syncing...' : 'All changes saved';
}

// Fetch all todos from the server
async function fetchTodos() {
  setSyncing(true);
  try {
    const response = await fetch('/api/todos');
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

// Add a new todo
async function handleAddTodo(e) {
  e.preventDefault();
  const title = todoInput.value.trim();
  if (!title) return;

  const tempId = 'temp-' + Date.now();
  const tempTodo = {
    id: tempId,
    title,
    completed: false,
    createdAt: new Date().toISOString()
  };

  // Optimistic UI update
  todos.unshift(tempTodo);
  todoInput.value = '';
  renderTodos();
  setSyncing(true);

  try {
    const response = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });

    if (!response.ok) throw new Error('Failed to create task');
    const createdTodo = await response.json();

    // Replace temporary task with server task
    const index = todos.findIndex(t => t.id === tempId);
    if (index !== -1) {
      todos[index] = createdTodo;
    }
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

// Toggle todo completion
async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  const originalState = todo.completed;
  todo.completed = !originalState;
  renderTodos();
  setSyncing(true);

  try {
    const response = await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: todo.completed })
    });

    if (!response.ok) throw new Error('Failed to update task');
    const updated = await response.json();
    todo.completed = updated.completed;
    renderTodos();
  } catch (error) {
    console.error('Error updating task:', error);
    todo.completed = originalState; // rollback
    renderTodos();
    showToast('Failed to update status');
  } finally {
    setSyncing(false);
  }
}

// Delete a single todo
async function deleteTodo(id) {
  const itemEl = document.querySelector(`[data-id="${id}"]`);
  if (itemEl) {
    itemEl.classList.add('removing');
  }

  setTimeout(async () => {
    const originalTodos = [...todos];
    todos = todos.filter(t => t.id !== id);
    renderTodos();
    setSyncing(true);

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete task');
      showToast('Task deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
      todos = originalTodos; // rollback
      renderTodos();
      showToast('Failed to delete task');
    } finally {
      setSyncing(false);
    }
  }, 200);
}

// Clear all completed todos
async function handleClearCompleted() {
  const completedCount = todos.filter(t => t.completed).length;
  if (completedCount === 0) return;

  const originalTodos = [...todos];
  todos = todos.filter(t => !t.completed);
  renderTodos();
  setSyncing(true);

  try {
    const response = await fetch('/api/todos', {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to clear completed tasks');
    showToast(`Cleared ${completedCount} completed task${completedCount > 1 ? 's' : ''}`);
  } catch (error) {
    console.error('Error clearing tasks:', error);
    todos = originalTodos; // rollback
    renderTodos();
    showToast('Failed to clear completed tasks');
  } finally {
    setSyncing(false);
  }
}

// Relative time helper
function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Update badges and progress indicators
function updateStats() {
  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const active = total - completed;

  countAll.textContent = total;
  countActive.textContent = active;
  countCompleted.textContent = completed;

  // Clear completed button visibility
  clearCompletedBtn.style.visibility = completed > 0 ? 'visible' : 'hidden';

  // Progress calculation
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  progressFill.style.width = `${percentage}%`;
  progressPercent.textContent = `${percentage}%`;
  progressText.textContent = `${completed} of ${total} tasks completed`;

  // Keep stats view synchronized if open
  if (isStatsViewOpen) {
    fetchStats();
  }
}

// Render todos based on current filter
function renderTodos() {
  updateStats();

  let filtered = todos;
  if (currentFilter === 'active') {
    filtered = todos.filter(t => !t.completed);
  } else if (currentFilter === 'completed') {
    filtered = todos.filter(t => t.completed);
  }

  // Clear list
  todoList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.hidden = false;
    todoList.hidden = true;
    return;
  }

  emptyState.hidden = true;
  todoList.hidden = false;

  filtered.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    li.dataset.id = todo.id;

    // Checkbox input & visual
    const checkboxLabel = document.createElement('label');
    checkboxLabel.className = 'custom-checkbox';
    checkboxLabel.setAttribute('aria-label', `Mark "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`);

    const checkboxInput = document.createElement('input');
    checkboxInput.type = 'checkbox';
    checkboxInput.className = 'checkbox-native';
    checkboxInput.checked = todo.completed;
    checkboxInput.addEventListener('change', () => toggleTodo(todo.id));

    const checkboxVisual = document.createElement('span');
    checkboxVisual.className = 'checkbox-visual';
    checkboxVisual.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;

    checkboxLabel.appendChild(checkboxInput);
    checkboxLabel.appendChild(checkboxVisual);

    // Left container (checkbox + text)
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

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-delete';
    deleteBtn.setAttribute('aria-label', `Delete task: "${todo.title}"`);
    deleteBtn.title = 'Delete task';
    deleteBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    `;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTodo(todo.id);
    });

    li.appendChild(leftContainer);
    li.appendChild(deleteBtn);
    todoList.appendChild(li);
  });
}

// Fetch Statistics from the backend
let cachedStats = null;
async function fetchStats() {
  try {
    const response = await fetch('/api/stats');
    if (!response.ok) throw new Error('Failed to fetch statistics');
    const data = await response.json();
    cachedStats = data;
    renderStats(data);
  } catch (error) {
    console.error('Error fetching statistics:', error);
  }
}

// Render Statistics overview & velocity chart
function renderStats(data) {
  if (!data || !data.overview) return;
  const { overview, last7Days } = data;

  // Overview metric cards
  if (statCreatedToday) statCreatedToday.textContent = overview.createdToday ?? 0;
  if (statCompletedToday) statCompletedToday.textContent = overview.completedToday ?? 0;
  if (statTodayRatio) {
    const count = overview.completedToday ?? 0;
    statTodayRatio.textContent = count === 1 ? '1 task completed today' : `${count} tasks completed today`;
  }
  if (statActiveCount) statActiveCount.textContent = overview.totalActive ?? 0;
  if (statActiveDesc) {
    const count = overview.totalActive ?? 0;
    statActiveDesc.textContent = count === 0 ? 'No pending tasks! All clear' : `${count} waiting for completion`;
  }
  if (statTotalCompleted) statTotalCompleted.textContent = overview.totalCompleted ?? 0;
  if (statCompletionRate) statCompletionRate.textContent = `${overview.completionRate ?? 0}% rate`;
  if (statTotalTracked) statTotalTracked.textContent = `${overview.totalAllTime ?? 0} total recorded`;
  if (statAvgVelocity) statAvgVelocity.textContent = (overview.avgDailyVelocity ?? 0).toFixed(1);
  if (statVelocityTotal) {
    const count = overview.totalLast7Completed ?? 0;
    statVelocityTotal.textContent = `${count} completed in past 7 days`;
  }

  // Render 7-Day Velocity Chart
  renderVelocityChart(last7Days || [], overview);
}

// Render Interactive 7-Day Dual Bar Chart
function renderVelocityChart(days, overview) {
  if (!velocityChartBars) return;
  velocityChartBars.innerHTML = '';

  if (!days || days.length === 0) {
    velocityChartBars.innerHTML = '<div class="empty-chart-note">No recent activity recorded</div>';
    return;
  }

  // Calculate highest count to scale the bars relative to chart height (min ceiling 4)
  const maxDayVal = Math.max(
    4,
    ...days.map(d => Math.max(d.created || 0, d.completed || 0))
  );

  days.forEach((day) => {
    const col = document.createElement('div');
    col.className = `chart-day-col ${day.isToday ? 'is-today' : ''}`;
    col.tabIndex = 0;
    col.setAttribute('role', 'group');
    col.setAttribute('aria-label', `${day.dayName}, ${day.fullDate}: ${day.created} created, ${day.completed} completed`);

    // Dual bars container
    const barsTrack = document.createElement('div');
    barsTrack.className = 'day-bars-track';

    // Created bar
    const createdHeightPercent = Math.min(100, Math.round(((day.created || 0) / maxDayVal) * 100));
    const createdBar = document.createElement('div');
    createdBar.className = 'chart-bar bar-created';
    createdBar.style.height = `${Math.max(6, createdHeightPercent)}%`;
    if (day.created > 0) {
      const valBadge = document.createElement('span');
      valBadge.className = 'bar-val-badge';
      valBadge.textContent = day.created;
      createdBar.appendChild(valBadge);
    }

    // Completed bar
    const completedHeightPercent = Math.min(100, Math.round(((day.completed || 0) / maxDayVal) * 100));
    const completedBar = document.createElement('div');
    completedBar.className = 'chart-bar bar-completed';
    completedBar.style.height = `${Math.max(6, completedHeightPercent)}%`;
    if (day.completed > 0) {
      const valBadge = document.createElement('span');
      valBadge.className = 'bar-val-badge';
      valBadge.textContent = day.completed;
      completedBar.appendChild(valBadge);
    }

    barsTrack.appendChild(createdBar);
    barsTrack.appendChild(completedBar);

    // Interactive Tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-header">${day.isToday ? 'Today' : day.dayName} • ${day.fullDate}</div>
      <div class="tooltip-row">
        <span class="tooltip-dot swatch-created"></span>
        <span>Created: <strong>${day.created}</strong></span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-dot swatch-completed"></span>
        <span>Completed: <strong>${day.completed}</strong></span>
      </div>
    `;

    // Day labels
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

  // Dynamic Productivity Insight Banner
  if (chartInsightTitle && chartInsightText) {
    const todayCompleted = overview.completedToday || 0;
    const avgVelocity = overview.avgDailyVelocity || 0;
    const activeTasks = overview.totalActive || 0;

    if (todayCompleted >= 3 || (todayCompleted > avgVelocity && todayCompleted >= 2)) {
      chartInsightTitle.textContent = "🔥 High Velocity Streak!";
      chartInsightText.textContent = `You've completed ${todayCompleted} tasks today, outperforming your 7-day average of ${avgVelocity} tasks/day. Keep up the tremendous momentum!`;
    } else if (todayCompleted > 0) {
      chartInsightTitle.textContent = "⚡ Steady Productivity";
      chartInsightText.textContent = `Great consistency! You completed ${todayCompleted} task${todayCompleted === 1 ? '' : 's'} today. You're averaging ${avgVelocity} completed tasks daily.`;
    } else if (activeTasks === 0 && overview.totalCompleted > 0) {
      chartInsightTitle.textContent = "🎉 Clear Workspace";
      chartInsightText.textContent = "All your tasks are completed! Enjoy your well-earned break or plan ahead for tomorrow.";
    } else {
      chartInsightTitle.textContent = "🎯 Daily Target Opportunity";
      chartInsightText.textContent = `You have ${activeTasks} pending task${activeTasks === 1 ? '' : 's'}. Complete a task now to build your daily velocity!`;
    }
  }
}
