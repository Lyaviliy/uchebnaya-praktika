'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePartner } = require('../public/validation');

const valid = {
  name: '  Чистый Дом ',
  partnerTypeId: '1',
  inn: '7709876543',
  rating: '7',
  legalAddress: '',
  directorName: 'Иванов И.И.',
  phone: '8 (999) 123-45-67',
  email: 'Info@ChistyDom.ru',
};

function fieldsOf(result) {
  return result.errors.map((e) => e.field);
}

test('корректные данные проходят и нормализуются', () => {
  const { errors, data } = validatePartner(valid);

  assert.deepEqual(errors, []);
  assert.equal(data.name, 'Чистый Дом');
  assert.equal(data.partnerTypeId, 1);
  assert.equal(data.rating, 7);
  assert.equal(data.phone, '+79991234567');
  assert.equal(data.email, 'info@chistydom.ru');
  assert.equal(data.legalAddress, null);
});

test('рейтинг: дробный, отрицательный, больше 10, текст -> ошибка', () => {
  for (const rating of ['4.5', '4,5', '-1', '11', 'пять']) {
    assert.deepEqual(fieldsOf(validatePartner({ ...valid, rating })), ['rating'], `rating = ${rating}`);
  }
});

test('рейтинг: 0, 10 и пустой допустимы', () => {
  assert.equal(validatePartner({ ...valid, rating: '0' }).data.rating, 0);
  assert.equal(validatePartner({ ...valid, rating: '10' }).data.rating, 10);
  assert.equal(validatePartner({ ...valid, rating: '' }).data.rating, null);
});

test('пустые наименование и email -> ошибка', () => {
  const result = validatePartner({ ...valid, name: '   ', email: '' });

  assert.deepEqual(fieldsOf(result), ['name', 'email']);
});

test('неверные email, ИНН, телефон и тип', () => {
  assert.deepEqual(fieldsOf(validatePartner({ ...valid, email: 'mail.ru' })), ['email']);
  assert.deepEqual(fieldsOf(validatePartner({ ...valid, inn: '123' })), ['inn']);
  assert.deepEqual(fieldsOf(validatePartner({ ...valid, phone: '123' })), ['phone']);
  assert.deepEqual(fieldsOf(validatePartner({ ...valid, partnerTypeId: '' })), ['partnerTypeId']);
});
