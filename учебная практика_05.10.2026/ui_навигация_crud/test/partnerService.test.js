'use strict';

// Отладка граничных случаев: партнёр без продаж и данные из БД в виде строк.
// БД для этих тестов не нужна — проверяется преобразование строки результата.
const test = require('node:test');
const assert = require('node:assert/strict');
const { toQuantity, toPartner } = require('../src/partnerService');

const baseRow = {
  id: 7,
  partner_type: 'ИП',
  name: 'Сидорова Е.Н.',
  inn: '770400000412',
  director_name: null,
  email: 'sidorova@mail.ru',
  phone: null,
  legal_address: null,
  rating: null,
};

test('SUM(quantity) IS NULL (нет продаж) -> 0 шт. и скидка 0%, без падения', () => {
  const partner = toPartner({ ...baseRow, total_quantity: null });

  assert.equal(partner.totalQuantity, 0);
  assert.equal(partner.discount, 0);
  assert.equal(partner.rating, null);
});

test('SUM(quantity) приходит из pg строкой (bigint) -> корректно считается', () => {
  const partner = toPartner({ ...baseRow, rating: '9.1', total_quantity: '310000' });

  assert.equal(partner.totalQuantity, 310000);
  assert.equal(partner.discount, 15);
  assert.equal(partner.rating, 9.1);
});

test('toQuantity: null, undefined, "0", "12000"', () => {
  assert.equal(toQuantity(null), 0);
  assert.equal(toQuantity(undefined), 0);
  assert.equal(toQuantity('0'), 0);
  assert.equal(toQuantity('12000'), 12000);
});

test('поиск: спецсимволы % и _ экранируются, пустой запрос -> без фильтра', () => {
  const { toSearchPattern } = require('../src/partnerService');

  assert.equal(toSearchPattern('Вектор'), '%Вектор%');
  assert.equal(toSearchPattern('50%_'), '%50\\%\\_%');
  assert.equal(toSearchPattern('   '), null);
  assert.equal(toSearchPattern(undefined), null);
});
