// Home pages only: the phone menu and the phone download bar.
// Sends nothing and stores nothing.
(function () {
  var nav = document.querySelector('.nav');
  var button = nav && nav.querySelector('.menu-btn');

  if (button) {
    var setOpen = function (open) {
      nav.classList.toggle('open', open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    button.addEventListener('click', function () {
      setOpen(!nav.classList.contains('open'));
    });
    nav.querySelector('.nav-links').addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });
    nav.addEventListener('focusout', function (event) {
      if (event.relatedTarget && !nav.contains(event.relatedTarget)) setOpen(false);
    });
    document.addEventListener('click', function (event) {
      if (!nav.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('open')) {
        setOpen(false);
        button.focus();
      }
    });
  }

  var bar = document.getElementById('getbar');
  var heroBadges = document.querySelector('.hero .badges');
  var getSection = document.getElementById('get');
  if (!bar || !heroBadges || !getSection) return;

  // One tap to the right store. Other devices go to the section with both stores.
  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/.test(ua);
  var store = isIOS ? heroBadges.querySelector('a[href*="apps.apple.com"]')
    : isAndroid ? heroBadges.querySelector('a[href*="play.google.com"]')
    : null;
  if (store) bar.querySelector('[data-store-link]').href = store.href;

  // Shown only between the two sets of store buttons.
  var update = function () {
    var pastHero = heroBadges.getBoundingClientRect().bottom < 0;
    var beforeGet = getSection.getBoundingClientRect().top > window.innerHeight;
    bar.hidden = !(pastHero && beforeGet);
  };
  var waiting = false;
  var schedule = function () {
    if (waiting) return;
    waiting = true;
    window.requestAnimationFrame(function () {
      waiting = false;
      update();
    });
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  document.addEventListener('toggle', schedule, true);
  update();
})();
