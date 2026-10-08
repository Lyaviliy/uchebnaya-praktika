'use strict';

// Системные диалоговые окна (аналог MessageBox): ошибка, предупреждение, информация.
// Каждый тип со своим заголовком и пиктограммой. Возвращает Promise с выбранной кнопкой.
(function createDialogs(root) {
  const ICONS = {
    error: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#c62828"/><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
    warning: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5L23 21.5H1z" fill="#f9a825"/><path d="M12 8.5v6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="18" r="1.4" fill="#fff"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1565c0"/><circle cx="12" cy="7" r="1.5" fill="#fff"/><path d="M12 11v7" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
  };

  const TITLES = {
    error: 'Ошибка',
    warning: 'Предупреждение',
    info: 'Информация',
  };

  function showDialog({ type, title, message, buttons }) {
    return new Promise((resolve) => {
      const dialog = document.createElement('dialog');
      dialog.className = `message-box message-box--${type}`;
      dialog.setAttribute('aria-labelledby', 'message-box-title');

      const header = document.createElement('div');
      header.className = 'message-box__header';
      header.id = 'message-box-title';
      header.textContent = title || TITLES[type];

      const body = document.createElement('div');
      body.className = 'message-box__body';
      body.innerHTML = ICONS[type];

      const text = document.createElement('p');
      text.className = 'message-box__text';
      text.textContent = message;
      body.append(text);

      const footer = document.createElement('div');
      footer.className = 'message-box__footer';

      const close = (value) => {
        dialog.close();
        dialog.remove();
        resolve(value);
      };

      buttons.forEach((button, index) => {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = index === 0 ? 'button button--primary' : 'button';
        element.textContent = button.label;
        element.addEventListener('click', () => close(button.value));
        footer.append(element);
      });

      // Esc считается отказом (последняя кнопка), а не подтверждением
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        close(buttons[buttons.length - 1].value);
      });

      dialog.append(header, body, footer);
      document.body.append(dialog);
      dialog.showModal();
      footer.querySelector('button').focus();
    });
  }

  root.MessageBox = {
    error(message, title) {
      return showDialog({ type: 'error', title, message, buttons: [{ label: 'OK', value: true }] });
    },
    info(message, title) {
      return showDialog({ type: 'info', title, message, buttons: [{ label: 'OK', value: true }] });
    },
    warning(message, title) {
      return showDialog({
        type: 'warning',
        title,
        message,
        buttons: [{ label: 'Да', value: true }, { label: 'Нет', value: false }],
      });
    },
  };
}(window));
