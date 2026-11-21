// SETL website: a few small behaviours. No tracking, no external requests.
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

// Home page: a small plane flies along the dotted line, and the dots vanish behind it.
(function () {
  var svg = document.querySelector('.hero .hero-arc');
  var plane = document.querySelector('.hero-plane');
  var route = document.getElementById('hero-route');
  var trail = document.getElementById('hero-trail-path');
  if (!svg || !plane || !route || !trail) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerWidth <= 600) return; // on phones the line stays still

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
      if (form.elements.company.value) return finish(); // a bot filled the hidden field

      button.disabled = true;
      button.textContent = 'Joining…';
      fetch(form.dataset.endpoint + '/rest/v1/early_access', {
        method: 'POST',
        headers: {
          apikey: form.dataset.key,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ name: name, email: email, flying: form.elements.flying.value || null }),
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
