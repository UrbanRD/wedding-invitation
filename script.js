
(() => {
  const revealItems = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach(el => observer.observe(el));

  // The RSVP form is ready for a Google Apps Script endpoint.
  // Put your deployed Apps Script URL here when we connect the form to Google Drive.
  const FORM_ENDPOINT = "";

  const form = document.getElementById('rsvp-form');
  const status = document.getElementById('form-status');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = {
      name: form.elements.name.value.trim(),
      attendance: form.elements.attendance?.value || "",
      food: form.elements.food.value,
      transfer: form.elements.transfer.value,
      additional: form.elements.additional.value.trim(),
      submittedAt: new Date().toISOString()
    };

    if (!data.attendance) {
      status.textContent = 'Пожалуйста, отметьте, к каким дням вы присоединитесь.';
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
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      status.textContent = 'Спасибо! Ответы получили ❤️';
      form.reset();
      button.disabled = false;
      button.textContent = 'Ответы отправлены ✓';
    } catch (error) {
      console.error(error);
      status.textContent = 'Не удалось отправить ответы. Попробуйте ещё раз или свяжитесь с нами.';
      button.disabled = false;
      button.textContent = 'Отправить ответы';
    }
  });
})();
