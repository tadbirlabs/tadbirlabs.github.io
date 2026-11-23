// Home pages only: plays the short app story from real screens.
// Sends nothing and stores nothing. Each language has its own image folder,
// so a new language needs its screens and its captions in the page.
(function () {
  var root = document.querySelector('[data-story]');
  if (!root) return;

  var screens = Array.prototype.slice.call(root.querySelectorAll('.story-screen'));
  var captions = Array.prototype.slice.call(root.querySelectorAll('.story-steps li'));
  var toggle = root.querySelector('.story-toggle');
  var times = [2400, 2600, 2400, 3400, 3600];
  var focusStep = 3;
  var current = 0;
  var timer = null;
  var paused = false;
  var visible = true;
  var ready = false;

  var show = function (index) {
    current = index;
    screens.forEach(function (screen, i) { screen.classList.toggle('is-active', i === index); });
    captions.forEach(function (caption, i) { caption.classList.toggle('is-active', i === index); });
    root.classList.toggle('is-focus', index === focusStep);
  };

  var stop = function () {
    if (timer) window.clearTimeout(timer);
    timer = null;
  };
  var schedule = function () {
    stop();
    if (!ready || paused || !visible || document.hidden) return;
    timer = window.setTimeout(function () {
      show((current + 1) % screens.length);
      schedule();
    }, times[current] || 2600);
  };

  var load = function (screen) {
    if (screen.dataset.src && !screen.getAttribute('src')) screen.src = screen.dataset.src;
    return screen.decode ? screen.decode().catch(function () {}) : Promise.resolve();
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    load(screens[focusStep]).then(function () { show(focusStep); });
    if (toggle) toggle.hidden = true;
    return;
  }

  root.classList.add('is-live');
  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener('click', function () {
      paused = !paused;
      toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
      toggle.setAttribute('aria-label', paused ? toggle.dataset.play : toggle.dataset.pause);
      schedule();
    });
  }
  document.addEventListener('visibilitychange', schedule);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[entries.length - 1].isIntersecting;
      schedule();
    }, { threshold: 0.2 }).observe(root);
  }

  var start = function () {
    Promise.all(screens.map(load)).then(function () {
      ready = true;
      schedule();
    });
  };
  start();
})();
