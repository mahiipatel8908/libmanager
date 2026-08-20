-- ============================================
-- Library Management System - Database Schema
-- ============================================

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS settings;

-- Admin login accounts
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Books catalog
CREATE TABLE books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    category TEXT NOT NULL,
    isbn TEXT UNIQUE,
    publisher TEXT,
    total_copies INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    cover_color TEXT DEFAULT '#4F46E5',
    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student records
CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    course TEXT,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Issue / Return transactions
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE,
    status TEXT NOT NULL DEFAULT 'issued',   -- issued | returned | overdue
    fine_amount INTEGER DEFAULT 0,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Single-row app settings
CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    library_name TEXT DEFAULT 'My Library',
    borrow_period_days INTEGER DEFAULT 7,
    fine_per_day INTEGER DEFAULT 2,
    admin_display_name TEXT DEFAULT 'Admin'
);

-- Insert the one settings row that will always exist
INSERT INTO settings (id, library_name, borrow_period_days, fine_per_day, admin_display_name)
VALUES (1, 'My Library', 7, 2, 'Admin');
