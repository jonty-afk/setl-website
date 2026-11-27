/* Never show setl.nz inside another site's frame. */
if (window.top !== window.self) {
  try {
    window.top.location.replace(window.self.location.href);
  } catch (e) {
    document.documentElement.style.display = 'none';
  }
}

// SETL website: a few small behaviours. No tracking. The only outside request is the exchange-rate
// lookup, and only after a visitor picks a currency themselves.
(function () {
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (!header) return;

  // The bar is see-through over the blue hero, then turns solid once you scroll.
  function onScroll() {
    header.classList.toggle('is-solid', window.scrollY > 24);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu.
  function setMenu(open) {
    header.classList.toggle('menu-open', open);
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setMenu(false);
    });
  }
})();

// Home page on tablets and phones: the hero is taller than it is wide there, so the
// curve (which stretches to fit its box) would turn into a steep spike through the
// text. Instead it keeps its natural shape and sits just above the front phone.
(function () {
  var hero = document.querySelector('.hero');
  var svg = hero && hero.querySelector('.hero-arc');
  var phone = hero && hero.querySelector('.hero-phones .phone--main');
  if (!svg || !phone) return;
  var stacked = window.matchMedia('(max-width: 1040px)');

  // Distance from the top of the hero, ignoring the phones' rise-in animation.
  function offsetWithin(el, ancestor) {
    var top = 0;
    while (el && el !== ancestor) {
      top += el.offsetTop;
      el = el.offsetParent;
    }
    return top;
  }

  function place() {
    if (!stacked.matches) {
      svg.style.top = svg.style.bottom = svg.style.height = '';
      return;
    }
    var height = Math.round(hero.clientWidth * 0.38); // the drawing's natural proportions
    var crestGap = 26; // the top of the curve sits this far above the front phone
    var top = offsetWithin(phone, hero) - crestGap + (height * 20) / 520;
    svg.style.top = Math.round(top) + 'px';
    svg.style.bottom = 'auto';
    svg.style.height = height + 'px';
  }

  place();
  window.addEventListener('resize', place);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
})();

// Home page: a small plane flies along the dotted line, and the dots vanish behind it.
(function () {
  var svg = document.querySelector('.hero .hero-arc');
  var plane = document.querySelector('.hero-plane');
  var route = document.getElementById('hero-route');
  var trail = document.getElementById('hero-trail-path');
  if (!svg || !plane || !route || !trail) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var length = route.getTotalLength();
  var DURATION = 9000;
  var DELAY = 600;
  var TAIL = 10; // the dots vanish just behind the plane's tail, hidden under it
  trail.setAttribute('stroke-dasharray', length + ' ' + length);

  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Turns a point on the line (in the drawing's own units) into page pixels, so the
  // plane stays the same size even though the drawing is stretched to fit the hero.
  function toPixels(point, matrix, host) {
    return {
      x: matrix.a * point.x + matrix.c * point.y + matrix.e - host.left,
      y: matrix.b * point.x + matrix.d * point.y + matrix.f - host.top,
    };
  }

  function frame(s, t) {
    var matrix = svg.getScreenCTM();
    if (!matrix) return;
    var host = svg.parentNode.getBoundingClientRect();
    var here = toPixels(route.getPointAtLength(s), matrix, host);
    var ahead = toPixels(route.getPointAtLength(Math.min(s + 2, length)), matrix, host);
    var angle = (Math.atan2(ahead.y - here.y, ahead.x - here.x) * 180) / Math.PI;
    plane.style.transform =
      'translate(' + here.x + 'px,' + here.y + 'px) translate(-50%,-50%) rotate(' + angle + 'deg)';
    plane.style.opacity = String(Math.min(1, t / 0.06, (1 - t) / 0.06) * 0.95);
    trail.setAttribute('stroke-dashoffset', String(-Math.max(0, s - TAIL)));
  }

  var start = null;
  function tick(now) {
    if (start === null) start = now + DELAY;
    var raw = (now - start) / DURATION;
    if (raw < 0) {
      requestAnimationFrame(tick);
      return;
    }
    if (raw >= 1) {
      plane.style.opacity = '0';
      // The plane has gone: bring the dotted line softly back.
      svg.classList.add('is-hidden');
      trail.setAttribute('stroke-dashoffset', '0');
      void svg.getBoundingClientRect();
      svg.classList.remove('is-hidden');
      return;
    }
    frame(ease(raw) * length, raw);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

// Home page: the front phone runs a small loop that fills in the checklist.
(function () {
  var screen = document.querySelector('.hero .screen');
  if (!screen) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // keeps the still screenshot

  var STEPS = [1300, 2700, 4300, 5900, 7500, 9100]; // when each step lands (ms)
  var LOOP = 13400;
  var timers = [];
  var running = false;

  function stop() {
    timers.forEach(clearTimeout);
    timers = [];
  }
  function clear() {
    for (var i = 1; i <= STEPS.length; i++) screen.classList.remove('s' + i);
  }
  function play() {
    stop();
    clear();
    STEPS.forEach(function (at, i) {
      timers.push(setTimeout(function () { screen.classList.add('s' + (i + 1)); }, at));
    });
    timers.push(setTimeout(play, LOOP));
  }

  screen.classList.add('is-live');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        if (!running) { running = true; play(); }
      } else {
        running = false;
        stop();
      }
    }).observe(screen);
  } else {
    play();
  }
})();

// Early-access form: saves the sign-up to SETL's private list (Supabase).
// Visitors can only add themselves; nobody can read the list from the website.
(function () {
  var forms = document.querySelectorAll('form[data-ea]');
  if (!forms.length) return;
  var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function monthOptions(select) {
    var date = new Date();
    date.setDate(1);
    for (var i = 0; i < 12; i++) {
      var label = date.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' });
      var option = document.createElement('option');
      option.value = label;
      option.textContent = label;
      select.appendChild(option);
      date.setMonth(date.getMonth() + 1);
    }
  }

  Array.prototype.forEach.call(forms, function (form) {
    var wrap = form.parentNode;
    var done = wrap.querySelector('.ea-done');
    var msg = form.querySelector('.ea-msg');
    var button = form.querySelector('.ea-submit');
    var nameInput = form.elements.name;
    var emailInput = form.elements.email;
    monthOptions(form.elements.flying);

    function showError(html, field) {
      msg.innerHTML = html;
      msg.hidden = false;
      if (field) {
        field.setAttribute('aria-invalid', 'true');
        field.focus();
      }
    }
    function clearError() {
      msg.hidden = true;
      nameInput.removeAttribute('aria-invalid');
      emailInput.removeAttribute('aria-invalid');
    }
    function finish() {
      form.hidden = true;
      done.hidden = false;
      done.focus();
    }
    [nameInput, emailInput].forEach(function (input) {
      input.addEventListener('input', function () {
        input.removeAttribute('aria-invalid');
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearError();
      var name = nameInput.value.trim();
      var email = emailInput.value.trim();
      if (!name) return showError('Please tell us your name.', nameInput);
      if (!EMAIL.test(email)) return showError('Please check your email address.', emailInput);
      if (form.elements.hp_leave_empty.value) return finish(); // a bot filled the hidden field

      button.disabled = true;
      button.textContent = 'Joining…';
      fetch(form.dataset.endpoint + '/rest/v1/early_access', {
        method: 'POST',
        headers: {
          apikey: form.dataset.key,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          name: name,
          email: email,
          city: form.elements.city.value || null,
          flying: form.elements.flying.value || null,
        }),
      })
        .then(function (res) {
          // 409 means this email is already on the list: that's a success too.
          if (res.ok || res.status === 409) return finish();
          throw new Error('status ' + res.status);
        })
        .catch(function () {
          showError(
            'Sorry, that didn&rsquo;t go through. Please try again, or email <a href="mailto:hello@setl.nz?subject=SETL%20early%20access">hello@setl.nz</a>.',
          );
        })
        .then(function () {
          button.disabled = false;
          button.textContent = 'Get early access';
        });
    });
  });
})();

/* Employer list: the form on /employers/ for businesses that want SETL Jobs. */
(function () {
  var forms = document.querySelectorAll('form[data-employer]');
  if (!forms.length) return;
  var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var PHONE = /^[0-9+() -]{6,30}$/;

  Array.prototype.forEach.call(forms, function (form) {
    var wrap = form.parentNode;
    var done = wrap.querySelector('.ea-done');
    var again = wrap.querySelector('.ea-again');
    var msg = form.querySelector('.ea-msg');
    var button = form.querySelector('.ea-submit');
    var fields = form.elements;
    var checked = [fields.business, fields.phone, fields.email];

    function showError(html, field) {
      msg.innerHTML = html;
      msg.hidden = false;
      if (field) {
        field.setAttribute('aria-invalid', 'true');
        field.focus();
      }
    }
    function clearError() {
      msg.hidden = true;
      checked.forEach(function (input) {
        input.removeAttribute('aria-invalid');
      });
    }
    function finish() {
      form.hidden = true;
      done.hidden = false;
      done.focus();
    }
    checked.forEach(function (input) {
      input.addEventListener('input', function () {
        input.removeAttribute('aria-invalid');
      });
    });
    // "Add another business": keep the contact details, clear the business.
    again.addEventListener('click', function () {
      fields.business.value = '';
      fields.roles.value = '';
      fields.type.value = '';
      done.hidden = true;
      form.hidden = false;
      fields.business.focus();
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearError();
      var business = fields.business.value.trim();
      var phone = fields.phone.value.trim();
      var email = fields.email.value.trim();
      if (business.length < 2) return showError('Please add the business name.', fields.business);
      if (!phone && !email) return showError('Please add a phone number or an email.', fields.phone);
      if (phone && !PHONE.test(phone)) return showError('Please check the phone number.', fields.phone);
      if (email && !EMAIL.test(email)) return showError('Please check the email address.', fields.email);
      if (fields.hp_leave_empty.value) return finish(); // a bot filled the hidden field

      button.disabled = true;
      button.textContent = 'Joining…';
      fetch(form.dataset.endpoint + '/rest/v1/job_interest', {
        method: 'POST',
        headers: {
          apikey: form.dataset.key,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          kind: 'employer',
          business: business,
          contact_name: fields.contact.value.trim() || null,
          phone: phone || null,
          email: email || null,
          city: fields.city.value || null,
          business_type: fields.type.value || null,
          roles: fields.roles.value.trim() || null,
        }),
      })
        .then(function (res) {
          if (res.ok || res.status === 409) return finish();
          throw new Error('status ' + res.status);
        })
        .catch(function () {
          showError(
            'Sorry, that didn&rsquo;t go through. Please try again, or email <a href="mailto:hello@setl.nz?subject=SETL%20Jobs%20for%20employers">hello@setl.nz</a>.',
          );
        })
        .then(function () {
          button.disabled = false;
          button.textContent = 'Join the employer list';
        });
    });
  });
})();

/* Partner enquiries: the form on /partners/ for hostels, motels and property managers. */
(function () {
  var form = document.querySelector('form[data-partner]');
  if (!form) return;
  var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var PHONE = /^[0-9+() -]{6,30}$/;
  var wrap = form.parentNode;
  var done = wrap.querySelector('.ea-done');
  var msg = form.querySelector('.ea-msg');
  var button = form.querySelector('.ea-submit');
  var fields = form.elements;
  var checked = [fields.place, fields.contact, fields.phone, fields.email];
  var LABEL = 'Send enquiry';

  function showError(html, field) {
    msg.innerHTML = html;
    msg.hidden = false;
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.focus();
    }
  }
  function clearError() {
    msg.hidden = true;
    checked.forEach(function (input) {
      input.removeAttribute('aria-invalid');
    });
  }
  function finish() {
    form.hidden = true;
    done.hidden = false;
    done.focus();
  }
  checked.forEach(function (input) {
    input.addEventListener('input', function () {
      input.removeAttribute('aria-invalid');
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearError();
    var place = fields.place.value.trim();
    var contact = fields.contact.value.trim();
    var phone = fields.phone.value.trim();
    var email = fields.email.value.trim();
    if (place.length < 2) return showError('Please add the name of your place.', fields.place);
    if (!contact) return showError('Please add your name.', fields.contact);
    if (!phone && !email) return showError('Please add a phone number or an email.', fields.phone);
    if (phone && !PHONE.test(phone)) return showError('Please check the phone number.', fields.phone);
    if (email && !EMAIL.test(email)) return showError('Please check the email address.', fields.email);
    if (fields.hp_leave_empty.value) return finish(); // a bot filled the hidden field

    button.disabled = true;
    button.textContent = 'Sending…';
    fetch(form.dataset.endpoint + '/rest/v1/partner_enquiries', {
      method: 'POST',
      headers: {
        apikey: form.dataset.key,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        place: place,
        place_type: fields.type.value || null,
        city: fields.city.value || null,
        rooms: fields.rooms.value.trim() || null,
        contact_name: contact,
        role: fields.role.value.trim() || null,
        phone: phone || null,
        email: email || null,
        message: fields.message.value.trim() || null,
      }),
    })
      .then(function (res) {
        if (res.ok) return finish();
        throw new Error('status ' + res.status);
      })
      .catch(function () {
        showError(
          'Sorry, that didn&rsquo;t go through. Please try again, or email <a href="mailto:hello@setl.nz?subject=Partnering%20with%20SETL">hello@setl.nz</a>.',
        );
      })
      .then(function () {
        button.disabled = false;
        button.textContent = LABEL;
      });
  });
})();

// Schedule a call (Video call page). Pressing a founder's button opens one small
// form under the two buttons. "Send on WhatsApp" does two things: it saves the
// request to SETL's database (which emails the team), and it opens WhatsApp with
// the details already typed, so the visitor only has to press send there.
(function () {
  var sched = document.querySelector('[data-call-sched]');
  if (!sched) return;
  var picks = sched.querySelectorAll('[data-call-pick]');
  var form = sched.querySelector('.call-form');
  var title = sched.querySelector('[data-call-title]');
  var nameInput = sched.querySelector('[data-name-input]');
  var waInput = sched.querySelector('[data-wa-input]');
  var day = sched.querySelector('[data-day]');
  var parents = sched.querySelector('[data-parents]');
  var trap = sched.querySelector('[data-hp]');
  var error = sched.querySelector('[data-call-error]');
  var done = sched.querySelector('[data-call-done]');
  var send = sched.querySelector('[data-send]');
  if (!form || !send || !picks.length) return;
  var PHONE = /^[0-9+() -]{6,30}$/;
  var current = null;

  var zone = '';
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch (e) {}
  if (!/^[A-Za-z0-9_+\/-]{1,60}$/.test(zone)) zone = '';

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }
  var now = new Date();
  if (day) day.min = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());

  function niceDay(value) {
    var parts = value.split('-');
    if (parts.length !== 3) return '';
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    try {
      return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch (e) {
      return value;
    }
  }
  function timeChosen() {
    var chip = form.querySelector('.call-chip.is-on');
    return chip ? chip.getAttribute('data-value') : 'any time';
  }

  // Keeps the WhatsApp link in step with what has been chosen and typed.
  function update() {
    if (!current) return;
    var who = current.getAttribute('data-name');
    var text = 'Hi ' + who + ', I would like a video call about SETL.';
    var name = nameInput.value.trim();
    if (name) text += ' My name is ' + name + '.';
    text += ' Day: ' + (day.value ? niceDay(day.value) : 'any day') + '.';
    text += ' Time: ' + timeChosen() + (zone ? ' (' + zone + ' time)' : ' (my local time)') + '.';
    if (parents.checked) text += ' My parents will join the call.';
    send.href = 'https://wa.me/' + current.getAttribute('data-number') + '?text=' + encodeURIComponent(text);
    send.textContent = 'Send to ' + who + ' on WhatsApp';
  }

  function clearError() {
    error.hidden = true;
    nameInput.removeAttribute('aria-invalid');
    waInput.removeAttribute('aria-invalid');
  }
  function showError(message, input) {
    error.textContent = message;
    error.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.focus();
  }

  picks.forEach(function (pick) {
    pick.addEventListener('click', function () {
      var closing = current === pick && !form.hidden;
      current = closing ? null : pick;
      form.hidden = closing;
      picks.forEach(function (other) {
        var on = other === current;
        other.classList.toggle('is-on', on);
        other.setAttribute('aria-expanded', String(on));
      });
      if (closing) return;
      title.textContent = 'Video call with ' + pick.getAttribute('data-name');
      done.hidden = true;
      clearError();
      update();
    });
  });

  form.addEventListener('click', function (event) {
    var chip = event.target.closest('.call-chip');
    if (!chip) return;
    form.querySelectorAll('.call-chip').forEach(function (other) {
      var on = other === chip;
      other.classList.toggle('is-on', on);
      other.setAttribute('aria-pressed', String(on));
    });
    update();
  });
  form.addEventListener('input', function () {
    clearError();
    update();
  });
  form.addEventListener('change', update);

  send.addEventListener('click', function (event) {
    clearError();
    var name = nameInput.value.trim();
    var whatsapp = waInput.value.trim();
    if (!current) return event.preventDefault();
    if (!name) {
      event.preventDefault();
      return showError('Please tell us your name.', nameInput);
    }
    if (!PHONE.test(whatsapp)) {
      event.preventDefault();
      return showError('Please check your WhatsApp number. Include the country code, like +91.', waInput);
    }
    update();
    done.hidden = false;
    if (trap && trap.value) return; // a bot filled the hidden field: save nothing

    // Save the request; the database then emails the team. This must never block
    // WhatsApp opening, so nothing waits on it and a failure is silent here: the
    // WhatsApp message still reaches us.
    try {
      fetch(sched.getAttribute('data-endpoint') + '/rest/v1/call_requests', {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: sched.getAttribute('data-key'),
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          name: name,
          whatsapp: whatsapp,
          with_whom: current.getAttribute('data-id'),
          day: day.value || null,
          time_of_day: timeChosen(),
          time_zone: zone || null,
          parents: parents.checked,
        }),
      }).catch(function () {});
    } catch (e) {}
  });
})();

// Currency switch. Prices are written in NZ dollars (what SETL charges). A visitor can see
// them as "about" figures in their own currency. Rates are baked in at build time and, if the
// visitor picks a currency, refreshed from the free daily rate service (nothing personal sent).
(function () {
  var selects = document.querySelectorAll('[data-currency]');
  var holder = document.body;
  if (!selects.length || !holder.dataset.currencyData) return;
  var data;
  try { data = JSON.parse(holder.dataset.currencyData); } catch (e) { return; }
  var rates = data.rates;
  var ratesDate = data.date;
  var info = {};
  data.list.forEach(function (c) { info[c.c] = c; });

  function store(key, value) {
    try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch (e) {}
  }
  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function nice(v) {
    if (v >= 100) {
      var m = Math.pow(10, Math.floor(Math.log10(v)) - 2);
      return Math.round(v / m) * m;
    }
    if (v >= 10) return Math.round(v);
    return Math.round(v * 10) / 10;
  }
  function plain(n) { return '$' + n.toLocaleString('en-NZ'); }
  function fmt(n, code) {
    var c = info[code];
    if (code === 'NZD' || !c || !rates[code]) return plain(n);
    return c.s + nice(n * rates[code]).toLocaleString('en-US');
  }

  function render(code) {
    document.querySelectorAll('[data-nzd]').forEach(function (el) {
      var from = Number(el.dataset.nzd);
      var to = el.dataset.nzdTo ? Number(el.dataset.nzdTo) : null;
      var text = fmt(from, code);
      if (to !== null) {
        var end = fmt(to, code);
        if (code !== 'NZD' && info[code]) end = end.replace(info[code].s, '');
        text += '\u2013' + end;
      }
      if (code !== 'NZD' && el.hasAttribute('data-both')) {
        el.classList.add('nzd-both');
        el.textContent = text;
        var small = document.createElement('small');
        small.textContent = 'about, you pay NZ' + plain(from);
        el.appendChild(small);
      } else {
        el.classList.remove('nzd-both');
        el.textContent = code === 'NZD' ? text : '\u2248 ' + text;
      }
    });
    selects.forEach(function (s) { s.value = code; });
    document.documentElement.setAttribute('data-currency-now', code);
    var note = document.querySelector('[data-currency-note]');
    if (note) {
      if (code === 'NZD' || !info[code]) {
        note.hidden = true;
      } else {
        note.hidden = false;
        note.textContent = '';
        note.append(
          'Shown in ' + info[code].n + ' as an estimate, using 1 NZ$ = ' + (rates[code] < 10 ? rates[code].toFixed(2) : Math.round(rates[code] * 100) / 100).toLocaleString('en-US') +
          ' ' + code + ' (rate of ' + ratesDate + '). You pay in NZ dollars, so the final amount in your own money can differ a little. Rates by '
        );
        var a = document.createElement('a');
        a.href = 'https://www.exchangerate-api.com';
        a.rel = 'noopener';
        a.textContent = 'Exchange Rate API';
        note.append(a, '.');
      }
    }
  }

  // Refresh the rates from the live service, at most twice a day, and only after the visitor chose.
  function refresh(code) {
    var cached = null;
    try { cached = JSON.parse(load('setl.rates') || 'null'); } catch (e) {}
    var fresh = cached && cached.at && Date.now() - cached.at < 12 * 3600 * 1000;
    if (fresh) {
      rates = Object.assign({}, rates, cached.rates);
      ratesDate = cached.date;
      render(code);
      return;
    }
    fetch(data.url, { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (live) {
        if (!live || live.result !== 'success' || !live.rates) return;
        var next = {};
        Object.keys(rates).forEach(function (k) { if (live.rates[k]) next[k] = live.rates[k]; });
        rates = Object.assign({}, rates, next);
        ratesDate = new Date(live.time_last_update_utc).toISOString().slice(0, 10);
        store('setl.rates', JSON.stringify({ at: Date.now(), date: ratesDate, rates: next }));
        render(load('setl.currency') || code);
      })
      .catch(function () {});
  }

  function choose(code, picked) {
    if (code !== 'NZD' && !info[code]) code = 'NZD';
    store('setl.currency', code);
    if (picked) store('setl.currency.picked', '1');
    render(code);
    if (code !== 'NZD' && load('setl.currency.picked')) refresh(code);
  }

  selects.forEach(function (s) {
    s.addEventListener('change', function () { choose(s.value, true); });
  });

  // Always starts in NZ dollars, what SETL really charges, unless the visitor chose another currency before.
  var saved = load('setl.currency') || 'NZD';
  render(saved);
  if (saved !== 'NZD' && load('setl.currency.picked')) refresh(saved);
})();
