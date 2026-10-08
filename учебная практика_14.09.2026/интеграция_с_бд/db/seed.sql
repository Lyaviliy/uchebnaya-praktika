-- =====================================================================
-- seed.sql — данные для приложения
-- Часть 1: данные, очищенные и импортированные в задании ETL (07.09)
-- Часть 2: тестовые партнёры для демонстрации всех уровней скидки
-- =====================================================================

TRUNCATE sales_history, products, product_types, partners, partner_types RESTART IDENTITY;

-- ---------- Часть 1: данные из ETL ----------
INSERT INTO partner_types (id, name) VALUES
    (1, 'ООО'),
    (2, 'ИП'),
    (3, 'ТК');

INSERT INTO partners (id, partner_type_id, name, inn, email, phone, rating) VALUES
    (1, 1, 'Логистик-Экспресс', '7701234567', 'info@logex.ru', '+79991112233', 4.8),
    (2, 2, 'Петров А.В.', '5001098765', 'petrov_delivery@mail.ru', NULL, 4.2),
    (3, 3, 'Быстрый Путь', '7812345678', 'speedway@yandex.ru', '+78125554433', NULL);

INSERT INTO product_types (id, name) VALUES
    (1, 'Бытовая химия');

INSERT INTO products (id, product_type_id, article, name, min_price) VALUES
    (1, 1, 'ART-0001', 'Стиральный порошок "Альфа"', 500.00),
    (2, 1, 'ART-0002', 'Мыло жидкое "Стандарт"', 90.00),
    (3, 1, 'ART-0003', 'Кондиционер для белья', 350.00);

INSERT INTO sales_history (id, partner_id, product_id, quantity, total_amount, sale_date) VALUES
    (101, 1, 1, 50, 25000.00, '2026-03-01'),
    (102, 2, 2, 200, 18000.50, '2026-03-15'),
    (103, 1, 3, 30, 10500.00, '2026-03-20'),
    (105, 3, 2, 150, 13500.00, '2026-03-25');

-- ---------- Часть 2: тестовые данные для демонстрации ----------
-- 4 -> объём 12 000 шт. (5%), 5 -> 60 000 шт. (10%),
-- 6 -> 310 000 шт. (15%), 7 -> продаж нет вообще (0%, SUM = NULL)
INSERT INTO partners (id, partner_type_id, name, inn, director_name, email, phone, legal_address, rating) VALUES
    (4, 1, 'Чистота Плюс', '7704000001', 'Смирнова Анна Сергеевна', 'sales@chistota.ru', '+74951110001', 'г. Москва, ул. Лесная, д. 5', 7.0),
    (5, 1, 'Мой Дом', '7704000002', 'Кузнецов Олег Петрович', 'order@moydom.ru', '+74951110002', 'г. Москва, пр. Мира, д. 12', 8.5),
    (6, 3, 'Гранд Опт', '7704000003', 'Волков Дмитрий Андреевич', 'info@grandopt.ru', '+74951110003', 'г. Подольск, ул. Складская, д. 1', 9.1),
    (7, 2, 'Сидорова Е.Н.', '770400000412', 'Сидорова Елена Николаевна', 'sidorova@mail.ru', '+79161110004', 'г. Химки, ул. Новая, д. 3', 3.0);

INSERT INTO sales_history (id, partner_id, product_id, quantity, total_amount, sale_date) VALUES
    (201, 4, 2, 12000, 1080000.00, '2026-04-02'),
    (202, 5, 1, 40000, 20000000.00, '2026-04-10'),
    (203, 5, 3, 20000, 7000000.00, '2026-05-14'),
    (204, 6, 2, 310000, 27900000.00, '2026-06-01');

-- Двигаем счётчики id после явной вставки
SELECT setval(pg_get_serial_sequence('partner_types', 'id'), (SELECT MAX(id) FROM partner_types));
SELECT setval(pg_get_serial_sequence('partners', 'id'), (SELECT MAX(id) FROM partners));
SELECT setval(pg_get_serial_sequence('product_types', 'id'), (SELECT MAX(id) FROM product_types));
SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT MAX(id) FROM products));
SELECT setval(pg_get_serial_sequence('sales_history', 'id'), (SELECT MAX(id) FROM sales_history));
