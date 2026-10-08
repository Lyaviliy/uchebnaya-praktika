# Проектирование базы данных (3НФ) и ER-диаграмма

Схема БД для учёта партнёров: просмотр списка партнёров, редактирование их данных и вывод истории продаж (отгрузок).

ER-диаграмма: [er_diagram.pdf](er_diagram.pdf) (исходник: `er_diagram.dot`, Graphviz).

**Схема именования:** snake_case, имена таблиц во множественном числе, первичный ключ всегда `id`, внешний ключ — `<таблица в ед. числе>_id`.

## Сущности

### partner_types — типы партнёров (ООО, ЗАО, ИП и т.д.)
| Поле | Тип | Ограничения |
|---|---|---|
| id | SERIAL | PK |
| name | VARCHAR(50) | NOT NULL, UNIQUE |

### partners — партнёры
| Поле | Тип | Ограничения |
|---|---|---|
| id | SERIAL | PK |
| partner_type_id | INT | NOT NULL, FK → partner_types(id) |
| name | VARCHAR(255) | NOT NULL |
| inn | VARCHAR(12) | NOT NULL, UNIQUE |
| director_name | VARCHAR(255) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| phone | VARCHAR(20) | NOT NULL |
| legal_address | VARCHAR(500) | NOT NULL |
| rating | INT | NOT NULL, CHECK (rating >= 0) |

### product_types — типы продукции
| Поле | Тип | Ограничения |
|---|---|---|
| id | SERIAL | PK |
| name | VARCHAR(100) | NOT NULL, UNIQUE |

### products — продукция
| Поле | Тип | Ограничения |
|---|---|---|
| id | SERIAL | PK |
| product_type_id | INT | NOT NULL, FK → product_types(id) |
| article | VARCHAR(50) | NOT NULL, UNIQUE |
| name | VARCHAR(255) | NOT NULL |
| min_price | NUMERIC(10,2) | NOT NULL, CHECK (min_price >= 0) |

### sales_history — история продаж (отгрузок)
| Поле | Тип | Ограничения |
|---|---|---|
| id | SERIAL | PK |
| partner_id | INT | NOT NULL, FK → partners(id) |
| product_id | INT | NOT NULL, FK → products(id) |
| quantity | INT | NOT NULL, CHECK (quantity > 0) |
| sale_date | DATE | NOT NULL |

## Связи
- partner_types 1 : N partners — у одного типа много партнёров.
- product_types 1 : N products — у одного типа много товаров.
- partners 1 : N sales_history — у партнёра много продаж.
- products 1 : N sales_history — один товар продаётся много раз.

Таблица `sales_history` реализует связь «многие ко многим» между партнёрами и продукцией.

## Обоснование 3НФ
- **1НФ:** все значения атомарные, нет повторяющихся групп, у каждой таблицы есть первичный ключ.
- **2НФ:** ключи простые (один столбец `id`), поэтому неполных зависимостей от части ключа нет.
- **3НФ:** нет транзитивных зависимостей. Названия типов партнёров и продукции вынесены в справочники `partner_types` и `product_types`, а в `sales_history` хранятся только ссылки на партнёра и товар, без копирования их названий, ИНН или цены.
