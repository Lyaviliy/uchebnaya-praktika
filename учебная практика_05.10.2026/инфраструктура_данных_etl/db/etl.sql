-- =====================================================================
-- etl.sql — очистка сырых данных и загрузка в рабочие таблицы
-- (этапы Transform и Load). Перед запуском: schema.sql, staging.sql
-- и загрузка файлов в staging (npm run db:init или load_raw.psql)
--
-- Найденные аномалии и как они устраняются:
--   partners_raw.csv
--     - пробелы по краям названия и email          -> btrim
--     - тип организации слит с названием           -> вынесен в partner_types
--     - мусор «...» и двойные пробелы в названии    -> regexp_replace
--     - латинские буквы в инициалах «A.B.»          -> замена на кириллицу
--     - email в разном регистре                     -> lower
--   products_raw.csv
--     - кодировка Windows-1251 вместо UTF-8         -> перекодируется при загрузке
--     - пробелы по краям названия                   -> btrim
--     - кавычка-дюйм в «Монитор 27"» без экранирования -> кавычки снимаются только парные
--   sales_history_raw.csv
--     - 5 форматов даты и пробелы вокруг неё        -> приведение к ГГГГ-ММ-ДД
--     - продажа партнёру 999, которого нет           -> строка исключается
-- =====================================================================

BEGIN;

TRUNCATE sales_history, products, partners, material_types, product_types, partner_types RESTART IDENTITY;


-- ---------------------------------------------------------------------
-- 1. Справочники, которых нет в исходных файлах
--    Коэффициенты и процент брака — параметры производства для калькулятора
-- ---------------------------------------------------------------------
INSERT INTO product_types (name, coefficient) VALUES
    ('Ноутбуки', 2.5),
    ('Смартфоны', 1.4),
    ('Мониторы', 3.1);

INSERT INTO material_types (name, defect_percent) VALUES
    ('Пластик', 0.8),
    ('Металл', 0.35),
    ('Стекло', 1.5);


-- ---------------------------------------------------------------------
-- 2. Партнёры
-- ---------------------------------------------------------------------
CREATE TEMP TABLE partners_clean ON COMMIT DROP AS
WITH step1 AS (
    SELECT
        btrim(partner_id)::int AS id,
        -- убираем мусорные многоточия и схлопываем повторные пробелы
        btrim(regexp_replace(regexp_replace(partner_name, '\.{2,}', '', 'g'), '\s+', ' ', 'g')) AS full_name,
        regexp_replace(inn, '\D', '', 'g')  AS inn,
        lower(btrim(email))                 AS email
    FROM staging.partners_raw
),
step2 AS (
    SELECT
        id,
        split_part(full_name, ' ', 1)                         AS partner_type,
        btrim(substr(full_name, length(split_part(full_name, ' ', 1)) + 2), ' "«»') AS name,
        inn,
        email
    FROM step1
)
SELECT
    id,
    partner_type,
    -- Инициалы набраны латиницей (A.B. вместо А.В.): меняем только хвост-инициалы,
    -- чтобы не испортить латиницу в названиях вроде «Pro»
    CASE
        WHEN name ~ '[A-Za-z]\. ?[A-Za-z]\.$'
        THEN regexp_replace(name, '[A-Za-z]\. ?[A-Za-z]\.$', '')
             || translate(substring(name FROM '[A-Za-z]\. ?[A-Za-z]\.$'), 'ABCEHKMOPTXY', 'АВСЕНКМОРТХУ')
        ELSE name
    END AS name,
    inn,
    email
FROM step2;

INSERT INTO partner_types (name)
SELECT DISTINCT partner_type
FROM partners_clean
ORDER BY partner_type;

-- Дополнительные типы для выпадающего списка формы
INSERT INTO partner_types (name) VALUES ('ЗАО'), ('ПАО')
ON CONFLICT (name) DO NOTHING;

-- DISTINCT ON отсекает дубликаты по id, если они появятся в файле
INSERT INTO partners (id, partner_type_id, name, inn, email)
SELECT DISTINCT ON (pc.id)
    pc.id,
    pt.id,
    pc.name,
    pc.inn,
    pc.email
FROM partners_clean pc
JOIN partner_types pt ON pt.name = pc.partner_type
ORDER BY pc.id;


-- ---------------------------------------------------------------------
-- 3. Продукция (тип определяется по первому слову названия)
-- ---------------------------------------------------------------------
CREATE TEMP TABLE products_clean ON COMMIT DROP AS
WITH unquoted AS (
    SELECT
        btrim(product_id)::int AS id,
        -- Снимаем только обрамляющую пару кавычек: " Ноутбук Pro " -> Ноутбук Pro,
        -- а дюйм в «Монитор 27"» не трогаем, потому что открывающей кавычки нет
        CASE
            WHEN btrim(product_name) ~ '^".*"$'
            THEN replace(substr(btrim(product_name), 2, length(btrim(product_name)) - 2), '""', '"')
            ELSE btrim(product_name)
        END AS product_name,
        btrim(price) AS price
    FROM staging.products_raw
)
SELECT
    id,
    regexp_replace(btrim(product_name), '\s+', ' ', 'g') AS name,
    price::decimal(12,2) AS price
FROM unquoted;

INSERT INTO products (id, product_type_id, name, price)
SELECT DISTINCT ON (pc.id)
    pc.id,
    pt.id,
    pc.name,
    pc.price
FROM products_clean pc
JOIN product_types pt ON pt.name = CASE
    WHEN pc.name ILIKE 'Ноутбук%'  THEN 'Ноутбуки'
    WHEN pc.name ILIKE 'Смартфон%' THEN 'Смартфоны'
    WHEN pc.name ILIKE 'Монитор%'  THEN 'Мониторы'
END
ORDER BY pc.id;


-- ---------------------------------------------------------------------
-- 4. История продаж
-- ---------------------------------------------------------------------
CREATE TEMP TABLE sales_clean ON COMMIT DROP AS
WITH normalized AS (
    SELECT
        btrim(sale_id)                         AS sale_id,
        btrim(partner_id)                      AS partner_id,
        btrim(product_id)                      AS product_id,
        -- Все разделители (. / -) приводим к «-», дальше остаётся два шаблона
        translate(btrim(sale_date), './', '--') AS sale_date_text,
        btrim(quantity)                        AS quantity,
        btrim(amount)                          AS amount
    FROM staging.sales_history_raw
)
SELECT
    sale_id::int    AS id,
    partner_id::int AS partner_id,
    product_id::int AS product_id,
    CASE
        WHEN sale_date_text ~ '^\d{4}-\d{2}-\d{2}$' THEN to_date(sale_date_text, 'YYYY-MM-DD')
        WHEN sale_date_text ~ '^\d{2}-\d{2}-\d{4}$' THEN to_date(sale_date_text, 'DD-MM-YYYY')
    END             AS sale_date,
    quantity::int   AS quantity,
    amount::decimal(14,2) AS amount
FROM normalized;

-- В историю попадают только строки с существующими партнёром, товаром и распознанной датой
INSERT INTO sales_history (id, partner_id, product_id, sale_date, quantity, amount)
SELECT sc.id, sc.partner_id, sc.product_id, sc.sale_date, sc.quantity, sc.amount
FROM sales_clean sc
WHERE sc.sale_date IS NOT NULL
  AND EXISTS (SELECT 1 FROM partners p WHERE p.id = sc.partner_id)
  AND EXISTS (SELECT 1 FROM products pr WHERE pr.id = sc.product_id)
ORDER BY sc.id;

-- Отчёт об отброшенных строках
SELECT
    sc.id AS rejected_sale_id,
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM partners p WHERE p.id = sc.partner_id) THEN 'партнёр ' || sc.partner_id || ' не существует'
        WHEN NOT EXISTS (SELECT 1 FROM products pr WHERE pr.id = sc.product_id) THEN 'товар ' || sc.product_id || ' не существует'
        ELSE 'дата не распознана'
    END AS reason
FROM sales_clean sc
WHERE sc.id NOT IN (SELECT id FROM sales_history);


-- ---------------------------------------------------------------------
-- 5. Счётчики SERIAL после явной вставки id
-- ---------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('partner_types', 'id'), (SELECT MAX(id) FROM partner_types));
SELECT setval(pg_get_serial_sequence('product_types', 'id'), (SELECT MAX(id) FROM product_types));
SELECT setval(pg_get_serial_sequence('material_types', 'id'), (SELECT MAX(id) FROM material_types));
SELECT setval(pg_get_serial_sequence('partners', 'id'), (SELECT MAX(id) FROM partners));
SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT MAX(id) FROM products));
SELECT setval(pg_get_serial_sequence('sales_history', 'id'), (SELECT MAX(id) FROM sales_history));

COMMIT;


-- ---------------------------------------------------------------------
-- 6. Проверка: количество строк в каждой таблице
-- ---------------------------------------------------------------------
SELECT 'partner_types' AS table_name, COUNT(*) AS rows_count FROM partner_types
UNION ALL SELECT 'partners',       COUNT(*) FROM partners
UNION ALL SELECT 'product_types',  COUNT(*) FROM product_types
UNION ALL SELECT 'material_types', COUNT(*) FROM material_types
UNION ALL SELECT 'products',       COUNT(*) FROM products
UNION ALL SELECT 'sales_history',  COUNT(*) FROM sales_history;
