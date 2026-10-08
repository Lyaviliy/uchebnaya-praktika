'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateMaterialAmount, INVALID_RESULT } = require('../src/materialCalculator');

// Мок-справочник вместо БД: тип продукции 1 -> коэффициент 2, материал 1 -> брак 10%
function createMockDirectory(overrides = {}) {
  const coefficients = { 1: 2, 2: 1, ...overrides.coefficients };
  const defects = { 1: 10, 2: 0.5, 3: 0, ...overrides.defects };
  const calls = [];

  return {
    calls,
    async getProductTypeCoefficient(id) {
      calls.push(['product', id]);
      return coefficients[id] ?? null;
    },
    async getMaterialDefectPercent(id) {
      calls.push(['material', id]);
      return defects[id] ?? null;
    },
  };
}

test('Тест 1 (Стандартный): известный результат', async () => {
  // 2 * 3 * 2 = 12 на единицу; * 10 шт. = 120; * (1 + 10/100) = 132
  const result = await calculateMaterialAmount(1, 1, 10, 2, 3, createMockDirectory());

  assert.equal(result, 132);
});

test('Тест 2 (Округление): дробный результат округляется вверх', async () => {
  // 1 * 1 * 1 * 1 * 1.005 = 1.005 -> 2
  assert.equal(await calculateMaterialAmount(2, 2, 1, 1, 1, createMockDirectory()), 2);

  // 1.5 * 2.5 * 1 * 3 = 11.25; * 1.005 = 11.30625 -> 12
  assert.equal(await calculateMaterialAmount(2, 2, 3, 1.5, 2.5, createMockDirectory()), 12);
});

test('Тест 2.1 (Округление): погрешность дробей не завышает результат', async () => {
  // 0.1 * 3 в JS = 0.30000000000000004; * 10 = 3.0000000000000004. Ожидаем 3, а не 4
  assert.equal(await calculateMaterialAmount(2, 3, 10, 0.1, 3, createMockDirectory()), 3);
});

test('Тест 3 (Несуществующий тип): -1 для неизвестных id продукции или материала', async () => {
  const directory = createMockDirectory();

  assert.equal(await calculateMaterialAmount(999, 1, 10, 2, 3, directory), INVALID_RESULT);
  assert.equal(await calculateMaterialAmount(1, 999, 10, 2, 3, directory), INVALID_RESULT);
});

test('Тест 3.1 (Некорректный id): 0, отрицательный, дробный, не число -> -1', async () => {
  const directory = createMockDirectory();

  for (const badId of [0, -1, 1.5, Number.NaN, '1', null]) {
    assert.equal(await calculateMaterialAmount(badId, 1, 10, 2, 3, directory), INVALID_RESULT, `productTypeId = ${badId}`);
    assert.equal(await calculateMaterialAmount(1, badId, 10, 2, 3, directory), INVALID_RESULT, `materialTypeId = ${badId}`);
  }

  // До справочника дело не дошло: некорректный ввод отсекается сразу
  assert.equal(directory.calls.length, 0);
});

test('Тест 4 (Отрицательные параметры): param1 или param2 <= 0 -> -1', async () => {
  const directory = createMockDirectory();

  assert.equal(await calculateMaterialAmount(1, 1, 10, -2, 3, directory), INVALID_RESULT);
  assert.equal(await calculateMaterialAmount(1, 1, 10, 2, -3, directory), INVALID_RESULT);
  assert.equal(await calculateMaterialAmount(1, 1, 10, 0, 3, directory), INVALID_RESULT);
  assert.equal(await calculateMaterialAmount(1, 1, 10, Number.NaN, 3, directory), INVALID_RESULT);
  assert.equal(await calculateMaterialAmount(1, 1, 10, Number.POSITIVE_INFINITY, 3, directory), INVALID_RESULT);
});

test('Тест 5 (Нулевое количество): quantity <= 0 или дробное -> -1', async () => {
  const directory = createMockDirectory();

  assert.equal(await calculateMaterialAmount(1, 1, 0, 2, 3, directory), INVALID_RESULT);
  assert.equal(await calculateMaterialAmount(1, 1, -5, 2, 3, directory), INVALID_RESULT);
  assert.equal(await calculateMaterialAmount(1, 1, 2.5, 2, 3, directory), INVALID_RESULT);
});
