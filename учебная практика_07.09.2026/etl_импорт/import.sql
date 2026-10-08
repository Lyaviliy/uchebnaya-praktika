-- =====================================================================
-- import.sql — загрузка очищенных данных в PostgreSQL (этап Load в ETL)
--
-- Перед запуском:
--   1) python clean.py         -> появится папка clean/ с очищенными CSV
--   2) psql -U postgres -d praktika -f schema.sql   (создать таблицы)
-- Запуск (из этой папки):
--   psql -U postgres -d praktika -f import.sql
--
-- \copy — клиентская версия COPY: читает файл с вашего компьютера,
-- поэтому не нужны права суперпользователя на файлы сервера.
-- =====================================================================

\set ON_ERROR_STOP on

BEGIN;

-- На случай повторного запуска: очищаем таблицы и сбрасываем счётчики id
TRUNCATE sales_history, products, product_types, partners, partner_types
    RESTART IDENTITY;

-- Порядок загрузки: сначала справочники, потом те, кто на них ссылается
\copy partner_types (id, name)                                          FROM 'clean/partner_types.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
\copy partners (id, partner_type_id, name, inn, email, phone, rating)   FROM 'clean/partners.csv'      WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
\copy product_types (id, name)                                          FROM 'clean/product_types.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
\copy products (id, product_type_id, article, name, min_price)          FROM 'clean/products.csv'      WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
\copy sales_history (id, partner_id, product_id, quantity, total_amount, sale_date) FROM 'clean/sales_history.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

-- id мы вставили явно (из исходных файлов), поэтому двигаем счётчики SERIAL
-- на максимальное значение, чтобы новые записи не получили занятый id
SELECT setval(pg_get_serial_sequence('partner_types', 'id'), (SELECT MAX(id) FROM partner_types));
SELECT setval(pg_get_serial_sequence('partners',      'id'), (SELECT MAX(id) FROM partners));
SELECT setval(pg_get_serial_sequence('product_types', 'id'), (SELECT MAX(id) FROM product_types));
SELECT setval(pg_get_serial_sequence('products',      'id'), (SELECT MAX(id) FROM products));
SELECT setval(pg_get_serial_sequence('sales_history', 'id'), (SELECT MAX(id) FROM sales_history));

COMMIT;


-- =====================================================================
-- Проверочные запросы: количество строк в каждой таблице
-- Ожидается: partner_types 3, partners 3, product_types 1,
--            products 3, sales_history 4
-- =====================================================================
SELECT 'partner_types' AS table_name, COUNT(*) AS rows_count FROM partner_types
UNION ALL
SELECT 'partners',      COUNT(*) FROM partners
UNION ALL
SELECT 'product_types', COUNT(*) FROM product_types
UNION ALL
SELECT 'products',      COUNT(*) FROM products
UNION ALL
SELECT 'sales_history', COUNT(*) FROM sales_history;
