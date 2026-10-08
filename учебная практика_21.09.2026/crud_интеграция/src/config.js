'use strict';

// Параметры подключения к PostgreSQL.
// Можно поменять здесь или задать переменными окружения PGHOST, PGPORT и т.д.
const dbConfig = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'praktika',
};

const serverPort = Number(process.env.PORT || 3000);

module.exports = { dbConfig, serverPort };
