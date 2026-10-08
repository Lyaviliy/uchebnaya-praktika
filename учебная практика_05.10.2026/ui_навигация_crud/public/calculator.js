'use strict';

// Калькулятор материалов: отправляет параметры на сервер и показывает результат.

const form = document.getElementById('calc-form');
const resultElement = document.getElementById('calc-result');
const calcButton = document.getElementById('calc-button');
const numberFormat = new Intl.NumberFormat('ru-RU');

async function requestJson(url, options) {
  let response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('Сервер недоступен. Проверьте, что приложение запущено, и повторите попытку.');
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || `Сервер ответил ${response.status}`);
  }

  return body;
}

function fillSelect(select, items, describe) {
  const placeholder = new Option('Выберите…', '');
  select.replaceChildren(placeholder, ...items.map((item) => new Option(describe(item), item.id)));
}

async function loadDirectories() {
  try {
    const [productTypes, materialTypes] = await Promise.all([
      requestJson('/api/product-types'),
      requestJson('/api/material-types'),
    ]);

    fillSelect(form.elements.productTypeId, productTypes, (t) => `${t.name} (коэф. ${t.coefficient})`);
    fillSelect(form.elements.materialTypeId, materialTypes, (t) => `${t.name} (брак ${t.defectPercent}%)`);
  } catch (error) {
    calcButton.disabled = true;
    await MessageBox.error(`Не удалось загрузить справочники.\n${error.message}`);
  }
}

function showResult(amount) {
  resultElement.textContent = `Необходимо материала: ${numberFormat.format(amount)}`;
  resultElement.hidden = false;
}

async function calculate(event) {
  event.preventDefault();
  resultElement.hidden = true;
  calcButton.disabled = true;

  try {
    const payload = Object.fromEntries(new FormData(form));
    const { amount } = await requestJson('/api/materials/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // -1 — договорённый сигнал метода о некорректных данных, а не количество материала
    if (amount === -1) {
      await MessageBox.error(
        'Расчёт невозможен. Проверьте:\n'
        + '1. Выбраны тип продукции и тип материала.\n'
        + '2. Количество — целое число больше 0.\n'
        + '3. Параметры 1 и 2 — положительные числа (дробная часть через точку или запятую).',
        'Ошибка расчёта',
      );
      return;
    }

    showResult(amount);
  } catch (error) {
    await MessageBox.error(error.message, 'Ошибка расчёта');
  } finally {
    calcButton.disabled = false;
  }
}

form.addEventListener('submit', calculate);
loadDirectories();
