'use strict';
(() => {
  const products = window.shopProducts;
  const modalElement = document.getElementById('order-modal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  const modalForm = modalElement.querySelector('form');
  const editPanel = modalElement.querySelector('[data-modal-edit]');
  const reviewPanel = modalElement.querySelector('[data-modal-review]');
  const donePanel = modalElement.querySelector('[data-modal-done]');
  const title = document.getElementById('modal-title');
  const description = document.getElementById('modal-description');
  let sourceForm = null;
  let returnFocus = null;
  let pendingFocus = null;
  let currentStep = 'edit';
  const labels = {name:'Ваше имя', email:'Электронная почта', phone:'Телефон', product:'Товар', agreement:'Согласие'};
  function errorFor(field) {
    if (field.name === 'name' && field.value.trim().length < 2) return 'Введите имя: не менее двух символов.';
    if (field.name === 'email' && (!field.value.trim() || !field.validity.valid)) return 'Введите корректный e-mail, например student@example.com.';
    if (field.name === 'phone') {
      const digits = field.value.replace(/\D/g, '');
      if (!/^[+\d\s()-]+$/.test(field.value) || digits.length < 10 || digits.length > 15) return 'Введите телефон: от 10 до 15 цифр. Допустимы +, пробелы, скобки и дефис.';
    }
    if (field.name === 'product' && !Object.hasOwn(products, field.value)) return 'Выберите товар из списка.';
    if (field.name === 'agreement' && !field.checked) return 'Подтвердите согласие для проверки учебной формы.';
    return '';
  }
  function validate(form, moveFocus = false) {
    const errors = [];
    for (const field of form.querySelectorAll('[required]')) {
      const message = errorFor(field);
      const feedback = document.getElementById(field.id + '-error');
      feedback.textContent = message;
      field.classList.toggle('is-invalid', Boolean(message));
      if (message) { field.setAttribute('aria-invalid','true'); errors.push({field,message}); }
      else field.removeAttribute('aria-invalid');
    }
    const list = form.querySelector('[data-error-list]');
    list.replaceChildren();
    for (const {field,message} of errors) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#' + field.id;
      link.textContent = labels[field.name] + ': ' + message;
      link.addEventListener('click', event => {event.preventDefault();field.focus();});
      li.append(link); list.append(li);
    }
    form.querySelector('[data-error-summary]').classList.toggle('d-none', !errors.length);
    if (moveFocus && errors.length) errors[0].field.focus();
    return errors.length === 0;
  }
  function setStep(step) {
    currentStep = step;
    editPanel.hidden = step !== 'edit';
    reviewPanel.hidden = step !== 'review';
    donePanel.hidden = step !== 'done';
    title.textContent = {edit:'Расскажите о себе',review:'Проверьте заявку',done:'Заявка подтверждена'}[step];
    description.hidden = step !== 'edit';
  }
  function fillReview(form) {
    const values = new FormData(form);
    const product = products[values.get('product')];
    const items = [['Товар',product.name],['Учебная цена',product.price + ' ₽'],['Имя',values.get('name').trim()],['E-mail',values.get('email').trim()],['Телефон',values.get('phone').trim()],['Комментарий',values.get('comment').trim()],['Согласие','Подтверждено']];
    const details = modalElement.querySelector('[data-review-details]');
    details.replaceChildren();
    for (const [label,value] of items) {
      const term = document.createElement('dt'); term.textContent = label;
      const content = document.createElement('dd'); content.textContent = value || 'Не указан';
      details.append(term,content);
    }
  }
  for (const form of document.querySelectorAll('[data-order-form]')) {
    form.addEventListener('submit', event => {
      event.preventDefault(); form.dataset.validated = 'true';
      if (!validate(form, true)) return;
      sourceForm = form; fillReview(form); setStep('review');
      if (form !== modalForm) {returnFocus = form.querySelector('[type=submit]'); modal.show();}
      else modalElement.querySelector('[data-confirm]').focus();
    });
    const update = () => {if (form.dataset.validated) validate(form);};
    form.addEventListener('input', update); form.addEventListener('change', update);
    form.addEventListener('reset', () => {
      delete form.dataset.validated;
      for (const field of form.querySelectorAll('.is-invalid')) {field.classList.remove('is-invalid');field.removeAttribute('aria-invalid');}
      for (const error of form.querySelectorAll('.invalid-feedback')) error.textContent = '';
      form.querySelector('[data-error-summary]').classList.add('d-none');
      form.querySelector('[data-error-list]').replaceChildren();
      const success = document.querySelector('[data-page-success]');
      if (success) success.classList.add('d-none');
    });
  }
  for (const trigger of document.querySelectorAll('[data-quick-order]')) {
    trigger.addEventListener('click', () => {
      returnFocus = trigger; sourceForm = modalForm; pendingFocus = null;
      modalForm.reset(); modalForm.elements.product.value = trigger.dataset.quickOrder;
      setStep('edit'); modal.show();
    });
  }
  // Explicitly wrap Tab at the boundaries, including browser chrome navigation.
  modalElement.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(modalElement.querySelectorAll('a[href], button, input, select, textarea, [tabindex]'))
      .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first) {event.preventDefault();modalElement.focus();return;}
    if (event.shiftKey && (document.activeElement === first || document.activeElement === modalElement)) {
      event.preventDefault();last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === modalElement)) {
      event.preventDefault();first.focus();
    }
  });
  modalElement.addEventListener('shown.bs.modal', () => {
    if (currentStep === 'edit') modalForm.elements.name.focus();
    else if (currentStep === 'review') modalElement.querySelector('[data-confirm]').focus();
  });
  modalElement.querySelector('[data-edit]').addEventListener('click', () => {
    if (sourceForm === modalForm) {setStep('edit');modalForm.elements.name.focus();}
    else {pendingFocus = sourceForm.elements.name;modal.hide();}
  });
  modalElement.querySelector('[data-confirm]').addEventListener('click', () => {
    // Validate the source again before finishing; nothing is sent to a server.
    if (!sourceForm || !validate(sourceForm)) return;
    sourceForm.reset(); setStep('done');
    const success = document.querySelector('[data-page-success]');
    if (sourceForm !== modalForm && success) success.classList.remove('d-none');
    donePanel.querySelector('button').focus();
  });
  modalElement.addEventListener('hidden.bs.modal', () => {
    if (sourceForm === modalForm) modalForm.reset();
    modalElement.querySelector('[data-review-details]').replaceChildren();
    const focus = pendingFocus || returnFocus;
    pendingFocus = null;
    if (focus && document.contains(focus)) focus.focus();
  });
  const pageForm = document.querySelector('.form-panel form');
  if (pageForm) {
    const product = new URLSearchParams(location.search).get('product');
    if (Object.hasOwn(products, product)) pageForm.elements.product.value = product;
  }
  const filter = document.getElementById('category-filter');
  if (filter) filter.addEventListener('change', () => {
    let count = 0;
    for (const item of document.querySelectorAll('[data-catalog-category]')) {
      item.hidden = filter.value !== 'all' && filter.value !== item.dataset.catalogCategory;
      if (!item.hidden) count++;
    }
    document.getElementById('catalog-count').textContent = 'Показано товаров: ' + count;
  });
  for (const button of document.querySelectorAll('[data-gallery]')) button.addEventListener('click', () => {
    const img = document.getElementById('product-image');
    img.src = button.dataset.gallery; img.alt = button.dataset.galleryAlt;
    for (const other of document.querySelectorAll('[data-gallery]')) other.setAttribute('aria-pressed', String(other === button));
  });
})();
