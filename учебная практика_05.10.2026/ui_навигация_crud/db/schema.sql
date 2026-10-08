-- =====================================================================
-- schema.sql — структура БД «CRM: партнёры, продукция, продажи» (3НФ)
-- СУБД: PostgreSQL. Стиль именования: snake_case, таблицы во мн. числе
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Удаление таблиц: сначала зависимые, потом справочники
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS sales_history;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS partners;
DROP TABLE IF EXISTS material_types;
DROP TABLE IF EXISTS product_types;
DROP TABLE IF EXISTS partner_types;


-- ---------------------------------------------------------------------
-- 2. Справочники
-- ---------------------------------------------------------------------

-- Организационно-правовая форма партнёра: ООО, ИП, АО ...
CREATE TABLE partner_types (
    id   SERIAL      PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
);

-- Тип продукции и его коэффициент для расчёта сырья
CREATE TABLE product_types (
    id          SERIAL        PRIMARY KEY,
    name        VARCHAR(100)  NOT NULL UNIQUE,
    coefficient DECIMAL(10,4) NOT NULL CHECK (coefficient > 0)
);

-- Тип материала (сырья) и процент брака при производстве
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
    inn             VARCHAR(12)  NOT NULL UNIQUE CHECK (inn ~ '^[0-9]{10}([0-9]{2})?$'),
    email           VARCHAR(255) NOT NULL UNIQUE,
    director_name   VARCHAR(255),
    phone           VARCHAR(20),
    legal_address   VARCHAR(500),
    rating          INT          CHECK (rating >= 0),

    CONSTRAINT fk_partners_partner_type
        FOREIGN KEY (partner_type_id) REFERENCES partner_types (id)
        ON DELETE RESTRICT
);

-- Справочник номенклатуры
CREATE TABLE products (
    id              SERIAL        PRIMARY KEY,
    product_type_id INT           NOT NULL,
    name            VARCHAR(255)  NOT NULL UNIQUE,
    price           DECIMAL(12,2) NOT NULL CHECK (price >= 0),

    CONSTRAINT fk_products_product_type
        FOREIGN KEY (product_type_id) REFERENCES product_types (id)
        ON DELETE RESTRICT
);

-- История реализации
CREATE TABLE sales_history (
    id         SERIAL        PRIMARY KEY,
    partner_id INT           NOT NULL,
    product_id INT           NOT NULL,
    sale_date  DATE          NOT NULL,
    quantity   INT           NOT NULL CHECK (quantity > 0),
    amount     DECIMAL(14,2) NOT NULL CHECK (amount >= 0),

    -- Удалили партнёра -> его история удаляется вместе с ним
    CONSTRAINT fk_sales_history_partner
        FOREIGN KEY (partner_id) REFERENCES partners (id)
        ON DELETE CASCADE,

    -- Нельзя удалить товар, по которому были продажи
    CONSTRAINT fk_sales_history_product
        FOREIGN KEY (product_id) REFERENCES products (id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_sales_history_partner_id ON sales_history (partner_id);
CREATE INDEX idx_sales_history_product_id ON sales_history (product_id);
