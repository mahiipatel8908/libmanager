"""
seed.py
-------
Optional script to populate the database with:
- a handful of sample books and students

This is REAL data written into SQLite (not hardcoded UI) — it just exists
so your dashboard/tables aren't empty while you develop and demo.

Run it with:
    python seed.py

Safe to run multiple times — it checks before inserting duplicates.
"""

import database


def seed_books(conn):
    count = conn.execute("SELECT COUNT(*) AS c FROM books").fetchone()["c"]
    if count > 0:
        print(f"{count} books already exist — skipping book seed.")
        return

    books = [
        ("Python Basics", "John Zelle", "Programming", "9781590282755", "Franklin Beedle", 5, 5, "#4F46E5"),
        ("Database Systems", "Ramez Elmasri", "Database", "9780133970777", "Pearson", 4, 4, "#7C3AED"),
        ("Computer Networking", "James Kurose", "Networking", "9780133594140", "Pearson", 3, 3, "#0EA5E9"),
        ("Learning Web Development", "Jennifer Robbins", "Web Development", "9781491960202", "O'Reilly", 6, 6, "#10B981"),
        ("Clean Code", "Robert C. Martin", "Programming", "9780132350884", "Prentice Hall", 4, 4, "#F59E0B"),
        ("Operating System Concepts", "Abraham Silberschatz", "Systems", "9781118063330", "Wiley", 3, 3, "#EF4444"),
        ("Data Structures & Algorithms", "Narasimha Karumanchi", "Programming", "9788193245279", "CareerMonk", 5, 5, "#4F46E5"),
        ("Artificial Intelligence: A Modern Approach", "Stuart Russell", "AI", "9780134610993", "Pearson", 2, 2, "#7C3AED"),
    ]
    conn.executemany(
        """INSERT INTO books
           (title, author, category, isbn, publisher, total_copies, available_copies, cover_color)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        books
    )
    print(f"Inserted {len(books)} sample books.")


def seed_students(conn):
    count = conn.execute("SELECT COUNT(*) AS c FROM students").fetchone()["c"]
    if count > 0:
        print(f"{count} students already exist — skipping student seed.")
        return

    students = [
        ("STU001", "Rahul Patel", "rahul.patel@example.com", "9876543210", "IT Diploma"),
        ("STU002", "Priya Sharma", "priya.sharma@example.com", "9876543211", "CS Diploma"),
        ("STU003", "Aman Verma", "aman.verma@example.com", "9876543212", "IT Diploma"),
        ("STU004", "Sneha Joshi", "sneha.joshi@example.com", "9876543213", "Electronics Diploma"),
    ]
    conn.executemany(
        """INSERT INTO students (student_code, name, email, phone, course)
           VALUES (?, ?, ?, ?, ?)""",
        students
    )
    print(f"Inserted {len(students)} sample students.")


if __name__ == "__main__":
    if not database.db_exists():
        print("No database found — creating it first...")
        database.init_db()

    conn = database.get_db_connection()
    seed_books(conn)
    seed_students(conn)
    conn.commit()
    conn.close()
    print("\nSeeding complete.")
