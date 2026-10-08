'use strict';

// HTTP-сервер: отдаёт страницу из public/ и API со списком партнёров.
// Запуск: npm start  ->  http://localhost:3000
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { serverPort } = require('./config');
const { getPartnersWithDiscount, getPartnerWithDiscount } = require('./partnerService');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendStatic(res, urlPath) {
  const relative = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  const filePath = path.normalize(path.join(PUBLIC_DIR, relative));

  // Защита от выхода за пределы папки public (../../)
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: 'Доступ запрещён' });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: 'Не найдено' });
      return;
    }

    const type = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(content);
  });
}

async function handleApi(res, urlPath) {
  if (urlPath === '/api/partners') {
    sendJson(res, 200, await getPartnersWithDiscount());
    return;
  }

  const match = urlPath.match(/^\/api\/partners\/(\d+)$/);

  if (match) {
    const partner = await getPartnerWithDiscount(Number(match[1]));

    if (partner === null) {
      sendJson(res, 404, { error: 'Партнёр не найден' });
      return;
    }

    sendJson(res, 200, partner);
    return;
  }

  sendJson(res, 404, { error: 'Неизвестный адрес API' });
}

const server = http.createServer(async (req, res) => {
  const urlPath = new URL(req.url, 'http://localhost').pathname;

  try {
    if (urlPath.startsWith('/api/')) {
      await handleApi(res, urlPath);
      return;
    }

    sendStatic(res, urlPath);
  } catch (error) {
    // Ошибка БД не роняет сервер: клиент получает понятный ответ
    console.error('Ошибка запроса:', error.message);
    sendJson(res, 500, { error: 'Не удалось получить данные из базы' });
  }
});

server.listen(serverPort, () => {
  console.log(`Сервер запущен: http://localhost:${serverPort}`);
});
