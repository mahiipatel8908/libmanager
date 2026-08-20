/* =============================================================
   students.js — Student management: list, search, add/edit/delete
   ============================================================= */

let deleteStudentId = null;

function studentAvatarColor(name) {
  const colors = ['#4F46E5', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B'];
  return colors[name.length % colors.length];
}

function renderStudentsTable(students) {
  const tbody = document.getElementById('students-tbody');

  if (!students.length) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <h3>No students found</h3>
          <p>Try a different search, or register your first student.</p>
          <button class="btn btn-primary" onclick="openAddStudentModal()">Add Student</button>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = students.map((s, i) => `
    <tr class="row-in" style="--i:${i}">
      <td>
        <a href="/students/${s.id}" class="flex items-center gap-12" style="text-decoration:none;">
          <div class="avatar" style="background:${studentAvatarColor(s.name)};width:36px;height:36px;font-size:13px;">${s.name.charAt(0).toUpperCase()}</div>
          <div>
            <div style="font-weight:600;font-size:13.5px;color:var(--text-primary);">${s.name}</div>
            <div class="text-muted font-mono" style="font-size:11.5px;">${s.student_code}</div>
          </div>
        </a>
      </td>
      <td>
        <div style="font-size:13px;">${s.email}</div>
        <div class="text-muted" style="font-size:12px;">${s.phone || '—'}</div>
      </td>
      <td style="font-size:13.5px;">${s.course || '—'}</td>
      <td>
        ${s.active_issues > 0
          ? `<span class="badge badge-info"><span class="badge-dot"></span>${s.active_issues} book${s.active_issues > 1 ? 's' : ''}</span>`
          : `<span class="text-muted" style="font-size:13px;">None</span>`}
      </td>
      <td style="text-align:right;">
        <div class="flex gap-8" style="justify-content:flex-end;">
          <a href="/students/${s.id}" class="icon-btn" style="width:34px;height:34px;" data-tooltip="View Profile">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
          </a>
          <button class="icon-btn" style="width:34px;height:34px;" data-tooltip="Edit" onclick='openEditStudentModal(${JSON.stringify(s)})'>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </button>
          <button class="icon-btn" style="width:34px;height:34px;" data-tooltip="Delete" onclick="confirmDeleteStudent(${s.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function loadStudents() {
  const q = document.getElementById('student-search').value.trim();
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  fetch(`/api/students?${params}`).then(r => r.json()).then(renderStudentsTable);
}

function openAddStudentModal() {
  document.getElementById('student-modal-title').textContent = 'Add Student';
  document.getElementById('student-form').reset();
  document.getElementById('student-id').value = '';
  document.getElementById('student-form-error').style.display = 'none';
  openModal('student-modal');
}

function openEditStudentModal(s) {
  document.getElementById('student-modal-title').textContent = 'Edit Student';
  document.getElementById('student-id').value = s.id;
  document.getElementById('student-name').value = s.name;
  document.getElementById('student-email').value = s.email;
  document.getElementById('student-phone').value = s.phone || '';
  document.getElementById('student-course').value = s.course || '';
  document.getElementById('student-form-error').style.display = 'none';
  openModal('student-modal');
}

document.getElementById('student-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const id = document.getElementById('student-id').value;
  const payload = {
    name: document.getElementById('student-name').value,
    email: document.getElementById('student-email').value,
    phone: document.getElementById('student-phone').value,
    course: document.getElementById('student-course').value,
  };

  const btn = document.getElementById('student-submit-btn');
  const errorBox = document.getElementById('student-form-error');
  errorBox.style.display = 'none';
  setBtnLoading(btn, true);

  const url = id ? `/api/students/edit/${id}` : '/api/students/add';
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
      closeModal('student-modal');
      showToast('success', id ? 'Student updated' : 'Student added', payload.name);
      loadStudents();
    })
    .catch(() => {
      setBtnLoading(btn, false);
      errorBox.textContent = 'Network error. Please try again.';
      errorBox.style.display = 'flex';
    });
});

function confirmDeleteStudent(id) {
  deleteStudentId = id;
  openModal('delete-student-modal');
}

document.getElementById('confirm-delete-student-btn').addEventListener('click', function () {
  if (!deleteStudentId) return;
  const btn = this;
  setBtnLoading(btn, true);
  fetch(`/api/students/delete/${deleteStudentId}`, { method: 'POST' })
    .then(r => r.json().then(data => ({ ok: r.ok, data })))
    .then(({ ok, data }) => {
      setBtnLoading(btn, false);
      closeModal('delete-student-modal');
      if (!ok) {
        showToast('error', 'Could not delete', data.error);
        return;
      }
      showToast('success', 'Student deleted');
      loadStudents();
    });
});

let studentSearchTimer;
document.getElementById('student-search').addEventListener('input', () => {
  clearTimeout(studentSearchTimer);
  studentSearchTimer = setTimeout(loadStudents, 300);
});

document.addEventListener('DOMContentLoaded', loadStudents);
