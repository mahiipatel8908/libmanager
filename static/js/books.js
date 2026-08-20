/* =============================================================
   books.js — Book management: list, search/filter, add/edit/delete
   ============================================================= */

let deleteBookId = null;

function statusBadge(available, total) {
  if (available === 0) return `<span class="badge badge-danger"><span class="badge-dot"></span>Out of stock</span>`;
  if (available < total * 0.3) return `<span class="badge badge-warning"><span class="badge-dot"></span>Low stock</span>`;
  return `<span class="badge badge-success"><span class="badge-dot"></span>Available</span>`;
}

function bookInitials(title) {
  return title.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function renderBooksTable(books) {
  const tbody = document.getElementById('books-tbody');

  if (!books.length) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <h3>No books found</h3>
          <p>Try a different search, or add your first book to get started.</p>
          <button class="btn btn-primary" onclick="openAddBookModal()">Add Book</button>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = books.map((b, i) => `
    <tr class="row-in" style="--i:${i}">
      <td>
        <div class="flex items-center gap-12">
          <div style="width:38px;height:38px;border-radius:9px;background:${b.cover_color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;font-family:var(--font-display);">
            ${bookInitials(b.title)}
          </div>
          <div style="min-width:0;">
            <div style="font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;">${b.title}</div>
            <div class="text-muted" style="font-size:12px;">${b.author}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-info"><span class="badge-dot"></span>${b.category}</span></td>
      <td class="font-mono text-muted" style="font-size:12.5px;">${b.isbn || '—'}</td>
      <td>${b.available_copies} / ${b.total_copies}</td>
      <td>${statusBadge(b.available_copies, b.total_copies)}</td>
      <td style="text-align:right;">
        <div class="flex gap-8" style="justify-content:flex-end;">
          <button class="icon-btn" style="width:34px;height:34px;" data-tooltip="View" onclick='viewBook(${JSON.stringify(b)})'>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="icon-btn" style="width:34px;height:34px;" data-tooltip="Edit" onclick='openEditBookModal(${JSON.stringify(b)})'>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </button>
          <button class="icon-btn" style="width:34px;height:34px;" data-tooltip="Delete" onclick="confirmDeleteBook(${b.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function loadBooks() {
  const q = document.getElementById('book-search').value.trim();
  const category = document.getElementById('book-category-filter').value;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (category) params.set('category', category);

  fetch(`/api/books?${params}`)
    .then(r => r.json())
    .then(renderBooksTable);
}

// ---------- Add / Edit modal ----------
function openAddBookModal() {
  document.getElementById('book-modal-title').textContent = 'Add Book';
  document.getElementById('book-form').reset();
  document.getElementById('book-id').value = '';
  document.getElementById('book-form-error').style.display = 'none';
  openModal('book-modal');
}

function openEditBookModal(book) {
  document.getElementById('book-modal-title').textContent = 'Edit Book';
  document.getElementById('book-id').value = book.id;
  document.getElementById('book-title').value = book.title;
  document.getElementById('book-author').value = book.author;
  document.getElementById('book-category').value = book.category;
  document.getElementById('book-isbn').value = book.isbn || '';
  document.getElementById('book-publisher').value = book.publisher || '';
  document.getElementById('book-copies').value = book.total_copies;
  document.getElementById('book-form-error').style.display = 'none';
  openModal('book-modal');
}

function viewBook(book) {
  document.getElementById('view-book-body').innerHTML = `
    <div class="flex items-center gap-16" style="margin-bottom:20px;">
      <div style="width:56px;height:56px;border-radius:14px;background:${book.cover_color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;font-family:var(--font-display);">
        ${bookInitials(book.title)}
      </div>
      <div>
        <div style="font-weight:600;font-size:16px;">${book.title}</div>
        <div class="text-muted" style="font-size:13px;">${book.author}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:13.5px;">
      <div><div class="text-muted" style="font-size:11.5px;">CATEGORY</div><div style="margin-top:2px;">${book.category}</div></div>
      <div><div class="text-muted" style="font-size:11.5px;">ISBN</div><div class="font-mono" style="margin-top:2px;">${book.isbn || '—'}</div></div>
      <div><div class="text-muted" style="font-size:11.5px;">PUBLISHER</div><div style="margin-top:2px;">${book.publisher || '—'}</div></div>
      <div><div class="text-muted" style="font-size:11.5px;">COPIES</div><div style="margin-top:2px;">${book.available_copies} available / ${book.total_copies} total</div></div>
      <div><div class="text-muted" style="font-size:11.5px;">ADDED</div><div style="margin-top:2px;">${new Date(book.added_date).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric'})}</div></div>
    </div>
  `;
  openModal('view-book-modal');
}

document.getElementById('book-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const id = document.getElementById('book-id').value;
  const payload = {
    title: document.getElementById('book-title').value,
    author: document.getElementById('book-author').value,
    category: document.getElementById('book-category').value,
    isbn: document.getElementById('book-isbn').value,
    publisher: document.getElementById('book-publisher').value,
    total_copies: document.getElementById('book-copies').value,
  };

  const btn = document.getElementById('book-submit-btn');
  const errorBox = document.getElementById('book-form-error');
  errorBox.style.display = 'none';
  setBtnLoading(btn, true);

  const url = id ? `/api/books/edit/${id}` : '/api/books/add';
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(r => r.json().then(data => ({ ok: r.ok, data })))
    .then(({ ok, data }) => {
      setBtnLoading(btn, false);
      if (!ok) {
        errorBox.textContent = data.error || 'Something went wrong.';
        errorBox.style.display = 'flex';
        return;
      }
      closeModal('book-modal');
      showToast('success', id ? 'Book updated' : 'Book added', payload.title);
      loadBooks();
    })
    .catch(() => {
      setBtnLoading(btn, false);
      errorBox.textContent = 'Network error. Please try again.';
      errorBox.style.display = 'flex';
    });
});

function confirmDeleteBook(id) {
  deleteBookId = id;
  openModal('delete-book-modal');
}

document.getElementById('confirm-delete-book-btn').addEventListener('click', function () {
  if (!deleteBookId) return;
  const btn = this;
  setBtnLoading(btn, true);
  fetch(`/api/books/delete/${deleteBookId}`, { method: 'POST' })
    .then(r => r.json().then(data => ({ ok: r.ok, data })))
    .then(({ ok, data }) => {
      setBtnLoading(btn, false);
      closeModal('delete-book-modal');
      if (!ok) {
        showToast('error', 'Could not delete', data.error);
        return;
      }
      showToast('success', 'Book deleted');
      loadBooks();
    });
});

let bookSearchTimer;
document.getElementById('book-search').addEventListener('input', () => {
  clearTimeout(bookSearchTimer);
  bookSearchTimer = setTimeout(loadBooks, 300);
});
document.getElementById('book-category-filter').addEventListener('change', loadBooks);

document.addEventListener('DOMContentLoaded', loadBooks);
