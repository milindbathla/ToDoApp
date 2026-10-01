import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// On serverless environments (e.g. Vercel), deployment bundle is read-only.
// Use os.tmpdir() on Vercel for writable runtime storage, seeded from bundled data.
const isVercel = !!process.env.VERCEL;
const BUNDLED_DATA_DIR = path.join(__dirname, 'data');
const DATA_DIR = isVercel ? path.join(os.tmpdir(), 'todo-app-data') : BUNDLED_DATA_DIR;
const DATA_FILE = path.join(DATA_DIR, 'todos.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data storage directory and files exist
async function initDataStore() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Initialize todos.json if missing in DATA_DIR
    try {
      await fs.access(DATA_FILE);
    } catch {
      let initialTodos = null;
      for (const base of [process.cwd(), __dirname]) {
        try {
          const raw = await fs.readFile(path.join(base, 'data', 'todos.json'), 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            initialTodos = parsed;
            break;
          }
        } catch {}
      }

      if (!initialTodos) {
        initialTodos = [
          {
            id: crypto.randomUUID(),
            title: "Welcome! Click the circle to complete this task",
            completed: false,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            completedAt: null
          },
          {
            id: crypto.randomUUID(),
            title: "Try deleting a task with the trash button",
            completed: true,
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            completedAt: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: crypto.randomUUID(),
            title: "Add a new task using the input above",
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null
          }
        ];
      }
      await fs.writeFile(DATA_FILE, JSON.stringify(initialTodos, null, 2), 'utf-8');
    }

    // Initialize history.json with starter 7-day velocity data if missing
    try {
      await fs.access(HISTORY_FILE);
    } catch {
      let starterHistory = null;
      for (const base of [process.cwd(), __dirname]) {
        try {
          const raw = await fs.readFile(path.join(base, 'data', 'history.json'), 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            starterHistory = parsed;
            break;
          }
        } catch {}
      }

      if (!starterHistory) {
        const now = Date.now();
        const oneDayMs = 86400000;
        starterHistory = [
          {
            id: crypto.randomUUID(),
          title: "Setup project structure & environment",
          completed: true,
          createdAt: new Date(now - 6 * oneDayMs - 14400000).toISOString(),
          completedAt: new Date(now - 6 * oneDayMs).toISOString()
        },
        {
          id: crypto.randomUUID(),
          title: "Install essential dev dependencies",
          completed: true,
          createdAt: new Date(now - 6 * oneDayMs - 7200000).toISOString(),
          completedAt: new Date(now - 6 * oneDayMs).toISOString()
        },
        {
          id: crypto.randomUUID(),
          title: "Draft system architecture & API design",
          completed: true,
          createdAt: new Date(now - 5 * oneDayMs - 18000000).toISOString(),
          completedAt: new Date(now - 5 * oneDayMs).toISOString()
        },
        {
          id: crypto.randomUUID(),
          title: "Configure ESLint & code style standards",
          completed: true,
          createdAt: new Date(now - 5 * oneDayMs - 10800000).toISOString(),
          completedAt: new Date(now - 5 * oneDayMs).toISOString()
        },
        {
          id: crypto.randomUUID(),
          title: "Review UI accessibility guidelines",
          completed: true,
          createdAt: new Date(now - 5 * oneDayMs - 3600000).toISOString(),
          completedAt: new Date(now - 5 * oneDayMs).toISOString()
        },
        {
          id: crypto.randomUUID(),
          title: "Prepare database schemas & storage layer",
          completed: true,
          createdAt: new Date(now - 4 * oneDayMs - 14400000).toISOString(),
          completedAt: new Date(now - 4 * oneDayMs).toISOString()
        },
        {
          id: crypto.randomUUID(),
          title: "Implement responsive layout for mobile screens",
          completed: true,
          createdAt: new Date(now - 3 * oneDayMs - 21600000).toISOString(),
          completedAt: new Date(now - 3 * oneDayMs).toISOString()
        },
        {
          id: crypto.randomUUID(),
          title: "Add dark / light theme switcher",
          completed: true,
          createdAt: new Date(now - 3 * oneDayMs - 14400000).toISOString(),
          completedAt: new Date(now - 3 * oneDayMs).toISOString()
        },
        {
          id: crypto.randomUUID(),
          title: "Optimize SVG icons and micro-interactions",
          completed: true,
          createdAt: new Date(now - 3 * oneDayMs - 7200000).toISOString(),
          completedAt: new Date(now - 3 * oneDayMs).toISOString()
        },
        {
          id: crypto.randomUUID(),
          title: "Test keyboard shortcuts and accessibility labels",
          completed: true,
          createdAt: new Date(now - 3 * oneDayMs - 3600000).toISOString(),
          completedAt: new Date(now - 3 * oneDayMs).toISOString()
        },
        {
          id: crypto.randomUUID(),
          title: "Refactor client-side state management",
          completed: true,
          createdAt: new Date(now - 2 * oneDayMs - 14400000).toISOString(),
          completedAt: new Date(now - 2 * oneDayMs).toISOString()
        },
        {
          id: crypto.randomUUID(),
          title: "Fix glassmorphism blur across browsers",
          completed: true,
          createdAt: new Date(now - 2 * oneDayMs - 7200000).toISOString(),
          completedAt: new Date(now - 2 * oneDayMs).toISOString()
        },
        {
          id: crypto.randomUUID(),
          title: "Implement optimistic UI updates",
          completed: true,
          createdAt: new Date(now - 1 * oneDayMs - 18000000).toISOString(),
          completedAt: new Date(now - 1 * oneDayMs).toISOString()
        },
        {
          id: crypto.randomUUID(),
          title: "Benchmark API latency under load",
          completed: true,
          createdAt: new Date(now - 1 * oneDayMs - 10800000).toISOString(),
          completedAt: new Date(now - 1 * oneDayMs).toISOString()
        },
        {
          id: crypto.randomUUID(),
          title: "Initial app launch readiness checklist",
          completed: true,
          createdAt: new Date(now - 1 * oneDayMs - 3600000).toISOString(),
          completedAt: new Date(now - 1 * oneDayMs).toISOString()
        }
      ];
      await fs.writeFile(HISTORY_FILE, JSON.stringify(starterHistory, null, 2), 'utf-8');
    }
  }
  } catch (err) {
    console.error('Error initializing data store:', err);
  }
}

// Helper to read todos
async function getTodos() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    console.error('Failed to read todos:', err);
    return [];
  }
}

// Helper to write todos
async function saveTodos(todos) {
  await fs.writeFile(DATA_FILE, JSON.stringify(todos, null, 2), 'utf-8');
}

// Helper to read history
async function getHistory() {
  try {
    const raw = await fs.readFile(HISTORY_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    console.error('Failed to read history:', err);
    return [];
  }
}

// Helper to write history
async function saveHistory(history) {
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

// Format Date to YYYY-MM-DD local format
function toLocalDateString(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// API Routes

// GET /api/todos - Get all active/current todos
app.get('/api/todos', async (req, res) => {
  try {
    const todos = await getTodos();
    res.json(todos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve tasks' });
  }
});

// GET /api/stats - Compute and return 7-day velocity and summary metrics
app.get('/api/stats', async (req, res) => {
  try {
    const [todos, history] = await Promise.all([getTodos(), getHistory()]);

    // Consolidate all tasks for analytics
    const completedTasksMap = new Map();
    // Add history items
    history.forEach(item => {
      if (item && item.id) {
        completedTasksMap.set(item.id, item);
      }
    });
    // Add completed todos (latest state overrides)
    todos.forEach(item => {
      if (item.completed) {
        completedTasksMap.set(item.id, item);
      }
    });

    const allCompletedTasks = Array.from(completedTasksMap.values());
    const activeTasks = todos.filter(t => !t.completed);

    // Build unique task pool for creation tracking
    const allKnownTasksMap = new Map();
    history.forEach(t => allKnownTasksMap.set(t.id, t));
    todos.forEach(t => allKnownTasksMap.set(t.id, t));
    const allKnownTasks = Array.from(allKnownTasksMap.values());

    // Generate last 7 days (Day -6 to Today)
    const today = new Date();
    const todayStr = toLocalDateString(today);

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = toLocalDateString(d);
      const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Created on this calendar day
      const createdCount = allKnownTasks.filter(t => toLocalDateString(t.createdAt) === dateStr).length;

      // Completed on this calendar day
      const completedCount = allCompletedTasks.filter(t => {
        if (!t.completedAt) return false;
        return toLocalDateString(t.completedAt) === dateStr;
      }).length;

      last7Days.push({
        date: dateStr,
        dayName,
        fullDate,
        created: createdCount,
        completed: completedCount,
        isToday: i === 0
      });
    }

    // Summary Calculations
    const createdToday = last7Days[last7Days.length - 1].created;
    const completedToday = last7Days[last7Days.length - 1].completed;
    const totalActive = activeTasks.length;
    const totalCompleted = allCompletedTasks.length;
    const totalAllTime = totalActive + totalCompleted;
    const completionRate = totalAllTime > 0 ? Math.round((totalCompleted / totalAllTime) * 100) : 0;

    const totalLast7Completed = last7Days.reduce((acc, curr) => acc + curr.completed, 0);
    const avgDailyVelocity = parseFloat((totalLast7Completed / 7).toFixed(1));

    res.json({
      overview: {
        totalActive,
        totalCompleted,
        totalAllTime,
        completionRate,
        createdToday,
        completedToday,
        avgDailyVelocity,
        totalLast7Completed
      },
      last7Days
    });
  } catch (err) {
    console.error('Error computing statistics:', err);
    res.status(500).json({ error: 'Failed to compute statistics' });
  }
});

// POST /api/stats/reset - Reset historical activity and velocity logs
app.post('/api/stats/reset', async (req, res) => {
  try {
    // Clear historical log
    await saveHistory([]);

    // Reset completedAt on current todos to give a clean baseline
    const todos = await getTodos();
    const updated = todos.map(t => ({
      ...t,
      completedAt: null
    }));
    await saveTodos(updated);

    res.json({ success: true, message: 'Activity history reset successfully' });
  } catch (err) {
    console.error('Error resetting statistics:', err);
    res.status(500).json({ error: 'Failed to reset activity history' });
  }
});

// POST /api/todos - Create a new todo
app.post('/api/todos', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const trimmed = title.trim();
    if (trimmed.length > 200) {
      return res.status(400).json({ error: 'Task title must be under 200 characters' });
    }

    const newTodo = {
      id: crypto.randomUUID(),
      title: trimmed,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    const todos = await getTodos();
    todos.unshift(newTodo); // Add to the top of the list
    await saveTodos(todos);

    res.status(201).json(newTodo);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/todos/:id - Update todo status or title
app.patch('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed, title } = req.body;

    const todos = await getTodos();
    const index = todos.findIndex(t => t.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (typeof completed === 'boolean') {
      todos[index].completed = completed;
      if (completed) {
        todos[index].completedAt = new Date().toISOString();
        // Record in history log
        const history = await getHistory();
        const existingHistIndex = history.findIndex(h => h.id === id);
        if (existingHistIndex !== -1) {
          history[existingHistIndex] = { ...todos[index] };
        } else {
          history.push({ ...todos[index] });
        }
        await saveHistory(history);
      } else {
        todos[index].completedAt = null;
        // Remove from completed history
        const history = await getHistory();
        const updatedHistory = history.filter(h => h.id !== id);
        await saveHistory(updatedHistory);
      }
    }

    if (typeof title === 'string' && title.trim()) {
      todos[index].title = title.trim();
    }

    todos[index].updatedAt = new Date().toISOString();
    await saveTodos(todos);

    res.json(todos[index]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/todos/:id - Delete a single todo
app.delete('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const todos = await getTodos();
    const target = todos.find(t => t.id === id);

    if (!target) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // If task was completed, ensure its record stays preserved in history
    if (target.completed) {
      const history = await getHistory();
      if (!history.some(h => h.id === id)) {
        history.push({
          ...target,
          completedAt: target.completedAt || new Date().toISOString()
        });
        await saveHistory(history);
      }
    }

    const filtered = todos.filter(t => t.id !== id);
    await saveTodos(filtered);

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// DELETE /api/todos - Clear completed todos
app.delete('/api/todos', async (req, res) => {
  try {
    const todos = await getTodos();
    const completedTodos = todos.filter(t => t.completed);
    const remaining = todos.filter(t => !t.completed);

    if (completedTodos.length > 0) {
      const history = await getHistory();
      completedTodos.forEach(item => {
        if (!history.some(h => h.id === item.id)) {
          history.push({
            ...item,
            completedAt: item.completedAt || new Date().toISOString()
          });
        }
      });
      await saveHistory(history);
    }

    await saveTodos(remaining);
    res.json({ success: true, removedCount: completedTodos.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear completed tasks' });
  }
});

// Export app for serverless platforms (e.g. Vercel)
export default app;

// Start Server locally if not running as a serverless function
if (!process.env.VERCEL) {
  initDataStore().then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  });
} else {
  // On Vercel, initialize data store on cold start
  await initDataStore();
}
