(() => {
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach(el => observer.observe(el));
  } else {
    revealItems.forEach(el => el.classList.add('is-visible'));
  }

  // The RSVP form is ready for a Google Apps Script endpoint.
  // Put your deployed Apps Script URL here when we connect the form to Google Drive.
  const FORM_ENDPOINT = "";

  const form = document.getElementById('rsvp-form');
  const status = document.getElementById('form-status');
  const attendanceOptions = [...document.querySelectorAll('input[name="attendance"]')];
  const declineOption = document.querySelector('input[name="attendance"][data-attendance="decline"]');
  const dayOptions = attendanceOptions.filter(input => input.dataset.attendance === 'day');

  // Attendance rule: either one or both event days, OR the decline option.
  attendanceOptions.forEach(option => {
    option.addEventListener('change', () => {
      if (option.dataset.attendance === 'decline' && option.checked) {
        dayOptions.forEach(day => { day.checked = false; });
      } else if (option.dataset.attendance === 'day' && option.checked && declineOption) {
        declineOption.checked = false;
      }
    });
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const attendance = attendanceOptions.filter(input => input.checked).map(input => input.value);
    const drinks = [...form.querySelectorAll('input[name="drinks"]:checked')].map(input => input.value);
    const data = {
      name: form.elements.name.value.trim(),
      attendance,
      food: form.querySelector('input[name="food"]:checked')?.value || "",
      transfer: form.querySelector('input[name="transfer"]:checked')?.value || "",
      drinks,
      additional: form.elements.additional.value.trim(),
      submittedAt: new Date().toISOString()
    };

    if (!data.name) {
      status.textContent = 'Пожалуйста, укажите ваше имя.';
      form.elements.name.focus();
      return;
    }
    if (!data.attendance.length) {
      status.textContent = 'Пожалуйста, отметьте один или оба дня либо вариант «не смогу». ';
      return;
    }
    if (!data.food) {
      status.textContent = 'Пожалуйста, укажите предпочтения по еде.';
      form.querySelector('input[name="food"]')?.focus();
      return;
    }
    if (!data.transfer) {
      status.textContent = 'Пожалуйста, укажите, нужен ли вам трансфер.';
      form.querySelector('input[name="transfer"]')?.focus();
      return;
    }

    const button = form.querySelector('.submit-button');
    button.disabled = true;
    button.textContent = 'Отправляем…';
    status.textContent = '';

    if (!FORM_ENDPOINT) {
      // Demo mode: keeps a local copy so the whole interaction can be tested.
      localStorage.setItem('wedding-rsvp-demo', JSON.stringify(data));
      await new Promise(resolve => setTimeout(resolve, 500));
      status.textContent = 'Демо-режим: ответы сохранены на этом устройстве. Подключение Google Drive сделаем отдельным шагом.';
      button.disabled = false;
      button.textContent = 'Ответы отправлены ✓';
      return;
    }

    try {
      await fetch(FORM_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      status.textContent = 'Спасибо! Ответы получили ❤️';
      form.reset();
      button.disabled = false;
      button.textContent = 'Отправить ответы';
    } catch (error) {
      console.error(error);
      status.textContent = 'Не удалось отправить ответы. Попробуйте ещё раз или свяжитесь с нами.';
      button.disabled = false;
      button.textContent = 'Отправить ответы';
    }
  });
})();
