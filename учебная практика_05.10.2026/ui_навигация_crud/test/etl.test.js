'use strict';

// Этап Extract: файлы читаются без потерь, даже с аномалиями
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsvLine, readRawRows, RAW_FILES } = require('../scripts/initDb');

test('CSV: экранированные кавычки и пробелы внутри кавычек сохраняются', () => {
  assert.deepEqual(parseCsvLine('1," ООО ""Вектор"" ",7701234567, vector@mail.ru'), ['1', ' ООО "Вектор" ', '7701234567', ' vector@mail.ru']);
});

test('CSV: кавычка-дюйм посреди поля не ломает разбор', () => {
  assert.deepEqual(parseCsvLine('103,Монитор 27",18200.0'), ['103', 'Монитор 27"', '18200.0']);
});

test('products_raw.csv читается из Windows-1251 без кракозябр', () => {
  const products = readRawRows(RAW_FILES.find((f) => f.file === 'products_raw.csv'));

  assert.equal(products.length, 3);
  assert.equal(products[0][1], ' Ноутбук Pro ');
  assert.equal(products[2][1], 'Монитор 27"');
});

test('все строки всех файлов прочитаны, CRLF не попадает в значения', () => {
  for (const source of RAW_FILES) {
    const rows = readRawRows(source);

    assert.ok(rows.length > 0, source.file);

    for (const row of rows) {
      assert.equal(row.length, source.columns, `${source.file}: ${row}`);
      assert.ok(!row.join('').includes('\r'), source.file);
    }
  }
});
