require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());

// Підключення до PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool
  .connect()
  .then(() => console.log("Підключено до PostgreSQL"))
  .catch((err) => console.error("Помилка підключення:", err));

// Отримання інформації про обладнання + запис перегляду
app.get("/api/equipment/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query("SELECT * FROM equipment WHERE id = $1", [
      id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Обладнання не знайдено" });
    }

    let equipment = rows[0];

    res.json(equipment);
  } catch (err) {
    console.error("Помилка отримання обладнання:", err);
    res.status(500).json({ message: "Помилка сервера" });
  }
});



// Генерація QR-коду
app.get("/generate-qr/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      "SELECT qr_code FROM equipment WHERE id = $1",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Обладнання не знайдено" });
    }

    const equipmentUrl = rows[0].qr_code;
    const qrPath = path.join(__dirname, "qr_codes", `${id}.png`);

    if (!fs.existsSync("qr_codes")) {
      fs.mkdirSync("qr_codes");
    }

    await QRCode.toFile(qrPath, equipmentUrl);

    res.sendFile(qrPath);
  } catch (error) {
    console.error("Помилка генерації QR-коду:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
});

// Логування переглядів через окремий маршрут
app.get("/track-view/:id", async (req, res) => {
  const { id } = req.params;
  const userIp = req.ip;

  try {
    await pool.query(
      "INSERT INTO equipment_views (equipment_id, user_ip, viewed_at) VALUES ($1, $2, NOW())",
      [id, userIp]
    );

    res.redirect(`/api/equipment/${id}`); // Перенаправлення на деталі обладнання
  } catch (error) {
    console.error("Помилка запису перегляду:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
});

// Отримання всіх переглядів обладнання
app.get("/api/equipment-views", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM equipment_views ORDER BY viewed_at DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Помилка отримання переглядів:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущено на порту ${PORT}`));
