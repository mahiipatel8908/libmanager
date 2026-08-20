"""
app.py — Library Management System
Full application: auth, dashboard, books, students, issue/return, transactions,
reports, settings. All data is real, stored in and read from SQLite.
"""

import csv
import io
from datetime import date, datetime, timedelta
from functools import wraps

from flask import (
    Flask, render_template, request, redirect, url_for,
    session, jsonify, Response
)
from werkzeug.security import generate_password_hash, check_password_hash

import database

app = Flask(__name__)
app.config["SECRET_KEY"] = "dev-secret-key-change-this-later"

if not database.db_exists():
    print("No database found — creating a new one...")
    database.init_db()
else:
    print("Database found — using existing data.")

CATEGORIES = [
    "Programming", "Database", "Networking", "Web Development",
    "AI", "Systems", "Mathematics", "Electronics", "General"
]


# =================================================================
# HELPERS
# =================================================================
def get_settings():
    return database.query_db("SELECT * FROM settings WHERE id = 1", one=True)


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"error": "unauthorized"}), 401
            return redirect(url_for("login", next=request.path))
        return f(*args, **kwargs)
    return wrapper


def base_context(active_page):
    s = get_settings()
    return {
        "active_page": active_page,
        "library_name": s["library_name"],
        "admin_name": session.get("full_name", s["admin_display_name"]),
        "admin_initial": (session.get("full_name") or s["admin_display_name"])[0].upper(),
        "borrow_period_days": s["borrow_period_days"],
        "fine_per_day": s["fine_per_day"],
    }


def recompute_status(txn_row):
    """Return 'overdue' for display if issued and past due date, else actual status."""
    if txn_row["status"] == "issued" and txn_row["due_date"] < date.today().isoformat():
        return "overdue"
    return txn_row["status"]


# =================================================================
# AUTH
# =================================================================
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        if "user_id" in session:
            return redirect(url_for("dashboard"))
        return render_template("login.html")

    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")
    user = database.query_db("SELECT * FROM users WHERE username = ?", (username,), one=True)

    if not user or not check_password_hash(user["password_hash"], password):
        return render_template("login.html", error="Invalid username or password."), 401

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    session["full_name"] = user["full_name"]
    if request.form.get("remember"):
        session.permanent = True

    next_url = request.args.get("next") or url_for("dashboard")
    return redirect(next_url)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# =================================================================
# DASHBOARD
# =================================================================
@app.route("/")
@login_required
def dashboard():
    ctx = base_context("dashboard")
    return render_template("dashboard.html", **ctx)


@app.route("/api/stats")
@login_required
def api_stats():
    total_books = database.query_db("SELECT COALESCE(SUM(total_copies),0) c FROM books", one=True)["c"]
    available_books = database.query_db("SELECT COALESCE(SUM(available_copies),0) c FROM books", one=True)["c"]
    issued_books = total_books - available_books
    total_students = database.query_db("SELECT COUNT(*) c FROM students", one=True)["c"]
    overdue_books = database.query_db(
        "SELECT COUNT(*) c FROM transactions WHERE status='issued' AND due_date < ?",
        (date.today().isoformat(),), one=True
    )["c"]
    total_fine = database.query_db(
        "SELECT COALESCE(SUM(fine_amount),0) c FROM transactions", one=True
    )["c"]

    monthly = database.query_db("""
        SELECT strftime('%Y-%m', issue_date) as month, COUNT(*) as issued_count
        FROM transactions
        WHERE issue_date >= date('now', '-6 months')
        GROUP BY month ORDER BY month
    """)
    monthly_returned = database.query_db("""
        SELECT strftime('%Y-%m', return_date) as month, COUNT(*) as returned_count
        FROM transactions
        WHERE return_date IS NOT NULL AND return_date >= date('now', '-6 months')
        GROUP BY month ORDER BY month
    """)
    months = sorted(set([r["month"] for r in monthly] + [r["month"] for r in monthly_returned]))
    issued_map = {r["month"]: r["issued_count"] for r in monthly}
    returned_map = {r["month"]: r["returned_count"] for r in monthly_returned}

    categories = database.query_db("""
        SELECT b.category, COUNT(*) as cnt
        FROM transactions t JOIN books b ON t.book_id = b.id
        GROUP BY b.category ORDER BY cnt DESC LIMIT 6
    """)

    recent = database.query_db("""
        SELECT t.id, t.status, t.issue_date, t.return_date, s.name as student_name,
               b.title as book_title
        FROM transactions t
        JOIN students s ON t.student_id = s.id
        JOIN books b ON t.book_id = b.id
        ORDER BY t.id DESC LIMIT 8
    """)
    activity = []
    for r in recent:
        if r["return_date"]:
            activity.append({"type": "return", "text": f'{r["student_name"]} returned "{r["book_title"]}"', "date": r["return_date"]})
        else:
            activity.append({"type": "issue", "text": f'{r["student_name"]} issued "{r["book_title"]}"', "date": r["issue_date"]})

    new_students = database.query_db("""
        SELECT name, registration_date FROM students ORDER BY id DESC LIMIT 3
    """)
    for ns in new_students:
        activity.append({"type": "student", "text": f'{ns["name"]} registered as a new student', "date": ns["registration_date"][:10]})

    activity = sorted(activity, key=lambda a: a["date"], reverse=True)[:8]

    return jsonify({
        "total_books": total_books,
        "available_books": available_books,
        "issued_books": issued_books,
        "total_students": total_students,
        "overdue_books": overdue_books,
        "total_fine": total_fine,
        "books_overview": {"available": available_books, "issued": issued_books},
        "monthly": {
            "labels": months,
            "issued": [issued_map.get(m, 0) for m in months],
            "returned": [returned_map.get(m, 0) for m in months],
        },
        "categories": {
            "labels": [c["category"] for c in categories],
            "counts": [c["cnt"] for c in categories],
        },
        "activity": activity,
    })


# =================================================================
# BOOKS
# =================================================================
@app.route("/books")
@login_required
def books():
    ctx = base_context("books")
    ctx["categories"] = CATEGORIES
    return render_template("books.html", **ctx)


@app.route("/api/books")
@login_required
def api_books_list():
    search = request.args.get("q", "").strip()
    category = request.args.get("category", "").strip()
    query = "SELECT * FROM books WHERE 1=1"
    args = []
    if search:
        query += " AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)"
        args += [f"%{search}%", f"%{search}%", f"%{search}%"]
    if category:
        query += " AND category = ?"
        args.append(category)
    query += " ORDER BY added_date DESC"
    rows = database.query_db(query, args)
    return jsonify([dict(r) for r in rows])


@app.route("/api/books/add", methods=["POST"])
@login_required
def api_books_add():
    data = request.get_json()
    title = (data.get("title") or "").strip()
    author = (data.get("author") or "").strip()
    category = (data.get("category") or "").strip()
    isbn = (data.get("isbn") or "").strip()
    publisher = (data.get("publisher") or "").strip()
    try:
        total_copies = int(data.get("total_copies", 1))
    except (TypeError, ValueError):
        return jsonify({"error": "Total copies must be a number."}), 400

    if not title or not author or not category or total_copies < 1:
        return jsonify({"error": "Please fill in all required fields correctly."}), 400

    colors = ["#4F46E5", "#7C3AED", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444"]
    color = colors[hash(title) % len(colors)]

    try:
        new_id = database.execute_db(
            """INSERT INTO books (title, author, category, isbn, publisher, total_copies, available_copies, cover_color)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (title, author, category, isbn or None, publisher, total_copies, total_copies, color)
        )
    except Exception as e:
        return jsonify({"error": "That ISBN already exists." if "UNIQUE" in str(e) else "Could not save book."}), 400

    return jsonify({"success": True, "id": new_id})


@app.route("/api/books/edit/<int:book_id>", methods=["POST"])
@login_required
def api_books_edit(book_id):
    data = request.get_json()
    book = database.query_db("SELECT * FROM books WHERE id = ?", (book_id,), one=True)
    if not book:
        return jsonify({"error": "Book not found."}), 404

    title = (data.get("title") or book["title"]).strip()
    author = (data.get("author") or book["author"]).strip()
    category = (data.get("category") or book["category"]).strip()
    isbn = (data.get("isbn") or "").strip() or book["isbn"]
    publisher = (data.get("publisher") or "").strip()
    try:
        total_copies = int(data.get("total_copies", book["total_copies"]))
    except (TypeError, ValueError):
        return jsonify({"error": "Total copies must be a number."}), 400

    issued_count = book["total_copies"] - book["available_copies"]
    if total_copies < issued_count:
        return jsonify({"error": f"Cannot set total below {issued_count} (currently issued copies)."}), 400

    new_available = total_copies - issued_count

    try:
        database.execute_db(
            """UPDATE books SET title=?, author=?, category=?, isbn=?, publisher=?,
               total_copies=?, available_copies=? WHERE id=?""",
            (title, author, category, isbn, publisher, total_copies, new_available, book_id)
        )
    except Exception:
        return jsonify({"error": "That ISBN already exists on another book."}), 400

    return jsonify({"success": True})


@app.route("/api/books/delete/<int:book_id>", methods=["POST"])
@login_required
def api_books_delete(book_id):
    active = database.query_db(
        "SELECT COUNT(*) c FROM transactions WHERE book_id=? AND status='issued'",
        (book_id,), one=True
    )["c"]
    if active > 0:
        return jsonify({"error": "Cannot delete — this book has copies currently issued."}), 400
    database.execute_db("DELETE FROM books WHERE id = ?", (book_id,))
    return jsonify({"success": True})


# =================================================================
# STUDENTS
# =================================================================
@app.route("/students")
@login_required
def students():
    ctx = base_context("students")
    return render_template("students.html", **ctx)


@app.route("/students/<int:student_id>")
@login_required
def student_profile(student_id):
    student = database.query_db("SELECT * FROM students WHERE id = ?", (student_id,), one=True)
    if not student:
        return render_template("404.html", **base_context("students")), 404

    history = database.query_db("""
        SELECT t.*, b.title as book_title, b.author as book_author
        FROM transactions t JOIN books b ON t.book_id = b.id
        WHERE t.student_id = ? ORDER BY t.id DESC
    """, (student_id,))

    history_display = []
    for h in history:
        h = dict(h)
        h["display_status"] = recompute_status(h)
        history_display.append(h)

    issued_count = sum(1 for h in history_display if h["display_status"] in ("issued", "overdue"))
    returned_count = sum(1 for h in history_display if h["display_status"] == "returned")
    total_fine = sum(h["fine_amount"] or 0 for h in history_display)

    ctx = base_context("students")
    ctx.update({
        "student": student,
        "history": history_display,
        "issued_count": issued_count,
        "returned_count": returned_count,
        "total_fine": total_fine,
    })
    return render_template("student_profile.html", **ctx)


@app.route("/api/students")
@login_required
def api_students_list():
    search = request.args.get("q", "").strip()
    query = "SELECT * FROM students WHERE 1=1"
    args = []
    if search:
        query += " AND (name LIKE ? OR email LIKE ? OR student_code LIKE ? OR course LIKE ?)"
        args += [f"%{search}%"] * 4
    query += " ORDER BY registration_date DESC"
    rows = database.query_db(query, args)
    result = []
    for r in rows:
        r = dict(r)
        active = database.query_db(
            "SELECT COUNT(*) c FROM transactions WHERE student_id=? AND status='issued'",
            (r["id"],), one=True
        )["c"]
        r["active_issues"] = active
        result.append(r)
    return jsonify(result)


@app.route("/api/students/add", methods=["POST"])
@login_required
def api_students_add():
    data = request.get_json()
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()
    course = (data.get("course") or "").strip()

    if not name or not email:
        return jsonify({"error": "Name and email are required."}), 400

    last = database.query_db("SELECT student_code FROM students ORDER BY id DESC LIMIT 1", one=True)
    if last and last["student_code"].startswith("STU"):
        next_num = int(last["student_code"][3:]) + 1
    else:
        next_num = 1
    student_code = f"STU{next_num:03d}"

    try:
        new_id = database.execute_db(
            "INSERT INTO students (student_code, name, email, phone, course) VALUES (?, ?, ?, ?, ?)",
            (student_code, name, email, phone, course)
        )
    except Exception:
        return jsonify({"error": "A student with that email already exists."}), 400

    return jsonify({"success": True, "id": new_id, "student_code": student_code})


@app.route("/api/students/edit/<int:student_id>", methods=["POST"])
@login_required
def api_students_edit(student_id):
    data = request.get_json()
    student = database.query_db("SELECT * FROM students WHERE id = ?", (student_id,), one=True)
    if not student:
        return jsonify({"error": "Student not found."}), 404

    name = (data.get("name") or student["name"]).strip()
    email = (data.get("email") or student["email"]).strip()
    phone = (data.get("phone") or "").strip()
    course = (data.get("course") or "").strip()

    try:
        database.execute_db(
            "UPDATE students SET name=?, email=?, phone=?, course=? WHERE id=?",
            (name, email, phone, course, student_id)
        )
    except Exception:
        return jsonify({"error": "A student with that email already exists."}), 400

    return jsonify({"success": True})


@app.route("/api/students/delete/<int:student_id>", methods=["POST"])
@login_required
def api_students_delete(student_id):
    active = database.query_db(
        "SELECT COUNT(*) c FROM transactions WHERE student_id=? AND status='issued'",
        (student_id,), one=True
    )["c"]
    if active > 0:
        return jsonify({"error": "Cannot delete — this student has books currently issued."}), 400
    database.execute_db("DELETE FROM students WHERE id = ?", (student_id,))
    return jsonify({"success": True})


# =================================================================
# ISSUE BOOK
# =================================================================
@app.route("/issue")
@login_required
def issue_book_page():
    ctx = base_context("issue")
    ctx["students"] = database.query_db("SELECT id, name, student_code FROM students ORDER BY name")
    ctx["books"] = database.query_db("SELECT id, title, author, available_copies FROM books WHERE available_copies > 0 ORDER BY title")
    return render_template("issue_book.html", **ctx)


@app.route("/api/issue", methods=["POST"])
@login_required
def api_issue_book():
    data = request.get_json()
    try:
        student_id = int(data.get("student_id"))
        book_id = int(data.get("book_id"))
    except (TypeError, ValueError):
        return jsonify({"error": "Select a student and a book."}), 400

    student = database.query_db("SELECT * FROM students WHERE id=?", (student_id,), one=True)
    book = database.query_db("SELECT * FROM books WHERE id=?", (book_id,), one=True)
    if not student or not book:
        return jsonify({"error": "Student or book not found."}), 404
    if book["available_copies"] < 1:
        return jsonify({"error": "No copies available for this book."}), 400

    settings = get_settings()
    issue_date = date.today()
    due_date = issue_date + timedelta(days=settings["borrow_period_days"])

    database.execute_db(
        "INSERT INTO transactions (student_id, book_id, issue_date, due_date, status) VALUES (?, ?, ?, ?, 'issued')",
        (student_id, book_id, issue_date.isoformat(), due_date.isoformat())
    )
    database.execute_db("UPDATE books SET available_copies = available_copies - 1 WHERE id = ?", (book_id,))

    return jsonify({
        "success": True,
        "student_name": student["name"],
        "book_title": book["title"],
        "issue_date": issue_date.strftime("%d %b %Y"),
        "due_date": due_date.strftime("%d %b %Y"),
    })


# =================================================================
# RETURN BOOK
# =================================================================
@app.route("/return")
@login_required
def return_book_page():
    ctx = base_context("return")
    active = database.query_db("""
        SELECT t.id, t.due_date, t.issue_date, s.name as student_name, s.student_code,
               b.title as book_title, b.id as book_id
        FROM transactions t
        JOIN students s ON t.student_id = s.id
        JOIN books b ON t.book_id = b.id
        WHERE t.status = 'issued'
        ORDER BY t.due_date ASC
    """)
    ctx["active_issues"] = active
    return render_template("return_book.html", **ctx)


@app.route("/api/return", methods=["POST"])
@login_required
def api_return_book():
    data = request.get_json()
    try:
        txn_id = int(data.get("transaction_id"))
    except (TypeError, ValueError):
        return jsonify({"error": "Select a book to return."}), 400

    txn = database.query_db("SELECT * FROM transactions WHERE id=?", (txn_id,), one=True)
    if not txn or txn["status"] != "issued":
        return jsonify({"error": "This transaction is not currently issued."}), 400

    settings = get_settings()
    return_date = date.today()
    due_date = datetime.strptime(txn["due_date"], "%Y-%m-%d").date()
    late_days = max(0, (return_date - due_date).days)
    fine = late_days * settings["fine_per_day"]

    database.execute_db(
        "UPDATE transactions SET return_date=?, status='returned', fine_amount=? WHERE id=?",
        (return_date.isoformat(), fine, txn_id)
    )
    database.execute_db("UPDATE books SET available_copies = available_copies + 1 WHERE id = ?", (txn["book_id"],))

    return jsonify({"success": True, "late_days": late_days, "fine": fine})


# =================================================================
# TRANSACTIONS
# =================================================================
@app.route("/transactions")
@login_required
def transactions():
    ctx = base_context("transactions")
    return render_template("transactions.html", **ctx)


@app.route("/api/transactions")
@login_required
def api_transactions_list():
    status_filter = request.args.get("status", "all")
    rows = database.query_db("""
        SELECT t.*, s.name as student_name, s.student_code, b.title as book_title
        FROM transactions t
        JOIN students s ON t.student_id = s.id
        JOIN books b ON t.book_id = b.id
        ORDER BY t.id DESC
    """)
    result = []
    for r in rows:
        r = dict(r)
        r["display_status"] = recompute_status(r)
        if status_filter != "all" and r["display_status"] != status_filter:
            continue
        result.append(r)
    return jsonify(result)


# =================================================================
# REPORTS
# =================================================================
@app.route("/reports")
@login_required
def reports():
    ctx = base_context("reports")
    total_books = database.query_db("SELECT COALESCE(SUM(total_copies),0) c FROM books", one=True)["c"]
    available = database.query_db("SELECT COALESCE(SUM(available_copies),0) c FROM books", one=True)["c"]
    total_students = database.query_db("SELECT COUNT(*) c FROM students", one=True)["c"]
    total_txns = database.query_db("SELECT COUNT(*) c FROM transactions", one=True)["c"]
    returned = database.query_db("SELECT COUNT(*) c FROM transactions WHERE status='returned'", one=True)["c"]
    overdue = database.query_db(
        "SELECT COUNT(*) c FROM transactions WHERE status='issued' AND due_date < ?",
        (date.today().isoformat(),), one=True
    )["c"]
    total_fine = database.query_db("SELECT COALESCE(SUM(fine_amount),0) c FROM transactions", one=True)["c"]

    category_stats = database.query_db("""
        SELECT category, COUNT(*) as book_count FROM books GROUP BY category ORDER BY book_count DESC
    """)

    ctx.update({
        "total_books": total_books,
        "available_books": available,
        "issued_books": total_books - available,
        "total_students": total_students,
        "total_transactions": total_txns,
        "returned_count": returned,
        "overdue_count": overdue,
        "total_fine": total_fine,
        "category_stats": category_stats,
    })
    return render_template("reports.html", **ctx)


@app.route("/reports/export")
@login_required
def reports_export():
    rows = database.query_db("""
        SELECT t.id, s.student_code, s.name as student_name, b.title as book_title,
               t.issue_date, t.due_date, t.return_date, t.status, t.fine_amount
        FROM transactions t
        JOIN students s ON t.student_id = s.id
        JOIN books b ON t.book_id = b.id
        ORDER BY t.id DESC
    """)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Transaction ID", "Student Code", "Student Name", "Book Title",
                      "Issue Date", "Due Date", "Return Date", "Status", "Fine (Rs)"])
    for r in rows:
        writer.writerow([r["id"], r["student_code"], r["student_name"], r["book_title"],
                          r["issue_date"], r["due_date"], r["return_date"] or "", r["status"], r["fine_amount"]])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=library_report.csv"}
    )


# =================================================================
# SETTINGS
# =================================================================
@app.route("/settings", methods=["GET", "POST"])
@login_required
def settings_page():
    if request.method == "POST":
        library_name = request.form.get("library_name", "").strip() or "My Library"
        try:
            borrow_period = int(request.form.get("borrow_period_days", 7))
            fine_per_day = int(request.form.get("fine_per_day", 2))
        except ValueError:
            borrow_period, fine_per_day = 7, 2
        admin_display_name = request.form.get("admin_display_name", "").strip() or "Admin"

        database.execute_db(
            """UPDATE settings SET library_name=?, borrow_period_days=?, fine_per_day=?, admin_display_name=?
               WHERE id=1""",
            (library_name, borrow_period, fine_per_day, admin_display_name)
        )

        new_password = request.form.get("new_password", "").strip()
        if new_password:
            database.execute_db(
                "UPDATE users SET password_hash=? WHERE id=?",
                (generate_password_hash(new_password), session["user_id"])
            )

        return redirect(url_for("settings_page", saved=1))

    ctx = base_context("settings")
    ctx["saved"] = request.args.get("saved") == "1"
    return render_template("settings.html", **ctx)


# =================================================================
# GLOBAL SEARCH
# =================================================================
@app.route("/api/search")
@login_required
def api_search():
    q = request.args.get("q", "").strip()
    if len(q) < 1:
        return jsonify({"books": [], "students": []})

    books_r = database.query_db(
        "SELECT id, title, author FROM books WHERE title LIKE ? OR author LIKE ? LIMIT 5",
        (f"%{q}%", f"%{q}%")
    )
    students_r = database.query_db(
        "SELECT id, name, student_code FROM students WHERE name LIKE ? OR student_code LIKE ? LIMIT 5",
        (f"%{q}%", f"%{q}%")
    )
    return jsonify({
        "books": [dict(b) for b in books_r],
        "students": [dict(s) for s in students_r],
    })


# =================================================================
# ERROR HANDLERS
# =================================================================
@app.errorhandler(404)
def not_found(e):
    if "user_id" in session:
        return render_template("404.html", **base_context("")), 404
    return render_template("404.html", active_page="", library_name="LibraryOS", admin_initial="A"), 404


if __name__ == "__main__":
    app.run(debug=True)
