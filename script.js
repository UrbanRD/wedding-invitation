/*
  Static-site interactions for the wedding invitation.
  To enable Google Drive form submission, paste the deployed Apps Script URL
  into APPS_SCRIPT_URL below (see README.md and google-apps-script/Code.gs).
*/
(() => {
  "use strict";
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzyR1C7wJycqJynC3PTH-xHTQH3SD_qeUduggcram5ipf7fzGV5EleZRRiGUkeSWgXDNg/exec"; // Example: https://script.google.com/macros/s/DEPLOYMENT_ID/exec
  document.documentElement.classList.add("js-enabled");
  // The phone shows exactly the desktop layout (same as <meta name="viewport" content="width=1200"> in index.html).
  document.querySelector('meta[name="viewport"]')?.setAttribute("content", "width=1200");

  // Soft reveal animations. If IntersectionObserver is unavailable, content remains visible.
  const revealElements = document.querySelectorAll(".reveal");
  const footer = document.querySelector(".site-footer");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });

    revealElements.forEach((element) => revealObserver.observe(element));
    if (footer) {
      const footerObserver = new IntersectionObserver((entries, observer) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          footer.classList.add("is-visible");
          observer.disconnect();
        }
      }, { threshold: 0.08 });
      footerObserver.observe(footer);
    }
  } else {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    footer?.classList.add("is-visible");
  }

  // Flowers (bouqette…bouqette5, three-tulips) scroll slightly slower than the background.
  const parallaxImages = document.querySelectorAll('img[src*="bouqette"], img[src*="three-tulips"]');
  if (parallaxImages.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let ticking = false;
    const updateParallax = () => {
      parallaxImages.forEach((image) => {
        const rect = image.getBoundingClientRect();
        const center = rect.top + rect.height / 2 - (Number(image.dataset.parallax) || 0);
        const limit = window.innerHeight * 0.1;
        const offset = Math.max(-limit, Math.min(limit, (window.innerHeight / 2 - center) * 0.1));
        image.dataset.parallax = offset.toFixed(1);
        image.style.translate = `0 ${offset.toFixed(1)}px`;
      });
      ticking = false;
    };
    const requestParallax = () => {
      if (!ticking) { ticking = true; window.requestAnimationFrame(updateParallax); }
    };
    window.addEventListener("scroll", requestParallax, { passive: true });
    window.addEventListener("resize", requestParallax);
    updateParallax();
  }

  const form = document.getElementById("rsvpForm");
  const status = document.getElementById("formStatus");
  if (!form || !status) return;

  const byName = (name) => Array.from(form.querySelectorAll(`[name="${name}"]`));
  const selectedValues = (name) => byName(name).filter((input) => input.checked).map((input) => input.value);
  const selectedValue = (name) => (byName(name).find((input) => input.checked) || {}).value || "";
  const textValue = (name) => String(form.elements[name].value || "").trim();

  // In attendance, guests may choose either day or both; "can't attend" excludes both.
  // In drinks, guests may choose any combination; "I don't drink alcohol" excludes all others.
  function applyExclusiveChoice(event) {
    const changed = event.target;
    if (!(changed instanceof HTMLInputElement) || changed.type !== "checkbox") return;
    const exclusiveGroup = changed.dataset.exclusive;
    const regularGroup = changed.dataset.exclusiveGroup;

    if (exclusiveGroup && changed.checked) {
      form.querySelectorAll(`[data-exclusive-group="${exclusiveGroup}"]`).forEach((input) => { input.checked = false; });
    } else if (regularGroup && changed.checked) {
      const exclusive = form.querySelector(`[data-exclusive="${regularGroup}"]`);
      if (exclusive) exclusive.checked = false;
    }

    if (exclusiveGroup || regularGroup) {
      const group = exclusiveGroup || regularGroup;
      const fieldset = document.getElementById(group === "attendance" ? "attendanceGroup" : "drinksGroup");
      fieldset?.classList.remove("is-invalid");
      if (status.classList.contains("is-error")) clearStatus();
    }
  }

  form.addEventListener("change", applyExclusiveChoice);

  function clearStatus() {
    status.textContent = "";
    status.classList.remove("is-error");
  }

  function showError(message, element) {
    status.textContent = message;
    status.classList.add("is-error");
    if (element) {
      element.classList.add("is-invalid");
      const target = element.querySelector("input, textarea, button") || element;
      target.focus?.({ preventScroll: true });
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function collectPayload() {
    const name = textValue("guestName");
    return {
      guestName: name,
      answers: [
        { question: "Ваше имя", answer: name },
        { question: "Присоединитесь ли вы к нам?", answer: selectedValues("attendance") },
        { question: "С кем вы будете?", answer: textValue("seating") },
        { question: "Ваши предпочтения по еде", answer: textValue("food") },
        { question: "Ваши предпочтения по напиткам", answer: selectedValues("drinks") },
        { question: "Нужен ли вам трансфер в день банкета?", answer: selectedValue("transfer") },
        { question: "Планируете ли вы остаться на базе отдыха на ночь?", answer: selectedValue("overnight") },
        { question: "Дополнительно", answer: textValue("additional") }
      ],
      submittedAt: new Date().toISOString()
    };
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearStatus();
    form.querySelectorAll(".question.is-invalid").forEach((element) => element.classList.remove("is-invalid"));

    if (!textValue("guestName")) {
      showError("Пожалуйста, укажите ваше имя.", form.querySelector(".question-name"));
      return;
    }
    if (!selectedValues("attendance").length) {
      showError("Пожалуйста, укажите, сможете ли вы присоединиться к нам.", document.getElementById("attendanceGroup"));
      return;
    }
    if (!selectedValues("drinks").length) {
      showError("Пожалуйста, укажите предпочтения по напиткам.", document.getElementById("drinksGroup"));
      return;
    }
    if (!selectedValue("transfer")) {
      showError("Пожалуйста, выберите вариант трансфера.", document.getElementById("transferGroup"));
      return;
    }
    if (!selectedValue("overnight")) {
      showError("Пожалуйста, укажите, планируете ли вы остаться на ночь.", document.getElementById("overnightGroup"));
      return;
    }

    const payload = collectPayload();
    if (!APPS_SCRIPT_URL.trim()) {
      status.textContent = "Анкета проверена. Чтобы ответы сохранялись в Google Drive, нужно подключить адрес Google Apps Script по инструкции в README.md.";
      return;
    }

    const submitButton = form.querySelector(".submit-button");
    submitButton.disabled = true;
    submitButton.textContent = "Отправляем…";
    try {
      const body = new URLSearchParams({ payload: JSON.stringify(payload) });
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body
      });
      status.textContent = "Спасибо! Запрос с вашими ответами отправлен. Если потребуется изменить ответы, пожалуйста, свяжитесь с нами.";
      form.reset();
    } catch (error) {
      console.error("Не удалось отправить ответы анкеты:", error);
      showError("Не удалось отправить ответы. Проверьте интернет-соединение и попробуйте ещё раз.", null);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Отправить ответы";
    }
  });
})();
