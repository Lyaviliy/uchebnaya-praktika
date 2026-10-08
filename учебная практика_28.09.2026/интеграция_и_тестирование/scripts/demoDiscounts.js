'use strict';

// Консольная проверка интеграции: БД -> SQL с SUM -> функция скидки.
// Запуск: npm run demo
const { getPartnersWithDiscount, getPartnerWithDiscount } = require('../src/partnerService');
const { pool } = require('../src/db');

async function main() {
  const partners = await getPartnersWithDiscount();

  console.table(partners.map((p) => ({
    id: p.id,
    партнёр: `${p.partnerType} ${p.name}`,
    'объём, шт.': p.totalQuantity,
    'скидка, %': p.discount,
  })));

  const one = await getPartnerWithDiscount(1);
  console.log('Партнёр id=1:', one);
}

main()
  .catch((error) => {
    console.error('Ошибка:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
