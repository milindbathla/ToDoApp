# 📝 ToDoApp

A clean and minimalist task management application designed to help you organize daily tasks, track completion, and monitor your productivity over time.

🔗 **Live Demo:** [ToDoApp](https://todo-app-eta-three-47.vercel.app/)

## ✨ Features

- **Add Tasks** — Quickly create new tasks from the main interface.
- **Complete Tasks** — Mark tasks as completed and keep track of your progress.
- **Task Filtering** — Switch between:
  - All tasks
  - Active tasks
  - Completed tasks
- **Daily Progress** — View how many tasks have been completed today.
- **Productivity Statistics** — Track created, completed, and active tasks.
- **Task Velocity** — Visualize task creation and completion trends over the last 7 days.
- **Velocity Insights** — Get a quick overview of your productivity pattern.
- **Persistent Task Data** — Task and history data are maintained by the application's backend.
- **Keyboard Support** — Press `Enter` to quickly add a task.
- **Responsive Interface** — Designed for a clean and focused task-management experience.

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js / Express
- **Data Storage:** JSON-based data files
- **Deployment:** Vercel

## 📁 Project Structure

```text
ToDoApp/
├── api/
├── data/
├── public/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── package.json
├── package-lock.json
├── server.js
├── vercel.json
└── .gitignore
```

## 🚀 Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/milindbathla/ToDoApp.git
cd ToDoApp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the application

```bash
npm start
```

If the project does not define a `start` script, run:

```bash
node server.js
```

### 4. Open the application

Visit:

```text
http://localhost:3000
```

The exact local port may depend on the configuration in `server.js`.

## 📊 Productivity Dashboard

The application provides a productivity-focused dashboard showing:

- Tasks created today
- Tasks completed today
- Current active workload
- All-time completed tasks
- Daily task velocity
- Seven-day task creation and completion trends

This allows the application to function as more than a basic checklist by providing a quick view of daily productivity.

## 🌐 Live Application

Try the application here:

[**Open ToDoApp**](https://todo-app-eta-three-47.vercel.app/)

## 🔮 Future Improvements

Potential future improvements include:

- User authentication
- Multiple task lists/projects
- Categories and tags
- Task priorities
- Due dates and reminders
- Cloud database integration
- Cross-device synchronization
- Dark/light theme customization

## 👨‍💻 Author

**Milind Bathla**

GitHub: [@milindbathla](https://github.com/milindbathla)

---

⭐ If you find this project useful, consider giving the repository a star.
