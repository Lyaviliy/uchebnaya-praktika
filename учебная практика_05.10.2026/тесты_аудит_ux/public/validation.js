'use strict';

// Правила проверки данных партнёра.
// Один файл используется и в браузере (форма), и на сервере (перед запросом в БД),
// поэтому обёрнут так, чтобы работать в обоих окружениях.
(function exportValidation(root) {
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const RATING_MAX_DIGITS = 4;

  function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function onlyDigits(value) {
    return cleanText(value).replace(/\D/g, '');
  }

  /**
   * Проверяет данные формы и возвращает { errors, data }.
   * errors — массив { field, message } с порядком исправления для пользователя,
   * data — очищенные значения, готовые к записи в БД.
   */
  function validatePartner(input) {
    const errors = [];
    const data = {
      name: cleanText(input.name),
      partnerTypeId: Number(input.partnerTypeId),
      inn: onlyDigits(input.inn),
      rating: null,
      legalAddress: cleanText(input.legalAddress) || null,
      directorName: cleanText(input.directorName) || null,
      phone: null,
      email: cleanText(input.email).toLowerCase(),
    };

    if (data.name === '') {
      errors.push({ field: 'name', message: 'Наименование не может быть пустым. Введите название организации.' });
    }

    if (!Number.isInteger(data.partnerTypeId) || data.partnerTypeId <= 0) {
      errors.push({ field: 'partnerTypeId', message: 'Не выбран тип партнёра. Выберите значение из списка.' });
    }

    if (data.inn.length !== 10 && data.inn.length !== 12) {
      errors.push({ field: 'inn', message: 'ИНН должен состоять из 10 или 12 цифр. Проверьте номер и введите его без пробелов.' });
    }

    const ratingText = cleanText(String(input.rating ?? ''));

    if (ratingText !== '') {
      // Строгая проверка строки: Number('4.5') тоже число, а нам нужно именно целое
      if (!new RegExp(`^\\d{1,${RATING_MAX_DIGITS}}$`).test(ratingText)) {
        errors.push({
          field: 'rating',
          message: 'Рейтинг должен быть целым числом от 0. Пожалуйста, удалите знаки препинания и минус и повторите попытку.',
        });
      } else {
        data.rating = Number(ratingText);
      }
    }

    const phoneDigits = onlyDigits(input.phone);

    if (phoneDigits !== '') {
      if (phoneDigits.length !== 11 || !['7', '8'].includes(phoneDigits[0])) {
        errors.push({ field: 'phone', message: 'Телефон должен содержать 11 цифр в формате +7 (999) 123-45-67.' });
      } else {
        data.phone = `+7${phoneDigits.slice(1)}`;
      }
    }

    if (data.email === '') {
      errors.push({ field: 'email', message: 'Email не может быть пустым. Укажите адрес для связи с партнёром.' });
    } else if (!EMAIL_PATTERN.test(data.email)) {
      errors.push({ field: 'email', message: 'Email указан неверно. Используйте формат name@company.ru.' });
    }

    return { errors, data };
  }

  const api = { validatePartner, RATING_MAX_DIGITS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.PartnerValidation = api;
  }
}(typeof window !== 'undefined' ? window : globalThis));
