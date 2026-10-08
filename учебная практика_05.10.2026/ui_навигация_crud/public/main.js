'use strict';

// MainWindow: список партнёров и переход в карточку партнёра.

const statusElement = document.getElementById('status');
const listElement = document.getElementById('partner-list');
const cardTemplate = document.getElementById('partner-card');
const editButton = document.getElementById('edit-partner');
const historyButton = document.getElementById('sales-history');
const searchInput = document.getElementById('search');
const SEARCH_DELAY_MS = 300;

let searchTimer = null;

let selectedPartnerId = null;

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
  return rating === null || rating === undefined ? 'Рейтинг: нет' : `Рейтинг: ${rating}`;
}

// id партнёра передаётся в другие окна через адрес: partner.html?id=5
function openPartner(partnerId) {
  window.location.href = `partner.html?id=${encodeURIComponent(partnerId)}`;
}

function openSalesHistory(partnerId) {
  window.location.href = `history.html?partner_id=${encodeURIComponent(partnerId)}`;
}

function selectPartner(partnerId, card) {
  selectedPartnerId = partnerId;

  listElement.querySelectorAll('.partner-card').forEach((item) => {
    item.classList.remove('partner-card--selected');
    item.setAttribute('aria-selected', 'false');
  });

  card.classList.add('partner-card--selected');
  card.setAttribute('aria-selected', 'true');
  editButton.disabled = false;
  historyButton.disabled = false;
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

  card.title = 'Щелчок — выбрать, двойной щелчок — открыть карточку';
  card.addEventListener('click', () => selectPartner(partner.id, card));
  card.addEventListener('dblclick', () => openPartner(partner.id));
  card.addEventListener('keydown', (event) => {
    if (event.key === ' ') {
      event.preventDefault();
      selectPartner(partner.id, card);
    }

    if (event.key === 'Enter') {
      openPartner(partner.id);
    }
  });

  return card;
}

function showStatus(text, isError) {
  statusElement.textContent = text;
  statusElement.hidden = false;
  statusElement.classList.toggle('status--error', Boolean(isError));
}

async function loadPartners() {
  try {
    const search = searchInput.value.trim();
    const query = search === '' ? '' : `?search=${encodeURIComponent(search)}`;
    const response = await fetch(`/api/partners${query}`);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Сервер ответил ${response.status}`);
    }

    const partners = await response.json();

    if (partners.length === 0) {
      listElement.replaceChildren();
      editButton.disabled = true;
      historyButton.disabled = true;
      showStatus(search === '' ? 'Партнёров пока нет. Нажмите «Добавить партнера».' : 'Ничего не найдено. Измените запрос поиска.', false);
      return;
    }

    selectedPartnerId = null;
    editButton.disabled = true;
    historyButton.disabled = true;
    listElement.replaceChildren(...partners.map(createCard));
    statusElement.hidden = true;
  } catch (error) {
    showStatus('Не удалось загрузить партнёров.', true);
    MessageBox.error(`Не удалось загрузить список партнёров.\n${error.message}`);
  }
}

// Запрос уходит после паузы в наборе, а не на каждую нажатую букву
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadPartners, SEARCH_DELAY_MS);
});

editButton.addEventListener('click', () => {
  if (selectedPartnerId !== null) {
    openPartner(selectedPartnerId);
  }
});

historyButton.addEventListener('click', () => {
  if (selectedPartnerId !== null) {
    openSalesHistory(selectedPartnerId);
  }
});

// При возврате кнопкой «Назад» браузер может показать страницу из кэша —
// перезагружаем список, чтобы он всегда был актуальным
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    loadPartners();
  }
});

loadPartners();
