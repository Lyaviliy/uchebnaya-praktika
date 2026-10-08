-- =====================================================================
-- schema.sql — развёртывание структуры БД «Партнёры и история продаж»
-- СУБД: PostgreSQL
-- Схема спроектирована в задании «Проектирование базы данных (3НФ)»
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Удаление таблиц (в обратном порядке зависимостей:
--    сначала те, что ссылаются на другие, потом справочники)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS sales_history;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS partners;
DROP TABLE IF EXISTS product_types;
DROP TABLE IF EXISTS material_types;
DROP TABLE IF EXISTS partner_types;


-- ---------------------------------------------------------------------
-- 2. Справочники (ни на кого не ссылаются, создаются первыми)
-- ---------------------------------------------------------------------

-- Типы партнёров: ООО, ЗАО, ПАО, ИП и т.д.
CREATE TABLE partner_types (
    id   SERIAL      PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- Типы продукции
CREATE TABLE product_types (
    id          SERIAL        PRIMARY KEY,
    name        VARCHAR(100)  NOT NULL UNIQUE,
    coefficient DECIMAL(10,4) NOT NULL DEFAULT 1 CHECK (coefficient > 0)
);

-- Типы материалов (сырья) и процент брака при производстве
CREATE TABLE material_types (
    id             SERIAL       PRIMARY KEY,
    name           VARCHAR(100) NOT NULL UNIQUE,
    defect_percent DECIMAL(5,2) NOT NULL CHECK (defect_percent >= 0 AND defect_percent < 100)
);


-- ---------------------------------------------------------------------
-- 3. Основные сущности
-- ---------------------------------------------------------------------

-- Партнёры
CREATE TABLE partners (
    id              SERIAL       PRIMARY KEY,
    partner_type_id INT          NOT NULL,
    name            VARCHAR(255) NOT NULL,
    inn             VARCHAR(12)  NOT NULL UNIQUE,
    director_name   VARCHAR(255),                       -- может быть неизвестен
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(20),                        -- может отсутствовать
    legal_address   VARCHAR(500),                       -- может быть неизвестен
    rating          DECIMAL(3,1) CHECK (rating BETWEEN 0 AND 10),

    -- Нельзя удалить тип, пока есть партнёры этого типа
    CONSTRAINT fk_partners_partner_type
        FOREIGN KEY (partner_type_id) REFERENCES partner_types (id)
        ON DELETE RESTRICT
);

-- Продукция
CREATE TABLE products (
    id              SERIAL        PRIMARY KEY,
    product_type_id INT           NOT NULL,
    article         VARCHAR(50)   NOT NULL UNIQUE,
    name            VARCHAR(255)  NOT NULL,
    min_price       DECIMAL(10,2) NOT NULL CHECK (min_price >= 0),

    -- Нельзя удалить тип, пока есть товары этого типа
    CONSTRAINT fk_products_product_type
        FOREIGN KEY (product_type_id) REFERENCES product_types (id)
        ON DELETE RESTRICT
);


-- ---------------------------------------------------------------------
-- 4. История продаж (ссылается на партнёров и продукцию — создаётся последней)
-- ---------------------------------------------------------------------
CREATE TABLE sales_history (
    id         SERIAL PRIMARY KEY,
    partner_id INT    NOT NULL,
    product_id INT    NOT NULL,
    quantity     INT           NOT NULL CHECK (quantity > 0),
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    sale_date    DATE          NOT NULL,

    -- Удалили партнёра -> его история продаж удаляется вместе с ним
    CONSTRAINT fk_sales_history_partner
        FOREIGN KEY (partner_id) REFERENCES partners (id)
        ON DELETE CASCADE,

    -- Нельзя удалить товар, по которому уже были продажи
    CONSTRAINT fk_sales_history_product
        FOREIGN KEY (product_id) REFERENCES products (id)
        ON DELETE RESTRICT
);

-- Индексы по внешним ключам: ускоряют вывод истории продаж партнёра
CREATE INDEX idx_sales_history_partner_id ON sales_history (partner_id);
CREATE INDEX idx_sales_history_product_id ON sales_history (product_id);
