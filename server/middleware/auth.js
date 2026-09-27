/**
 * ============================
 * server/middleware/auth.js
 * JWT-middleware для защиты API-маршрутов.
 * Используется для: список гостей, админка.
 * ============================
 */

const jwt = require("jsonwebtoken");

/**
 * Middleware: проверяет JWT токен в заголовке Authorization.
 * Используй для защиты любого маршрута.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Авторизация қажет",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: "Токен жарамсыз немесе мерзімі өтті",
    });
  }
}

/**
 * Middleware: проверяет роль admin.
 * Используй ПОСЛЕ requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Рұқсат жоқ",
    });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
