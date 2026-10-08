'use strict';

const { pool } = require('./db');
const { calculateMaterialAmount } = require('./materialCalculator');

// Справочники для расчёта из БД. null означает «такого id нет»
const dbDirectory = {
  async getProductTypeCoefficient(productTypeId) {
    const result = await pool.query('SELECT coefficient FROM product_types WHERE id = $1', [productTypeId]);

    return result.rows.length === 0 ? null : Number(result.rows[0].coefficient);
  },

  async getMaterialDefectPercent(materialTypeId) {
    const result = await pool.query('SELECT defect_percent FROM material_types WHERE id = $1', [materialTypeId]);

    return result.rows.length === 0 ? null : Number(result.rows[0].defect_percent);
  },
};

async function getProductTypes() {
  const result = await pool.query('SELECT id, name, coefficient FROM product_types ORDER BY name');

  return result.rows.map((row) => ({ id: Number(row.id), name: row.name, coefficient: Number(row.coefficient) }));
}

async function getMaterialTypes() {
  const result = await pool.query('SELECT id, name, defect_percent FROM material_types ORDER BY name');

  return result.rows.map((row) => ({ id: Number(row.id), name: row.name, defectPercent: Number(row.defect_percent) }));
}

// Из формы числа приходят строками: '' и мусор превращаются в NaN, их отсеет сам метод
function toNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return Number.NaN;
  }

  return Number(String(value).replace(',', '.'));
}

async function calculate(input) {
  return calculateMaterialAmount(
    toNumber(input.productTypeId),
    toNumber(input.materialTypeId),
    toNumber(input.quantity),
    toNumber(input.param1),
    toNumber(input.param2),
    dbDirectory,
  );
}

module.exports = { getProductTypes, getMaterialTypes, calculate, dbDirectory, toNumber };
