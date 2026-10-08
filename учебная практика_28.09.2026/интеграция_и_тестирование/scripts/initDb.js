'use strict';

// Создаёт базу (если её нет), таблицы и заливает данные.
// Запуск: npm run db:init
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { dbConfig } = require('../src/config');

async function createDatabaseIfMissing() {
  const admin = new Client({ ...dbConfig, database: 'postgres' });
  await admin.connect();

  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbConfig.database]);

  if (exists.rowCount === 0) {
    // Имя базы нельзя передать параметром $1, поэтому экранируем его как идентификатор
    await admin.query(`CREATE DATABASE ${admin.escapeIdentifier(dbConfig.database)}`);
    console.log(`База ${dbConfig.database} создана`);
  }

  await admin.end();
}

async function runSqlFile(client, fileName) {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', fileName), 'utf8');
  await client.query(sql);
  console.log(`Выполнен ${fileName}`);
}

async function main() {
  await createDatabaseIfMissing();

  const client = new Client(dbConfig);
  await client.connect();
  await runSqlFile(client, 'schema.sql');
  await runSqlFile(client, 'seed.sql');
  await client.end();

  console.log('Готово');
}

main().catch((error) => {
  console.error('Ошибка инициализации БД:', error.message);
  process.exit(1);
});
