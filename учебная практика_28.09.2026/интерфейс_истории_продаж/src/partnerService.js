'use strict';

const { pool } = require('./db');
const { calculatePartnerDiscount } = require('./discount');
const { validatePartner } = require('../public/validation');

// Ошибки, которые сервер переводит в понятные HTTP-ответы
class ValidationError extends Error {
  constructor(errors) {
    super(errors.map((e) => e.message).join('\n'));
    this.status = 400;
    this.errors = errors;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.status = 404;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.status = 409;
  }
}

// LEFT JOIN оставляет партнёров без продаж: у них SUM(quantity) вернёт NULL
const PARTNERS_SQL = `
  SELECT
    p.id,
    p.partner_type_id,
    pt.name          AS partner_type,
    p.name,
    p.inn,
    p.director_name,
    p.email,
    p.phone,
    p.legal_address,
    p.rating,
    SUM(sh.quantity) AS total_quantity
  FROM partners p
  JOIN partner_types pt ON pt.id = p.partner_type_id
  LEFT JOIN sales_history sh ON sh.partner_id = p.id
  WHERE ($1::int IS NULL OR p.id = $1::int)
  GROUP BY p.id, pt.name
  ORDER BY p.name
`;

// pg отдаёт SUM (bigint) строкой, а при отсутствии продаж — null
function toQuantity(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function toPartner(row) {
  const totalQuantity = toQuantity(row.total_quantity);

  return {
    id: row.id,
    partnerTypeId: row.partner_type_id === undefined ? null : Number(row.partner_type_id),
    partnerType: row.partner_type,
    name: row.name,
    inn: row.inn,
    directorName: row.director_name,
    email: row.email,
    phone: row.phone,
    legalAddress: row.legal_address,
    rating: row.rating === null ? null : Number(row.rating),
    totalQuantity,
    discount: calculatePartnerDiscount(totalQuantity),
  };
}

async function getPartnersWithDiscount() {
  const result = await pool.query(PARTNERS_SQL, [null]);

  return result.rows.map(toPartner);
}

async function getPartnerWithDiscount(partnerId) {
  const result = await pool.query(PARTNERS_SQL, [partnerId]);

  if (result.rows.length === 0) {
    return null;
  }

  return toPartner(result.rows[0]);
}

async function getPartnerTypes() {
  const result = await pool.query('SELECT id, name FROM partner_types ORDER BY name');

  return result.rows.map((row) => ({ id: Number(row.id), name: row.name }));
}

// Ссылочная целостность на уровне кода: не даём сохранить партнёра
// с несуществующим типом, даже если запрос пришёл в обход формы
async function ensurePartnerTypeExists(partnerTypeId) {
  const result = await pool.query('SELECT 1 FROM partner_types WHERE id = $1', [partnerTypeId]);

  if (result.rowCount === 0) {
    throw new ValidationError([{ field: 'partnerTypeId', message: 'Выбранный тип партнёра не найден в справочнике. Обновите страницу и выберите тип заново.' }]);
  }
}

// Перевод ошибок PostgreSQL в сообщения для пользователя
function translateDbError(error) {
  if (error.code === '23505') {
    const field = String(error.constraint || '').includes('email') ? 'email' : 'ИНН';
    return new ConflictError(`Партнёр с таким ${field} уже существует. Проверьте данные или найдите существующего партнёра в списке.`);
  }

  if (error.code === '23503') {
    return new ValidationError([{ field: 'partnerTypeId', message: 'Нарушена связь с справочником типов партнёров.' }]);
  }

  if (error.code === '23514') {
    return new ValidationError([{ field: 'rating', message: 'Значение не прошло проверку в базе данных. Проверьте рейтинг.' }]);
  }

  return error;
}

function validateOrThrow(input) {
  const { errors, data } = validatePartner(input);

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return data;
}

async function createPartner(input) {
  const data = validateOrThrow(input);
  await ensurePartnerTypeExists(data.partnerTypeId);

  try {
    const result = await pool.query(
      `INSERT INTO partners (partner_type_id, name, inn, director_name, email, phone, legal_address, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [data.partnerTypeId, data.name, data.inn, data.directorName, data.email, data.phone, data.legalAddress, data.rating],
    );

    return getPartnerWithDiscount(Number(result.rows[0].id));
  } catch (error) {
    throw translateDbError(error);
  }
}

async function updatePartner(partnerId, input) {
  const data = validateOrThrow(input);
  await ensurePartnerTypeExists(data.partnerTypeId);

  try {
    const result = await pool.query(
      `UPDATE partners
       SET partner_type_id = $1, name = $2, inn = $3, director_name = $4,
           email = $5, phone = $6, legal_address = $7, rating = $8
       WHERE id = $9`,
      [data.partnerTypeId, data.name, data.inn, data.directorName, data.email, data.phone, data.legalAddress, data.rating, partnerId],
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Партнёр не найден: возможно, его удалили. Вернитесь к списку партнёров.');
    }

    return getPartnerWithDiscount(partnerId);
  } catch (error) {
    throw translateDbError(error);
  }
}

// История реализации: JOIN с products даёт название товара вместо его id.
// Дату форматируем в БД (ДД.ММ.ГГГГ), чтобы не зависеть от часового пояса сервера
const SALES_SQL = `
  SELECT
    sh.id,
    pr.name                              AS product_name,
    sh.quantity,
    to_char(sh.sale_date, 'DD.MM.YYYY')  AS sale_date
  FROM sales_history sh
  JOIN products pr ON pr.id = sh.product_id
  WHERE sh.partner_id = $1
  ORDER BY sh.sale_date DESC, sh.id DESC
`;

async function getPartnerSales(partnerId) {
  const partnerResult = await pool.query('SELECT id, name FROM partners WHERE id = $1', [partnerId]);

  if (partnerResult.rows.length === 0) {
    throw new NotFoundError('Партнёр не найден: возможно, его удалили. Вернитесь к списку партнёров.');
  }

  const salesResult = await pool.query(SALES_SQL, [partnerId]);

  return {
    partner: { id: Number(partnerResult.rows[0].id), name: partnerResult.rows[0].name },
    sales: salesResult.rows.map((row) => ({
      id: Number(row.id),
      productName: row.product_name,
      quantity: Number(row.quantity),
      saleDate: row.sale_date,
    })),
  };
}

module.exports = {
  getPartnerSales,
  getPartnersWithDiscount,
  getPartnerWithDiscount,
  getPartnerTypes,
  createPartner,
  updatePartner,
  toQuantity,
  toPartner,
  ValidationError,
  NotFoundError,
  ConflictError,
};
