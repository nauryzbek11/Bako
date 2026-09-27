/**
 * ============================
 * server/routes/auth.js
 * API авторизации:
 *   POST /api/auth/guest-list  — проверка пароля для списка гостей
 *   POST /api/auth/admin       — вход в административную панель
 * ============================
 */

const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

// =====================
// POST /api/auth/guest-list
// Проверка пароля для просмотра списка гостей
// =====================
router.post("/guest-list", (req, res) => {
  const { password } = req.body;

  if (!password || typeof password !== "string") {
    return res.status(400).json({ success: false, message: "Құпия сөз қажет" });
  }

  const correct = process.env.GUEST_LIST_PASSWORD;

  if (!correct) {
    console.error("GUEST_LIST_PASSWORD .env файлында орнатылмаған!");
    return res.status(500).json({ success: false, message: "Сервер қатесі" });
  }

  if (password !== correct) {
    return res.status(401).json({ success: false, message: "Қате құпия сөз" });
  }

  // Выдаём JWT токен с ролью "guest-viewer"
  const token = jwt.sign(
    { role: "guest-viewer" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
  );

  return res.json({ success: true, token });
});

// =====================
// POST /api/auth/admin
// Вход в административную панель
// =====================
router.post("/admin", (req, res) => {
  const { password } = req.body;

  if (!password || typeof password !== "string") {
    return res.status(400).json({ success: false, message: "Құпия сөз қажет" });
  }

  const correct = process.env.ADMIN_PASSWORD;

  if (!correct) {
    console.error("ADMIN_PASSWORD .env файлында орнатылмаған!");
    return res.status(500).json({ success: false, message: "Сервер қатесі" });
  }

  if (password !== correct) {
    return res.status(401).json({ success: false, message: "Қате құпия сөз" });
  }

  // Выдаём JWT токен с ролью "admin"
  const token = jwt.sign(
    { role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
  );

  return res.json({ success: true, token });
});

module.exports = router;
