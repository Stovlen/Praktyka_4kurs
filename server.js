const express = require("express");
const app = express();

app.use(express.json());

app.get("/api/equipment/:qrCode", async (req, res) => {
  const { qrCode } = req.params;
  const userIp = req.ip;

  try {
    const { rows } = await pool.query(
      "SELECT * FROM equipment WHERE qr_code = $1",
      [qrCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Обладнання не знайдено" });
    }

    const equipment = rows[0];

    await pool.query(
      "INSERT INTO equipment_views (equipment_id, user_ip) VALUES ($1, $2)",
      [equipment.id, userIp]
    );

    res.json(equipment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Помилка сервера" });
  }
});

app.listen(3000, () => console.log("Сервер запущено на порту 3000"));

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool
  .connect()
  .then(() => console.log("✅ Підключено до PostgreSQL"))
  .catch((err) => console.error("❌ Помилка підключення:", err));
