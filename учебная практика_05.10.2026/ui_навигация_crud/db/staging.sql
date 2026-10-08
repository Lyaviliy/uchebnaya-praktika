-- =====================================================================
-- staging.sql — промежуточные таблицы для сырых данных (этап Extract)
-- Все поля TEXT: файлы загружаются как есть, без потерь и падений,
-- а очищаются уже SQL-запросами в etl.sql
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS staging;

DROP TABLE IF EXISTS staging.partners_raw;
DROP TABLE IF EXISTS staging.products_raw;
DROP TABLE IF EXISTS staging.sales_history_raw;

CREATE TABLE staging.partners_raw (
    partner_id   TEXT,
    partner_name TEXT,
    inn          TEXT,
    email        TEXT
);

CREATE TABLE staging.products_raw (
    product_id   TEXT,
    product_name TEXT,
    price        TEXT
);

CREATE TABLE staging.sales_history_raw (
    sale_id    TEXT,
    partner_id TEXT,
    product_id TEXT,
    sale_date  TEXT,
    quantity   TEXT,
    amount     TEXT
);
