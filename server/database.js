/**
 * ============================
 * server/database.js
 * Простое JSON-хранилище гостей.
 * Не требует Visual Studio, компиляции или внешних серверов.
 * Данные хранятся в файле guests.json рядом с проектом.
 * ============================
 */

const fs   = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const DB_FILE = path.join(
  __dirname,
  "../",
  process.env.DB_FILE || "uzatu_guests.json"
);

// =====================
// Чтение / Запись файла
// =====================

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = { guests: [], nextId: 1 };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Файлды оқу қатесі:", err.message);
    return { guests: [], nextId: 1 };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Файлға жазу қатесі:", err.message);
    throw err;
  }
}

// =====================
// API (имитирует SQL-запросы)
// =====================

const db = {

  /** Получить всех гостей */
  getAllGuests() {
    const data = readDB();
    return [...data.guests].sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  },

  /** Добавить гостя */
  addGuest({ name, guestCount, status, phone = null, note = null }) {
    const data = readDB();
    const newGuest = {
      id:         data.nextId++,
      name:       String(name).trim(),
      guestCount: parseInt(guestCount, 10) || 1,
      status:     status || "confirmed",
      phone:      phone || null,
      note:       note  || null,
      createdAt:  new Date().toISOString(),
    };
    data.guests.push(newGuest);
    writeDB(data);
    return newGuest;
  },

  /** Обновить гостя */
  updateGuest(id, updates) {
    const data = readDB();
    const idx = data.guests.findIndex(g => g.id === parseInt(id, 10));
    if (idx === -1) return null;

    data.guests[idx] = {
      ...data.guests[idx],
      name:       updates.name !== undefined ? String(updates.name).trim() : data.guests[idx].name,
      guestCount: updates.guestCount !== undefined ? parseInt(updates.guestCount, 10) : data.guests[idx].guestCount,
      status:     updates.status !== undefined ? updates.status : data.guests[idx].status,
      note:       updates.note !== undefined ? updates.note : data.guests[idx].note,
    };
    writeDB(data);
    return data.guests[idx];
  },

  /** Удалить гостя */
  deleteGuest(id) {
    const data = readDB();
    const before = data.guests.length;
    data.guests = data.guests.filter(g => g.id !== parseInt(id, 10));
    if (data.guests.length === before) return false;
    writeDB(data);
    return true;
  },

  /** Статистика */
  getStats() {
    const data = readDB();
    const confirmed = data.guests.filter(g => g.status === "confirmed");
    const declined  = data.guests.filter(g => g.status === "declined");
    return {
      total:          data.guests.length,
      confirmedCount: confirmed.length,
      declinedCount:  declined.length,
      totalPeople:    confirmed.reduce((s, g) => s + (g.guestCount || 1), 0),
    };
  },

  /** Количество подтверждённых людей (публичное) */
  getConfirmedCount() {
    const data = readDB();
    return data.guests
      .filter(g => g.status === "confirmed")
      .reduce((s, g) => s + (g.guestCount || 1), 0);
  },
};

// Инициализация при старте
function initDB() {
  readDB(); // создаст файл если нет
  console.log("✅ База данных (JSON):", DB_FILE);
}

module.exports = { db, initDB };
