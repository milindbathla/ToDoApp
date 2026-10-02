import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Public configuration endpoint for frontend auth initialization
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: supabaseUrl || '',
    supabaseAnonKey: supabaseAnonKey || '',
    isConfigured: Boolean(supabaseUrl && supabaseAnonKey)
  });
});

// Authentication Middleware: verifies Supabase JWT token and scopes client
async function requireAuth(req, res, next) {
  if (!supabase) {
    return res.status(503).json({ 
      error: 'Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY.' 
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    }

    req.user = user;
    req.userId = user.id;

    // Create an authenticated Supabase client using the user's JWT to enforce Row Level Security
    req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    next();
  } catch (err) {
    console.error('Authentication verification error:', err);
    return res.status(401).json({ error: 'Authentication failed.' });
  }
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

// ==========================================
// User Profile Routes
// ==========================================
app.get('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .maybeSingle();

    if (error) {
      console.warn('Profile fetch error, falling back to auth metadata:', error.message);
    }

    res.json({
      id: req.user.id,
      email: req.user.email,
      name: data?.name || req.user.user_metadata?.name || req.user.email?.split('@')[0] || 'User',
      createdAt: data?.created_at || req.user.created_at
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// ==========================================
// Task API Routes (Isolated by Authenticated User)
// ==========================================

// GET /api/todos - Get active tasks for current authenticated user
app.get('/api/todos', requireAuth, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', req.userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = (data || []).map(t => ({
      id: t.id,
      title: t.title,
      completed: t.completed,
      createdAt: t.created_at,
      completedAt: t.completed_at,
      updatedAt: t.updated_at
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error retrieving tasks:', err);
    res.status(500).json({ error: 'Failed to retrieve tasks' });
  }
});

// POST /api/todos - Create task for current authenticated user
app.post('/api/todos', requireAuth, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const trimmed = title.trim();
    if (trimmed.length > 200) {
      return res.status(400).json({ error: 'Task title must be under 200 characters' });
    }

    const { data, error } = await req.supabase
      .from('tasks')
      .insert({
        user_id: req.userId,
        title: trimmed,
        completed: false
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.id,
      title: data.title,
      completed: data.completed,
      createdAt: data.created_at,
      completedAt: data.completed_at,
      updatedAt: data.updated_at
    });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/todos/:id - Update task for current authenticated user
app.patch('/api/todos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { completed, title } = req.body;

    const updatePayload = {
      updated_at: new Date().toISOString()
    };

    if (typeof completed === 'boolean') {
      updatePayload.completed = completed;
      updatePayload.completed_at = completed ? new Date().toISOString() : null;
    }

    if (typeof title === 'string' && title.trim()) {
      updatePayload.title = title.trim();
    }

    const { data, error } = await req.supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      id: data.id,
      title: data.title,
      completed: data.completed,
      createdAt: data.created_at,
      completedAt: data.completed_at,
      updatedAt: data.updated_at
    });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/todos/:id - Delete task for current authenticated user
app.delete('/api/todos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if task exists and if it is completed
    const { data: target, error: fetchErr } = await req.supabase
      .from('tasks')
      .select('id, completed, completed_at')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (fetchErr || !target) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (target.completed) {
      // Soft-delete completed task so velocity & completion history stay preserved
      const { error: updateErr } = await req.supabase
        .from('tasks')
        .update({
          deleted_at: new Date().toISOString(),
          completed_at: target.completed_at || new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', req.userId);

      if (updateErr) throw updateErr;
    } else {
      // Hard delete active pending task
      const { error: deleteErr } = await req.supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', req.userId);

      if (deleteErr) throw deleteErr;
    }

    res.json({ success: true, id });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// DELETE /api/todos - Clear completed tasks for current authenticated user
app.delete('/api/todos', requireAuth, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', req.userId)
      .eq('completed', true)
      .is('deleted_at', null)
      .select('id');

    if (error) throw error;

    res.json({ success: true, removedCount: (data || []).length });
  } catch (err) {
    console.error('Error clearing completed tasks:', err);
    res.status(500).json({ error: 'Failed to clear completed tasks' });
  }
});

// GET /api/stats - Compute velocity and summary metrics for current authenticated user
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', req.userId);

    if (error) throw error;
    const allTasks = data || [];

    const activeTasks = allTasks.filter(t => !t.completed && !t.deleted_at);
    const allCompletedTasks = allTasks.filter(t => t.completed);

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

      const createdCount = allTasks.filter(t => toLocalDateString(t.created_at) === dateStr).length;
      const completedCount = allCompletedTasks.filter(t => {
        if (!t.completed_at) return false;
        return toLocalDateString(t.completed_at) === dateStr;
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

// POST /api/stats/reset - Reset historical activity and velocity for current authenticated user
app.post('/api/stats/reset', requireAuth, async (req, res) => {
  try {
    // Delete soft-deleted history tasks permanently for this user
    await req.supabase
      .from('tasks')
      .delete()
      .eq('user_id', req.userId)
      .not('deleted_at', 'is', null);

    // Reset completed_at and completed status on remaining tasks to provide a clean baseline
    await req.supabase
      .from('tasks')
      .update({ completed_at: null, completed: false })
      .eq('user_id', req.userId);

    res.json({ success: true, message: 'Activity history reset successfully' });
  } catch (err) {
    console.error('Error resetting statistics:', err);
    res.status(500).json({ error: 'Failed to reset activity history' });
  }
});

// Export app for serverless platforms (e.g. Vercel)
export default app;

// Start Server locally if not running as a serverless function
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}
