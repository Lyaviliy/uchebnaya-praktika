'use strict';

// PartnerHistoryWindow: таблица продаж партнёра, partner_id приходит из адреса.

const statusElement = document.getElementById('status');
const table = document.getElementById('sales-table');
const tableBody = document.getElementById('sales-body');
const titleElement = document.getElementById('history-title');

const partnerId = new URLSearchParams(window.location.search).get('partner_id');
const numberFormat = new Intl.NumberFormat('ru-RU');

function showStatus(text, isError) {
  statusElement.textContent = text;
  statusElement.hidden = false;
  statusElement.classList.toggle('status--error', Boolean(isError));
}

function createRow(sale) {
  const row = document.createElement('tr');
  const values = [sale.productName, numberFormat.format(sale.quantity), sale.saleDate];

  values.forEach((value, index) => {
    const cell = document.createElement('td');
    cell.textContent = value;

    if (index === 1) {
      cell.className = 'data-table__number';
    }

    row.append(cell);
  });

  return row;
}

function pluralizeSales(count) {
  const lastTwo = count % 100;
  const last = count % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return `${count} продаж`;
  }

  if (last === 1) {
    return `${count} продажа`;
  }

  if (last >= 2 && last <= 4) {
    return `${count} продажи`;
  }

  return `${count} продаж`;
}

async function loadHistory() {
  if (!partnerId || !/^\d+$/.test(partnerId)) {
    showStatus('Партнёр не выбран.', true);
    await MessageBox.error('Не передан партнёр. Вернитесь к списку, выберите партнёра и нажмите «История продаж».');
    return;
  }

  try {
    const response = await fetch(`/api/partners/${partnerId}/sales`);
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body.error || `Сервер ответил ${response.status}`);
    }

    document.title = `CRM: История реализации продукции — ${body.partner.name}`;
    titleElement.textContent = `История реализации продукции — ${body.partner.name}`;

    if (body.sales.length === 0) {
      showStatus('У этого партнёра пока нет продаж.', false);
      return;
    }

    const total = body.sales.reduce((sum, sale) => sum + sale.quantity, 0);

    tableBody.replaceChildren(...body.sales.map(createRow));
    document.getElementById('sales-total').textContent = numberFormat.format(total);
    document.getElementById('sales-count').textContent = pluralizeSales(body.sales.length);
    table.hidden = false;
    statusElement.hidden = true;
  } catch (error) {
    showStatus('Не удалось загрузить историю продаж.', true);
    await MessageBox.error(`Не удалось загрузить историю продаж.\n${error.message}`);
  }
}

loadHistory();
