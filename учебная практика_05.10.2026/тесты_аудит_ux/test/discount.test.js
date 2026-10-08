'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePartnerDiscount } = require('../src/discount');

test('граничные значения из ТЗ', () => {
  const cases = [
    [0, 0],
    [9999, 0],
    [10000, 5],
    [49999, 5],
    [50000, 10],
    [299999, 10],
    [300000, 15],
    [1000000, 15],
  ];

  for (const [quantity, expected] of cases) {
    assert.equal(calculatePartnerDiscount(quantity), expected, `quantity = ${quantity}`);
  }
});

test('нет истории продаж (null / undefined) -> 0%', () => {
  assert.equal(calculatePartnerDiscount(null), 0);
  assert.equal(calculatePartnerDiscount(undefined), 0);
});

test('не число -> TypeError', () => {
  assert.throws(() => calculatePartnerDiscount('10000'), TypeError);
  assert.throws(() => calculatePartnerDiscount(Number.NaN), TypeError);
});

test('отрицательное или дробное -> RangeError', () => {
  assert.throws(() => calculatePartnerDiscount(-1), RangeError);
  assert.throws(() => calculatePartnerDiscount(10000.5), RangeError);
});
