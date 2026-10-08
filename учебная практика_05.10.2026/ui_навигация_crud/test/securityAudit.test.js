'use strict';

// Аудит безопасности: все SQL-запросы в коде должны быть параметризованы ($1, $2 ...),
// без подстановки значений через ${...} или сложение строк.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SOURCE_DIRS = ['src', 'scripts'];
const SQL_KEYWORDS = /\b(SELECT|INSERT|UPDATE|DELETE)\b/i;

function listJsFiles() {
  return SOURCE_DIRS.flatMap((dir) => fs.readdirSync(path.join(ROOT, dir))
    .filter((name) => name.endsWith('.js'))
    .map((name) => path.join(ROOT, dir, name)));
}

test('в SQL-строках нет подстановки ${...}', () => {
  const problems = [];

  for (const file of listJsFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    const templates = source.match(/`[^`]*`/g) || [];

    for (const template of templates) {
      if (SQL_KEYWORDS.test(template) && template.includes('${')) {
        problems.push(`${path.relative(ROOT, file)}: ${template.slice(0, 60)}…`);
      }
    }
  }

  assert.deepEqual(problems, []);
});

test('в SQL-строках нет склейки через +', () => {
  const problems = [];

  for (const file of listJsFiles()) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');

    lines.forEach((line, index) => {
      const isSqlString = /['"`][^'"`]*\b(SELECT|INSERT|UPDATE|DELETE|WHERE)\b/i.test(line);

      if (isSqlString && /['"`]\s*\+|\+\s*['"`]/.test(line)) {
        problems.push(`${path.relative(ROOT, file)}:${index + 1}`);
      }
    });
  }

  assert.deepEqual(problems, []);
});

test('каждый pool.query с данными передаёт массив параметров', () => {
  const service = fs.readFileSync(path.join(ROOT, 'src', 'partnerService.js'), 'utf8')
    + fs.readFileSync(path.join(ROOT, 'src', 'materialService.js'), 'utf8');
  const queriesWithPlaceholders = service.match(/pool\.query\([^;]*\$1[^;]*\);/gs) || [];

  for (const query of queriesWithPlaceholders) {
    assert.match(query, /\[\s*[^\]]+\]\s*,?\s*\)/s, query.slice(0, 80));
  }
});
