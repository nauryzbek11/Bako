/**
 * ============================
 * server/server.js
 * Точка входа Express.js сервера.
 * Запуск: node server/server.js
 * ============================
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");

// Инициализируем БД при старте
const { initDB } = require("./database");
initDB();

// Роуты
const guestsRouter = require("./routes/guests");
const authRouter = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================
// Middleware
// =====================

// CORS — разрешаем запросы с того же сервера
app.use(cors({
  origin: [`http://localhost:${PORT}`, "http://127.0.0.1:" + PORT],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Парсим JSON тело запросов
app.use(express.json({ limit: "10kb" }));

// Ограничение запросов (против спама)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100,                  // максимум 100 запросов с одного IP
  message: { success: false, message: "Тым көп сұраныс. Кейінірек қайталаңыз." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Жёсткий лимит для RSVP формы (против спама)
const rsvpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 5,                    // 5 отправок в час с одного IP
  message: { success: false, message: "Сіз тым көп жіберіңіз. Бір сағаттан кейін қайталаңыз." },
});

app.use("/api", limiter);
app.use("/api/guests/rsvp", rsvpLimiter);

// =====================
// API маршруты
// =====================
app.use("/api/guests", guestsRouter);
app.use("/api/auth", authRouter);

// =====================
// Статические файлы (фронтенд)
// =====================
const FRONTEND_PATH = path.join(__dirname, "..");
app.use(express.static(FRONTEND_PATH));

// Отдаём index.html для всех остальных маршрутов
app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "admin", "admin.html"));
});

// 404 для API
app.use("/api/*", (req, res) => {
  res.status(404).json({ success: false, message: "Маршрут табылмады" });
});

// =====================
// Запуск сервера
// =====================
app.listen(PORT, () => {
  console.log("\n🎉 Ұзату тойы — Сервер запущен!");
  console.log(`🌐 Сайт: http://localhost:${PORT}`);
  console.log(`⚙️  Админка: http://localhost:${PORT}/admin`);
  console.log(`📊 API: http://localhost:${PORT}/api/guests/count`);
  console.log("\nДля остановки нажми Ctrl+C\n");
});

module.exports = app;
