'use strict';

// Финальный демонстрационный стресс-тест.
// 1) Сервер должен быть запущен (npm start) в соседнем терминале.
// 2) Запуск: npm run stress
// Шлёт много параллельных запросов и проверяет, что сервер не упал
// и у каждого партнёра скидка — одно из допустимых значений.
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const REQUESTS = Number(process.env.REQUESTS || 200);
const ALLOWED_DISCOUNTS = [0, 5, 10, 15];

async function checkList() {
  const response = await fetch(`${BASE_URL}/api/partners`);

  if (response.status !== 200) {
    throw new Error(`Ожидался 200, получен ${response.status}`);
  }

  const partners = await response.json();

  for (const partner of partners) {
    if (!ALLOWED_DISCOUNTS.includes(partner.discount)) {
      throw new Error(`Недопустимая скидка у ${partner.name}: ${partner.discount}`);
    }
  }

  return partners.length;
}

async function checkStatus(url, expected) {
  const response = await fetch(`${BASE_URL}${url}`);

  if (response.status !== expected) {
    throw new Error(`${url}: ожидался ${expected}, получен ${response.status}`);
  }
}

async function main() {
  const started = Date.now();
  const results = await Promise.allSettled(Array.from({ length: REQUESTS }, checkList));
  const failed = results.filter((r) => r.status === 'rejected');

  console.log(`Параллельных запросов: ${REQUESTS}, успешно: ${REQUESTS - failed.length}, ошибок: ${failed.length}`);
  console.log(`Время: ${Date.now() - started} мс`);

  if (failed.length > 0) {
    console.log('Первая ошибка:', failed[0].reason.message);
  }

  await checkStatus('/api/partners/999999', 404);
  await checkStatus('/api/unknown', 404);
  await checkStatus('/../src/config.js', 404);
  console.log('Неверные адреса обрабатываются без падения: OK');

  const count = await checkList();
  console.log(`Сервер жив после нагрузки, партнёров в списке: ${count}`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Стресс-тест не пройден:', error.message);
  process.exitCode = 1;
});
