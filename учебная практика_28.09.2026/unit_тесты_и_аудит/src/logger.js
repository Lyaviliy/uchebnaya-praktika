'use strict';

// Простой журнал ошибок: пишет в logs/app.log и дублирует в консоль.
const fs = require('node:fs');
const path = require('node:path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

function formatDate(date) {
  const pad = (value) => String(value).padStart(2, '0');
  const day = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

  return `${day} ${time}`;
}

function write(level, message, error) {
  const details = error ? ` | ${error.name}: ${error.message}` : '';
  const line = `[${formatDate(new Date())}] ${level} ${message}${details}\n`;

  process.stderr.write(line);

  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (writeError) {
    // Сбой записи лога не должен ронять приложение
    process.stderr.write(`Не удалось записать лог: ${writeError.message}\n`);
  }
}

module.exports = {
  error: (message, error) => write('ERROR', message, error),
  warn: (message, error) => write('WARN', message, error),
  info: (message) => write('INFO', message),
  LOG_FILE,
};
