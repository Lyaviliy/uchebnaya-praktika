'use strict';

/**
 * Пороги скидки из ТЗ: от какого объёма (шт.) какой процент.
 * Отсортированы по убыванию порога.
 */
const DISCOUNT_LEVELS = [
  { minQuantity: 300000, percent: 15 },
  { minQuantity: 50000, percent: 10 },
  { minQuantity: 10000, percent: 5 },
];

/**
 * Рассчитывает процент скидки партнёра по суммарному объёму продаж.
 *
 * @param {number|null|undefined} totalQuantity суммарное количество проданной продукции, шт.
 * @returns {number} процент скидки: 0, 5, 10 или 15
 * @throws {TypeError} если передано не число
 * @throws {RangeError} если количество отрицательное или дробное
 */
function calculatePartnerDiscount(totalQuantity) {
  if (totalQuantity === null || totalQuantity === undefined) {
    return 0;
  }

  if (typeof totalQuantity !== 'number' || Number.isNaN(totalQuantity)) {
    throw new TypeError('totalQuantity должно быть числом');
  }

  if (!Number.isInteger(totalQuantity) || totalQuantity < 0) {
    throw new RangeError('totalQuantity должно быть целым неотрицательным числом');
  }

  const level = DISCOUNT_LEVELS.find((item) => totalQuantity >= item.minQuantity);

  return level ? level.percent : 0;
}

module.exports = { calculatePartnerDiscount, DISCOUNT_LEVELS };
