# Library Management System

Premium, animated, full-stack Library Management System built with Flask and Firebase Authentication.
IT Diploma minor project.

## Status: Fully functional — all core features complete

Login/auth, dashboard with live charts, book & student CRUD, issue/return with
automatic due dates and fines, transaction history, reports with CSV export,
and settings — with Firebase Authentication for secure sign-in.

## Setup (VS Code / Terminal)

1. **Create a virtual environment**
   ```bash
   python -m venv venv
   ```

2. **Activate it**
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize the database** (first time only)
   ```bash
   python database.py
   ```
   Type `yes` when prompted.

5. **Configure Firebase Authentication**
   Enable the Email/Password provider in Firebase Console and create an account
   under Authentication → Users. The login page uses that account's email and password.

6. **Add sample data** (optional for local SQLite development)
   ```bash
   python seed.py
   ```
   Creates 8 sample books and 4 sample students.

7. **Run the app**
   ```bash
   python app.py
   ```

8. **Open in browser**
   ```
   http://127.0.0.1:5000
   ```
   You'll be redirected to the login page. Sign in with your Firebase email and password.

## Features

- 🔐 Firebase Email/Password authentication with Flask sessions
- 📊 Animated dashboard — live stat cards, doughnut/bar/line charts (Chart.js)
- 📚 Book management — add/edit/delete/search/filter, modal forms
- 👨‍🎓 Student management — full CRUD + individual profile pages with history
- 📖 Issue Book — student/book picker with live due-date preview
- ↩️ Return Book — automatic late-day and fine calculation (₹2/day default)
- 📋 Transaction history with status filters (All/Issued/Returned/Overdue)
- 📈 Reports page with category breakdown + CSV export
- ⚙️ Settings — library name, borrow period, fine rate, admin profile
- 🌗 Light/dark theme toggle (persists via localStorage)
- 🔍 Global search (Ctrl+K) across books and students
- 📱 Fully responsive — sidebar collapses to a mobile drawer

## Project Structure

```
app.py              Flask routes (auth, books, students, issue/return, reports...)
database.py         Local data connection helpers
schema.sql          Table definitions
seed.py             Optional sample-data script
templates/          Jinja2 templates (base.html = shared shell)
static/css/         Design system (style.css) + animations (animations.css)
static/js/          main.js (shared) + per-page JS (books.js, students.js, dashboard.js, charts.js)
```

## Common errors

| Error | Fix |
|---|---|
| `ModuleNotFoundError: No module named 'flask'` | Activate the venv, then `pip install -r requirements.txt` |
| Page loads unstyled | Hard refresh (Ctrl+Shift+R) |
| "Database is locked" | Close any other running instance of `app.py` first |
| Login fails | Enable Firebase Email/Password authentication and use an account created in Firebase Console |
