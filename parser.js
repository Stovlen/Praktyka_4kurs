const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const { Pool } = require("pg");
require("dotenv").config();

// Базова URL сторінки обладнання
const BASE_URL = "https://ro-ua.lab.nung.edu.ua/equipment/";

// Підключення до PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fetchEquipmentList(page = 1, equipmentList = []) {
  try {
    const pageUrl = page === 1 ? BASE_URL : `${BASE_URL}page/${page}/`;
    console.log(`🔄 Парсимо сторінку: ${pageUrl}`);

    const { data } = await axios.get(pageUrl);
    const $ = cheerio.load(data);

    // Шукаємо посилання на обладнання
    $("a").each((i, el) => {
      const url = $(el).attr("href");
      const name = $(el).text().trim();

      if (url && url.includes("/equipment/") && !url.includes("/page/")) {
        const fullUrl = new URL(url, BASE_URL).href;
        if (!equipmentList.find((eq) => eq.url === fullUrl)) {
          // Уникнення дублікатів
          equipmentList.push({ name, url: fullUrl });
        }
      }
    });

    // Перевіряємо, чи є кнопка "Наступна сторінка"
    const nextPageExists =
      $("a").filter((i, el) =>
        $(el)
          .attr("href")
          ?.includes(`/page/${page + 1}/`)
      ).length > 0;

    if (nextPageExists) {
      return fetchEquipmentList(page + 1, equipmentList); // Парсимо наступну сторінку
    } else {
      console.log("✅ Завершено парсинг усіх сторінок.");
      return equipmentList;
    }
  } catch (error) {
    console.error(`❌ Помилка парсингу на сторінці ${page}:`, error.message);
    return equipmentList;
  }
}

async function saveToDatabase(equipmentList) {
  try {
    for (let equipment of equipmentList) {
      await pool.query(
        "INSERT INTO equipment (name, qr_code) VALUES ($1, $2) ON CONFLICT (qr_code) DO NOTHING",
        [equipment.name, equipment.url]
      );
    }
    console.log("✅ Дані успішно збережені у PostgreSQL");
  } catch (error) {
    console.error("❌ Помилка збереження у базу:", error.message);
  } finally {
    pool.end();
  }
}

// Запускаємо парсер
fetchEquipmentList().then(saveToDatabase);
