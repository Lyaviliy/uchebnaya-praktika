-- =====================================================================
-- queries.sql — проверочные запросы (эмуляция бэкенда)
-- СУБД: PostgreSQL. Работает на схеме schema.sql и данных из import.sql
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Список партнёров: сортировка по названию + количество доставок
--    LEFT JOIN — чтобы в список попали и партнёры без единой доставки
--    (у них будет 0, а не пропадание из списка)
-- ---------------------------------------------------------------------
SELECT
    p.id,
    pt.name                AS partner_type,
    p.name                 AS partner_name,
    p.inn,
    p.email,
    p.phone,
    p.rating,
    COUNT(sh.id)           AS deliveries_count
FROM partners p
JOIN partner_types pt   ON pt.id = p.partner_type_id
LEFT JOIN sales_history sh ON sh.partner_id = p.id
GROUP BY p.id, pt.name
ORDER BY p.name;


-- ---------------------------------------------------------------------
-- 2. Добавление / обновление данных в транзакции
--    Если хоть одна команда внутри BEGIN...COMMIT упадёт,
--    не сохранится ничего: ни партнёр, ни доставка.
-- ---------------------------------------------------------------------

-- 2.1. Новый партнёр и его первая тестовая доставка
BEGIN;

INSERT INTO partners (partner_type_id, name, inn, director_name, email, phone, legal_address, rating)
VALUES (
    (SELECT id FROM partner_types WHERE name = 'ООО'),
    'Чистый Дом',
    '7709876543',
    'Иванов Иван Иванович',
    'info@chistydom.ru',
    '+74951234567',
    'г. Москва, ул. Тестовая, д. 1',
    5.0
);

INSERT INTO sales_history (partner_id, product_id, quantity, total_amount, sale_date)
VALUES (
    (SELECT id FROM partners WHERE inn = '7709876543'),
    (SELECT id FROM products WHERE article = 'ART-0001'),
    20,
    10000.00,
    CURRENT_DATE
);

COMMIT;

-- 2.2. Редактирование данных партнёра (то, что делает форма «Изменить партнёра»)
BEGIN;

UPDATE partners
SET phone   = '+74957654321',
    rating  = 4.5,
    director_name = 'Иванов И.И.'
WHERE inn = '7709876543';

COMMIT;


-- ---------------------------------------------------------------------
-- 3. История отгрузок конкретного партнёра за период
--    Параметры: партнёр id = 1, период с 01.03.2026 по 31.03.2026
--    В приложении эти три значения подставляются из формы.
-- ---------------------------------------------------------------------
SELECT
    sh.sale_date,
    pr.article,
    pr.name            AS product_name,
    sh.quantity        AS quantity_pcs,
    sh.total_amount
FROM sales_history sh
JOIN products pr ON pr.id = sh.product_id
WHERE sh.partner_id = 1
  AND sh.sale_date BETWEEN DATE '2026-03-01' AND DATE '2026-03-31'
ORDER BY sh.sale_date;

-- Итог по тому же партнёру и периоду: всего штук и общая сумма поставок
SELECT
    p.name                       AS partner_name,
    COUNT(sh.id)                 AS deliveries_count,
    COALESCE(SUM(sh.quantity), 0)     AS total_quantity_pcs,
    COALESCE(SUM(sh.total_amount), 0) AS total_amount
FROM partners p
LEFT JOIN sales_history sh
       ON sh.partner_id = p.id
      AND sh.sale_date BETWEEN DATE '2026-03-01' AND DATE '2026-03-31'
WHERE p.id = 1
GROUP BY p.name;
