'use strict';

// Клиентская часть: забирает партнёров из API и рисует карточки.

const statusElement = document.getElementById('status');
const listElement = document.getElementById('partner-list');
const cardTemplate = document.getElementById('partner-card');

/** +79991112233 -> +7 999 111 22 33 */
function formatPhone(phone) {
  if (!phone) {
    return 'Телефон не указан';
  }

  const digits = phone.replace(/\D/g, '');

  if (digits.length !== 11) {
    return phone;
  }

  return `+${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
}

function formatRating(rating) {
  if (rating === null || rating === undefined) {
    return 'Рейтинг: нет';
  }

  return `Рейтинг: ${rating}`;
}

function createCard(partner) {
  const card = cardTemplate.content.firstElementChild.cloneNode(true);
  const discount = Number(partner.discount) || 0;

  // textContent, а не innerHTML: данные из БД не исполнятся как HTML
  card.querySelector('.partner-card__title').textContent = `${partner.partnerType} | ${partner.name}`;
  card.querySelector('.partner-card__director').textContent = partner.directorName || 'Директор не указан';
  card.querySelector('.partner-card__phone').textContent = formatPhone(partner.phone);
  card.querySelector('.partner-card__rating').textContent = formatRating(partner.rating);

  const discountElement = card.querySelector('.partner-card__discount');
  discountElement.textContent = `${discount}%`;
  discountElement.classList.toggle('partner-card__discount--active', discount > 0);

  return card;
}

function showStatus(text, isError) {
  statusElement.textContent = text;
  statusElement.hidden = false;
  statusElement.classList.toggle('status--error', Boolean(isError));
}

async function loadPartners() {
  try {
    const response = await fetch('/api/partners');

    if (!response.ok) {
      throw new Error(`Сервер ответил ${response.status}`);
    }

    const partners = await response.json();

    if (partners.length === 0) {
      showStatus('Партнёров пока нет', false);
      return;
    }

    listElement.replaceChildren(...partners.map(createCard));
    statusElement.hidden = true;
  } catch (error) {
    console.error(error);
    showStatus('Не удалось загрузить партнёров. Проверьте, что сервер и база данных запущены.', true);
  }
}

loadPartners();
