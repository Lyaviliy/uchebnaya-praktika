'use strict';

const { Pool } = require('pg');
const { dbConfig } = require('./config');

// Пул соединений: приложение переиспользует подключения, а не открывает новое на каждый запрос
const pool = new Pool(dbConfig);

module.exports = { pool };
