'use strict';

// PartnerEditWindow: два режима — добавление (без id) и редактирование (?id=N).

const form = document.getElementById('partner-form');
const formTitle = document.getElementById('form-title');
const typeSelect = form.elements.partnerTypeId;
const saveButton = document.getElementById('save-button');
const backButton = document.getElementById('back-button');

const partnerId = new URLSearchParams(window.location.search).get('id');
const isEditMode = partnerId !== null;

let isDirty = false;

function setWindowTitle() {
  const mode = isEditMode ? 'Редактирование' : 'Добавление';
  document.title = `CRM: Карточка партнера [${mode}]`;
  formTitle.textContent = isEditMode ? 'Редактирование партнера' : 'Новый партнер';
}

function goToMainWindow() {
  window.location.href = 'index.html';
}

async function requestJson(url, options) {
  let response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('Сервер недоступен. Проверьте, что приложение запущено, и повторите попытку.');
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(body.error || `Сервер ответил ${response.status}`);
    error.status = response.status;
    error.errors = body.errors || [];
    throw error;
  }

  return body;
}

// Первая пустая опция заставляет выбрать тип осознанно, а не оставить первый из списка
async function fillTypeSelect() {
  const types = await requestJson('/api/partner-types');
  const placeholder = new Option('Выберите тип…', '');
  typeSelect.replaceChildren(placeholder, ...types.map((type) => new Option(type.name, type.id)));
}

function fillForm(partner) {
  form.elements.name.value = partner.name;
  typeSelect.value = String(partner.partnerTypeId);
  form.elements.inn.value = partner.inn;
  form.elements.rating.value = partner.rating ?? '';
  form.elements.legalAddress.value = partner.legalAddress ?? '';
  form.elements.directorName.value = partner.directorName ?? '';
  form.elements.phone.value = formatPhoneMask(partner.phone ?? '');
  form.elements.email.value = partner.email;
}

// Маска телефона на лету: 89991234567 -> +7 (999) 123-45-67
function formatPhoneMask(value) {
  let digits = value.replace(/\D/g, '');

  if (digits === '') {
    return '';
  }

  if (digits[0] === '8') {
    digits = `7${digits.slice(1)}`;
  }

  if (digits[0] !== '7') {
    digits = `7${digits}`;
  }

  digits = digits.slice(0, 11);
  const parts = [digits.slice(1, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9, 11)];
  let result = '+7';

  if (parts[0]) {
    result += ` (${parts[0]}`;
  }

  if (parts[0].length === 3) {
    result += ')';
  }

  if (parts[1]) {
    result += ` ${parts[1]}`;
  }

  if (parts[2]) {
    result += `-${parts[2]}`;
  }

  if (parts[3]) {
    result += `-${parts[3]}`;
  }

  return result;
}

function markInvalidFields(errors) {
  form.querySelectorAll('.field__input').forEach((input) => input.classList.remove('field__input--invalid'));

  errors.forEach(({ field }) => {
    const input = form.elements[field];

    if (input) {
      input.classList.add('field__input--invalid');
    }
  });

  if (errors.length > 0 && form.elements[errors[0].field]) {
    form.elements[errors[0].field].focus();
  }
}

function collectFormData() {
  return {
    name: form.elements.name.value,
    partnerTypeId: typeSelect.value,
    inn: form.elements.inn.value,
    rating: form.elements.rating.value,
    legalAddress: form.elements.legalAddress.value,
    directorName: form.elements.directorName.value,
    phone: form.elements.phone.value,
    email: form.elements.email.value,
  };
}

async function savePartner(event) {
  event.preventDefault();

  try {
    // Проверка до отправки: при ошибке операция прерывается, в БД ничего не уходит
    const { errors, data } = PartnerValidation.validatePartner(collectFormData());

    if (errors.length > 0) {
      markInvalidFields(errors);
      const steps = errors.map((e, i) => `${i + 1}. ${e.message}`).join('\n');
      await MessageBox.error(`Данные не сохранены. Исправьте:\n${steps}`, 'Ошибка ввода данных');
      return;
    }

    markInvalidFields([]);
    saveButton.disabled = true;

    await requestJson(isEditMode ? `/api/partners/${partnerId}` : '/api/partners', {
      method: isEditMode ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    isDirty = false;
    await MessageBox.info(
      isEditMode ? 'Данные партнёра успешно сохранены.' : 'Новый партнёр успешно добавлен в базу.',
      'Сохранено',
    );
    goToMainWindow();
  } catch (error) {
    markInvalidFields(error.errors || []);
    await MessageBox.error(error.message, error.status === 409 ? 'Дубликат партнёра' : 'Ошибка сохранения');
  } finally {
    saveButton.disabled = false;
  }
}

async function handleBack() {
  if (isDirty) {
    const confirmed = await MessageBox.warning(
      'Изменения не сохранены и будут потеряны. Вернуться к списку партнёров без сохранения?',
      'Несохранённые изменения',
    );

    if (!confirmed) {
      return;
    }
  }

  goToMainWindow();
}

async function init() {
  setWindowTitle();

  form.elements.phone.addEventListener('input', (event) => {
    event.target.value = formatPhoneMask(event.target.value);
  });

  form.addEventListener('input', (event) => {
    isDirty = true;
    event.target.classList.remove('field__input--invalid');
  });

  form.addEventListener('submit', savePartner);
  backButton.addEventListener('click', handleBack);

  try {
    await fillTypeSelect();

    if (isEditMode) {
      fillForm(await requestJson(`/api/partners/${encodeURIComponent(partnerId)}`));
    }
  } catch (error) {
    saveButton.disabled = true;
    await MessageBox.error(`Не удалось загрузить данные формы.\n${error.message}`);
  }
}

init();
