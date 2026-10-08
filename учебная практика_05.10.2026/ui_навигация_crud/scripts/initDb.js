'use strict';

// Полное развёртывание БД: создать базу -> схема -> staging -> сырые файлы -> etl.sql.
// Запуск: npm run db:init
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { dbConfig } = require('../src/config');

const ROOT = path.join(__dirname, '..');

const RAW_FILES = [
  {
    file: 'partners_raw.csv',
    encoding: 'utf-8',
    columns: 4,
    insertSql: 'INSERT INTO staging.partners_raw VALUES ($1, $2, $3, $4)',
  },
  {
    file: 'products_raw.csv',
    // Файл номенклатуры выгружен в Windows-1251
    encoding: 'windows-1251',
    columns: 3,
    insertSql: 'INSERT INTO staging.products_raw VALUES ($1, $2, $3)',
  },
  {
    file: 'sales_history_raw.csv',
    encoding: 'utf-8',
    columns: 6,
    insertSql: 'INSERT INTO staging.sales_history_raw VALUES ($1, $2, $3, $4, $5, $6)',
  },
];

/**
 * Разбор строки CSV. Кавычка считается служебной только в начале поля —
 * так «Монитор 27"» читается как есть, а не ломает разбор.
 */
function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  let fieldStart = true;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"' && fieldStart) {
      inQuotes = true;
      fieldStart = false;
    } else if (char === ',') {
      fields.push(field);
      field = '';
      fieldStart = true;
    } else {
      field += char;
      fieldStart = false;
    }
  }

  fields.push(field);

  return fields;
}

function readRawRows({ file, encoding }) {
  const buffer = fs.readFileSync(path.join(ROOT, 'data', file));
  const text = new TextDecoder(encoding).decode(buffer);

  return text
    .split(/\r?\n/)
    .slice(1)
    .filter((line) => line.trim() !== '')
    .map(parseCsvLine);
}

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
  const sql = fs.readFileSync(path.join(ROOT, 'db', fileName), 'utf8');
  const result = await client.query(sql);
  console.log(`Выполнен ${fileName}`);

  return Array.isArray(result) ? result : [result];
}

async function loadRawFile(client, source) {
  const rows = readRawRows(source);

  for (const row of rows) {
    // Значения передаются параметрами, а не вклеиваются в текст запроса
    await client.query(source.insertSql, row.slice(0, source.columns));
  }

  console.log(`Загружен ${source.file}: ${rows.length} строк`);
}

function printEtlReport(results) {
  const rejected = results.find((r) => r.fields && r.fields.some((f) => f.name === 'rejected_sale_id'));
  const counts = results.find((r) => r.fields && r.fields.some((f) => f.name === 'rows_count'));

  if (rejected && rejected.rows.length > 0) {
    console.log('Отброшены строки продаж:');
    console.table(rejected.rows);
  }

  if (counts) {
    console.log('Строк в таблицах:');
    console.table(counts.rows);
  }
}

async function main() {
  await createDatabaseIfMissing();

  const client = new Client(dbConfig);
  await client.connect();

  try {
    await runSqlFile(client, 'schema.sql');
    await runSqlFile(client, 'staging.sql');

    for (const source of RAW_FILES) {
      await loadRawFile(client, source);
    }

    printEtlReport(await runSqlFile(client, 'etl.sql'));
    console.log('Готово');
  } finally {
    await client.end();
  }
}

// Скрипт запускается только напрямую; при подключении из тестов отдаёт парсер
if (require.main === module) {
  main().catch((error) => {
    console.error('Ошибка инициализации БД:', error.message);
    process.exit(1);
  });
}

module.exports = { parseCsvLine, readRawRows, RAW_FILES };
