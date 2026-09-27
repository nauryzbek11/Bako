/**
 * ============================
 * server/routes/guests.js
 * API для работы с гостями.
 * ============================
 */

const express = require("express");
const router  = express.Router();
const { db }  = require("../database");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// =====================
// GET /api/guests/count
// Публичный — количество подтверждённых людей
// =====================
router.get("/count", (req, res) => {
  try {
    const count = db.getConfirmedCount();
    return res.json({ success: true, count });
  } catch (err) {
    console.error("count error:", err);
    return res.status(500).json({ success: false, message: "Сервер қатесі" });
  }
});

// =====================
// POST /api/guests/rsvp
// Публичный — отправка RSVP формы
// =====================
router.post("/rsvp", (req, res) => {
  try {
    const { name, guestCount, status } = req.body;

    // Валидация
    if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: "Атыңызды дұрыс енгізіңіз (2–100 таңба)",
      });
    }

    const count = parseInt(guestCount, 10);
    if (isNaN(count) || count < 1 || count > 10) {
      return res.status(400).json({
        success: false,
        message: "Қонақ саны 1–10 аралығында болуы тиіс",
      });
    }

    if (!["confirmed", "declined"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Статус дұрыс емес",
      });
    }

    const guest = db.addGuest({ name: name.trim(), guestCount: count, status });

    return res.json({
      success: true,
      message: "Рақмет! Сіздің жауабыңыз қабылданды.",
      id: guest.id,
    });
  } catch (err) {
    console.error("rsvp error:", err);
    return res.status(500).json({ success: false, message: "Сервер қатесі" });
  }
});

// =====================
// GET /api/guests/list
// Список гостей (требует JWT)
// =====================
router.get("/list", requireAuth, (req, res) => {
  try {
    const guests = db.getAllGuests();
    return res.json({ success: true, guests });
  } catch (err) {
    console.error("list error:", err);
    return res.status(500).json({ success: false, message: "Сервер қатесі" });
  }
});

// =====================
// GET /api/guests/admin
// Полный список + статистика (только admin)
// =====================
router.get("/admin", requireAuth, requireAdmin, (req, res) => {
  try {
    const guests = db.getAllGuests();
    const stats  = db.getStats();
    return res.json({ success: true, guests, stats });
  } catch (err) {
    console.error("admin guests error:", err);
    return res.status(500).json({ success: false, message: "Сервер қатесі" });
  }
});

// =====================
// PUT /api/guests/admin/:id
// Обновить гостя (только admin)
// =====================
router.put("/admin/:id", requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { name, guestCount, status, note } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Ат дұрыс емес" });
    }

    const count = parseInt(guestCount, 10);
    if (isNaN(count) || count < 1 || count > 50) {
      return res.status(400).json({ success: false, message: "Адам саны дұрыс емес" });
    }

    if (!["confirmed", "declined"].includes(status)) {
      return res.status(400).json({ success: false, message: "Статус дұрыс емес" });
    }

    const updated = db.updateGuest(id, {
      name: name.trim(),
      guestCount: count,
      status,
      note: note || null,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Қонақ табылмады" });
    }

    return res.json({ success: true, message: "Жаңартылды" });
  } catch (err) {
    console.error("update guest error:", err);
    return res.status(500).json({ success: false, message: "Сервер қатесі" });
  }
});

// =====================
// DELETE /api/guests/admin/:id
// Удалить гостя (только admin)
// =====================
router.delete("/admin/:id", requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteGuest(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Қонақ табылмады" });
    }

    return res.json({ success: true, message: "Жойылды" });
  } catch (err) {
    console.error("delete guest error:", err);
    return res.status(500).json({ success: false, message: "Сервер қатесі" });
  }
});

module.exports = router;
