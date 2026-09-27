/**
 * ============================
 * admin/admin.js
 * Логика административной панели
 * ============================
 */

"use strict";

// =====================
// STATE
// =====================
let adminToken = null;
let allGuests = [];
let sortField = "id";
let sortDir = "asc";
let editingId = null;

// =====================
// УТИЛИТЫ
// =====================
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch { return isoStr; }
}

// =====================
// TOAST
// =====================
let toastTimer = null;

function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = msg;
  toast.className = `toast ${type} visible`;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 3000);
}

// =====================
// АВТОРИЗАЦИЯ
// =====================
async function login() {
  const pwInput = document.getElementById("admin-password");
  const errorEl = document.getElementById("login-error");
  const password = pwInput ? pwInput.value.trim() : "";

  if (!password) return;

  errorEl.textContent = "";

  const btn = document.getElementById("login-btn");
  btn.textContent = "Жүктелуде...";
  btn.disabled = true;

  try {
    const res = await fetch("/api/auth/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (data.success && data.token) {
      adminToken = data.token;
      sessionStorage.setItem("adminToken", adminToken);
      showAdminPanel();
      loadGuests();
    } else {
      errorEl.textContent = data.message || "Қате пароль";
      if (pwInput) { pwInput.value = ""; pwInput.focus(); }
    }
  } catch (err) {
    errorEl.textContent = "Сервер қатесі. Сервер іске қосылғанын тексеріңіз.";
  } finally {
    btn.textContent = "Войти";
    btn.disabled = false;
  }
}

function logout() {
  adminToken = null;
  sessionStorage.removeItem("adminToken");
  allGuests = [];
  showLoginPage();
}

function showAdminPanel() {
  document.getElementById("login-page").style.display = "none";
  const adminPage = document.getElementById("admin-page");
  adminPage.style.display = "block";
  adminPage.classList.add("active");
}

function showLoginPage() {
  document.getElementById("admin-page").style.display = "none";
  document.getElementById("admin-page").classList.remove("active");
  document.getElementById("login-page").style.display = "flex";
}

// =====================
// ЗАГРУЗКА ДАННЫХ
// =====================
async function loadGuests() {
  if (!adminToken) return;

  try {
    const res = await fetch("/api/guests/admin", {
      headers: { "Authorization": `Bearer ${adminToken}` },
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    allGuests = data.guests;
    updateStats(data.stats);
    renderTable();
  } catch (err) {
    showToast("Жүктеу қатесі: " + err.message, "error");
  }
}

function updateStats(stats) {
  if (!stats) return;
  setText("stat-total", stats.total || 0);
  setText("stat-confirmed", stats.confirmedCount || 0);
  setText("stat-declined", stats.declinedCount || 0);
  setText("stat-people", stats.totalPeople || 0);
}

// =====================
// РЕНДЕР ТАБЛИЦЫ
// =====================
function renderTable() {
  const search = document.getElementById("search-input")?.value.toLowerCase() || "";
  const filterStatus = document.getElementById("filter-status")?.value || "all";

  // Фильтрация
  let filtered = allGuests.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search);
    const matchStatus = filterStatus === "all" || g.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Сортировка
  filtered.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();

    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // Счётчик
  setText("table-count", `${filtered.length} жазба`);

  // Тело таблицы
  const tbody = document.getElementById("admin-table-body");
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Қонақтар табылмады</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(g => `
    <tr data-id="${g.id}">
      <td>${g.id}</td>
      <td>${escapeHtml(g.name)}</td>
      <td>${g.guestCount}</td>
      <td>
        <span class="badge badge-${g.status}">
          ${g.status === "confirmed" ? "Қатысады" : "Қатыспайды"}
        </span>
      </td>
      <td style="white-space:nowrap">${formatDate(g.createdAt)}</td>
      <td>
        <div class="action-btns">
          <button
            class="btn-edit"
            data-id="${g.id}"
            title="Өзгерту"
            aria-label="${escapeHtml(g.name)} өзгерту"
          >✎</button>
          <button
            class="btn-delete"
            data-id="${g.id}"
            title="Жою"
            aria-label="${escapeHtml(g.name)} жою"
          >✕</button>
        </div>
      </td>
    </tr>
  `).join("");

  // Навешиваем события на кнопки
  tbody.querySelectorAll(".btn-edit").forEach(btn => {
    btn.addEventListener("click", () => openEditModal(parseInt(btn.dataset.id)));
  });

  tbody.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", () => deleteGuest(parseInt(btn.dataset.id)));
  });
}

// =====================
// СОРТИРОВКА
// =====================
function initSorting() {
  document.querySelectorAll(".admin-table th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
      const field = th.dataset.sort;

      if (sortField === field) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortField = field;
        sortDir = "asc";
      }

      // Обновляем иконки
      document.querySelectorAll(".admin-table th").forEach(t => {
        t.classList.remove("sorted");
        const icon = t.querySelector(".sort-icon");
        if (icon) icon.textContent = "↕";
      });

      th.classList.add("sorted");
      const sortIcon = th.querySelector(".sort-icon");
      if (sortIcon) sortIcon.textContent = sortDir === "asc" ? "↑" : "↓";

      renderTable();
    });
  });
}

// =====================
// УДАЛЕНИЕ
// =====================
async function deleteGuest(id) {
  const guest = allGuests.find(g => g.id === id);
  if (!guest) return;

  if (!confirm(`«${guest.name}» қонағын жойғыңыз келе ме?`)) return;

  try {
    const res = await fetch(`/api/guests/admin/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${adminToken}` },
    });

    const data = await res.json();

    if (data.success) {
      allGuests = allGuests.filter(g => g.id !== id);
      renderTable();
      showToast("Қонақ жойылды");
      // Обновляем статистику
      loadGuests();
    } else {
      showToast(data.message || "Қате", "error");
    }
  } catch (err) {
    showToast("Қате: " + err.message, "error");
  }
}

// =====================
// РЕДАКТИРОВАНИЕ
// =====================
function openEditModal(id) {
  const guest = allGuests.find(g => g.id === id);
  if (!guest) return;

  editingId = id;

  const nameEl = document.getElementById("edit-name");
  const countEl = document.getElementById("edit-count");
  const statusEl = document.getElementById("edit-status");
  const noteEl = document.getElementById("edit-note");

  if (nameEl) nameEl.value = guest.name;
  if (countEl) countEl.value = guest.guestCount;
  if (statusEl) statusEl.value = guest.status;
  if (noteEl) noteEl.value = guest.note || "";

  const modal = document.getElementById("edit-modal");
  if (modal) {
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
  }

  setTimeout(() => { if (nameEl) nameEl.focus(); }, 100);
}

function closeEditModal() {
  editingId = null;
  const modal = document.getElementById("edit-modal");
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }
}

async function saveEdit() {
  if (!editingId) return;

  const name = document.getElementById("edit-name")?.value.trim();
  const guestCount = parseInt(document.getElementById("edit-count")?.value, 10);
  const status = document.getElementById("edit-status")?.value;
  const note = document.getElementById("edit-note")?.value.trim();

  if (!name || name.length < 2) {
    showToast("Ат дұрыс емес", "error");
    return;
  }

  if (isNaN(guestCount) || guestCount < 1) {
    showToast("Адам саны дұрыс емес", "error");
    return;
  }

  try {
    const res = await fetch(`/api/guests/admin/${editingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name, guestCount, status, note }),
    });

    const data = await res.json();

    if (data.success) {
      closeEditModal();
      showToast("Сақталды");
      loadGuests();
    } else {
      showToast(data.message || "Қате", "error");
    }
  } catch (err) {
    showToast("Қате: " + err.message, "error");
  }
}

// =====================
// ИНИЦИАЛИЗАЦИЯ
// =====================
document.addEventListener("DOMContentLoaded", () => {

  // Проверяем сохранённый токен
  const savedToken = sessionStorage.getItem("adminToken");
  if (savedToken) {
    adminToken = savedToken;
    showAdminPanel();
    loadGuests();
  }

  // Вход
  const loginBtn = document.getElementById("login-btn");
  const pwInput = document.getElementById("admin-password");

  if (loginBtn) loginBtn.addEventListener("click", login);
  if (pwInput) pwInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });

  // Выход
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // Поиск и фильтр
  const searchInput = document.getElementById("search-input");
  const filterStatus = document.getElementById("filter-status");
  const refreshBtn = document.getElementById("refresh-btn");

  if (searchInput) searchInput.addEventListener("input", () => renderTable());
  if (filterStatus) filterStatus.addEventListener("change", () => renderTable());
  if (refreshBtn) refreshBtn.addEventListener("click", () => {
    loadGuests();
    showToast("Жаңартылды");
  });

  // Сортировка
  initSorting();

  // Модал редактирования
  const editSave = document.getElementById("edit-save");
  const editCancel = document.getElementById("edit-cancel");
  const editModal = document.getElementById("edit-modal");

  if (editSave) editSave.addEventListener("click", saveEdit);
  if (editCancel) editCancel.addEventListener("click", closeEditModal);
  if (editModal) editModal.addEventListener("click", (e) => {
    if (e.target === editModal) closeEditModal();
  });

  // Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeEditModal();
  });
});
