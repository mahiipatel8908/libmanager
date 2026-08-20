"""
database.py
------------
Small helper module that centralizes all SQLite connection logic.

Why this file exists:
- Keeps app.py clean (no raw sqlite3 boilerplate scattered everywhere)
- Ensures every connection returns rows that behave like dictionaries
  (row['title'] instead of row[1]) which makes templates much easier to read
- Gives us ONE place to initialize the database
"""

import sqlite3
import os

# Path to the actual .db file on disk. Stored inside instance/ which is the
# Flask convention for files that shouldn't be part of your source code.
DB_PATH = os.path.join(os.path.dirname(__file__), "instance", "library.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def get_db_connection():
    """
    Opens a new connection to the SQLite database.
    row_factory = sqlite3.Row lets us access columns by name, e.g. row['title']
    instead of by numeric index, e.g. row[2] — much less error-prone.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Enforce foreign key constraints (SQLite has them OFF by default!)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """
    Creates the database file and all tables from schema.sql.
    Run this once (via `python database.py`) or automatically on first run.
    WARNING: schema.sql starts with DROP TABLE statements, so re-running
    this wipes existing data. Only run it when you want a fresh database.
    """
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db_connection()
    with open(SCHEMA_PATH, "r") as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")


def db_exists():
    """Check if the database file has already been created."""
    return os.path.exists(DB_PATH)


def query_db(query, args=(), one=False):
    """Run a SELECT query and return list of rows (or single row if one=True)."""
    conn = get_db_connection()
    cur = conn.execute(query, args)
    rows = cur.fetchall()
    conn.close()
    return (rows[0] if rows else None) if one else rows


def execute_db(query, args=()):
    """Run an INSERT/UPDATE/DELETE query, commit, and return the new row id.
    Always closes the connection, even on error, so a failed write (e.g. a
    UNIQUE constraint violation) can never leak an open transaction that
    would corrupt or block later queries.
    """
    conn = get_db_connection()
    try:
        cur = conn.execute(query, args)
        conn.commit()
        return cur.lastrowid
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    # Allows running: python database.py   -> to (re)initialize the DB manually
    confirm = input(
        "This will ERASE and recreate the database. Type 'yes' to continue: "
    )
    if confirm.strip().lower() == "yes":
        init_db()
    else:
        print("Cancelled.")
