'use strict';

// HTTP-сервер: отдаёт страницы из public/ и REST API партнёров.
// Запуск: npm start  ->  http://localhost:3000
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { serverPort } = require('./config');
const service = require('./partnerService');
const materialService = require('./materialService');
const logger = require('./logger');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MAX_BODY_BYTES = 100 * 1024;

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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;

      if (body.length > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Слишком большой запрос'), { status: 413 }));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(body === '' ? {} : JSON.parse(body));
      } catch {
        reject(Object.assign(new Error('Некорректный JSON в запросе'), { status: 400 }));
      }
    });

    req.on('error', reject);
  });
}

async function handleApi(req, res, urlPath) {
  const { method } = req;

  if (urlPath === '/api/partner-types' && method === 'GET') {
    sendJson(res, 200, await service.getPartnerTypes());
    return;
  }

  if (urlPath === '/api/partners' && method === 'GET') {
    sendJson(res, 200, await service.getPartnersWithDiscount());
    return;
  }

  if (urlPath === '/api/partners' && method === 'POST') {
    const created = await service.createPartner(await readJsonBody(req));
    sendJson(res, 201, created);
    return;
  }

  if (urlPath === '/api/product-types' && method === 'GET') {
    sendJson(res, 200, await materialService.getProductTypes());
    return;
  }

  if (urlPath === '/api/material-types' && method === 'GET') {
    sendJson(res, 200, await materialService.getMaterialTypes());
    return;
  }

  if (urlPath === '/api/materials/calculate' && method === 'POST') {
    const input = await readJsonBody(req);
    const amount = await materialService.calculate(input);

    if (amount === -1) {
      logger.warn(`Расчёт материалов: некорректные данные ${JSON.stringify(input)}`);
    }

    sendJson(res, 200, { amount });
    return;
  }

  const salesMatch = urlPath.match(/^\/api\/partners\/(\d+)\/sales$/);

  if (salesMatch && method === 'GET') {
    sendJson(res, 200, await service.getPartnerSales(Number(salesMatch[1])));
    return;
  }

  const match = urlPath.match(/^\/api\/partners\/(\d+)$/);

  if (match && method === 'GET') {
    const partner = await service.getPartnerWithDiscount(Number(match[1]));

    if (partner === null) {
      sendJson(res, 404, { error: 'Партнёр не найден' });
      return;
    }

    sendJson(res, 200, partner);
    return;
  }

  if (match && method === 'PUT') {
    const updated = await service.updatePartner(Number(match[1]), await readJsonBody(req));
    sendJson(res, 200, updated);
    return;
  }

  sendJson(res, 404, { error: 'Неизвестный адрес API' });
}

const server = http.createServer(async (req, res) => {
  const urlPath = new URL(req.url, 'http://localhost').pathname;

  try {
    if (urlPath.startsWith('/api/')) {
      await handleApi(req, res, urlPath);
      return;
    }

    sendStatic(res, urlPath);
  } catch (error) {
    // Ожидаемые ошибки (валидация, конфликт, не найдено) уходят клиенту с текстом,
    // всё остальное — недоступность БД и сбои — общим сообщением, сервер не падает
    if (error.status) {
      logger.warn(`${req.method} ${urlPath} -> ${error.status}`, error);
      sendJson(res, error.status, { error: error.message, errors: error.errors || [] });
      return;
    }

    logger.error(`${req.method} ${urlPath} -> 500`, error);
    sendJson(res, 500, { error: 'База данных недоступна. Проверьте, что PostgreSQL запущен, и повторите попытку.' });
  }
});

server.listen(serverPort, () => {
  logger.info(`Сервер запущен: http://localhost:${serverPort}`);
});

// Последний рубеж: непойманная ошибка попадает в лог, а не теряется молча
process.on('uncaughtException', (error) => {
  logger.error('Непойманное исключение', error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Необработанный отказ Promise', reason instanceof Error ? reason : new Error(String(reason)));
});
