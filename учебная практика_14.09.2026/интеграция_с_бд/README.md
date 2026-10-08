# Интеграция с БД и агрегация данных (SQL + Backend)

Подключение к PostgreSQL через native-драйвер **pg (node-postgres)**.

| Файл | Что делает |
|---|---|
| `src/config.js` | параметры подключения (хост, порт, логин, пароль, база) |
| `src/db.js` | пул соединений `pg.Pool` |
| `src/partnerService.js` | SQL с `SUM(quantity)` + `LEFT JOIN` + `GROUP BY` и объединение с функцией скидки |
| `src/discount.js` | функция скидки из подзадания 1 |
| `db/schema.sql`, `db/seed.sql` | структура и данные БД |
| `scripts/initDb.js` | создаёт базу, таблицы и данные |
| `scripts/demoDiscounts.js` | консольная проверка |

На выходе `getPartnerWithDiscount(id)` возвращает объект партнёра, дополненный полями `totalQuantity` и `discount`:
```js
{ id: 6, partnerType: 'ТК', name: 'Гранд Опт', ..., totalQuantity: 310000, discount: 15 }
```

## Запуск
```bash
npm install
npm run db:init
npm run demo
```
Пароль от PostgreSQL по умолчанию `postgres`, меняется в `src/config.js`.
