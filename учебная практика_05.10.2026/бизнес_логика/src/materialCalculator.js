'use strict';

const INVALID_RESULT = -1;

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

/**
 * Рассчитывает количество материала (сырья) для выпуска продукции.
 *
 * Базовый расход на 1 ед. = param1 * param2 * коэффициент типа продукции
 * Общий чистый расход    = базовый расход * quantity
 * Итог с учётом брака    = чистый расход * (1 + процент брака / 100), округление вверх
 *
 * @param {number} productTypeId  id типа продукции
 * @param {number} materialTypeId id типа материала
 * @param {number} quantity       количество продукции, шт.
 * @param {number} param1         первый параметр продукции (> 0)
 * @param {number} param2         второй параметр продукции (> 0)
 * @param {{ getProductTypeCoefficient: Function, getMaterialDefectPercent: Function }} directory
 *        справочники: из БД в приложении или мок-объект в тестах
 * @returns {Promise<number>} целое количество материала или -1 при некорректных данных
 */
async function calculateMaterialAmount(productTypeId, materialTypeId, quantity, param1, param2, directory) {
  if (!isPositiveInteger(productTypeId) || !isPositiveInteger(materialTypeId)) {
    return INVALID_RESULT;
  }

  if (!isPositiveInteger(quantity) || !isPositiveNumber(param1) || !isPositiveNumber(param2)) {
    return INVALID_RESULT;
  }

  const coefficient = await directory.getProductTypeCoefficient(productTypeId);
  const defectPercent = await directory.getMaterialDefectPercent(materialTypeId);

  // Справочник вернул null — такого id типа нет
  if (coefficient === null || defectPercent === null) {
    return INVALID_RESULT;
  }

  const baseAmountPerUnit = param1 * param2 * coefficient;
  const netAmount = baseAmountPerUnit * quantity;
  const totalAmount = netAmount * (1 + defectPercent / 100);

  // Дробная арифметика даёт хвосты вида 120.00000000000001, и ceil превратил бы их в 121.
  // Сначала обрезаем шум до 6 знаков, потом округляем вверх
  const cleanedAmount = Number(totalAmount.toFixed(6));

  return Math.ceil(cleanedAmount);
}

module.exports = { calculateMaterialAmount, INVALID_RESULT };
