'use strict';

const { pool } = require('./db');
const { calculatePartnerDiscount } = require('./discount');

// Суммарный объём продаж по каждому партнёру.
// LEFT JOIN оставляет партнёров без продаж: у них SUM(quantity) вернёт NULL.
const PARTNERS_SQL = `
  SELECT
    p.id,
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

/**
 * Приводит SUM(quantity) из БД к числу.
 * pg отдаёт SUM как строку (тип bigint), а при отсутствии продаж — null.
 */
function toQuantity(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

/** Превращает строку из БД в объект партнёра со скидкой. */
function toPartner(row) {
  const totalQuantity = toQuantity(row.total_quantity);

  return {
    id: row.id,
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

/** Все партнёры с текущим процентом скидки. */
async function getPartnersWithDiscount() {
  const result = await pool.query(PARTNERS_SQL, [null]);

  return result.rows.map(toPartner);
}

/** Один партнёр по id с текущим процентом скидки (или null, если не найден). */
async function getPartnerWithDiscount(partnerId) {
  const result = await pool.query(PARTNERS_SQL, [partnerId]);

  if (result.rows.length === 0) {
    return null;
  }

  return toPartner(result.rows[0]);
}

module.exports = { getPartnersWithDiscount, getPartnerWithDiscount, toQuantity, toPartner };
