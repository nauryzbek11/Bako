/**
 * ============================
 * script.js — Главная логика фронтенда
 * Зависит от: CONTENT/content.js (window.invitation)
 * ============================
 */

"use strict";

// =====================
// ДАННЫЕ ИЗ content.js
// =====================
const inv = window.invitation;

function initInvitationVideo() {
  const video = document.getElementById("invitation-video");
  const play = document.getElementById("video-play");
  const error = document.getElementById("video-error");
  if (!video || !inv.video) return;
  video.src = inv.video;
  video.poster = inv.photos?.[0] || "";
  const pauseMusic = () => {
    if (audio) audio.pause();
    musicPlaying = false;
    updateMusicBtn();
  };
  play.addEventListener("click", async () => {
    error.hidden = true;
    pauseMusic();
    play.hidden = true;
    try {
      await video.play();
      video.focus();
    } catch {
      play.hidden = false;
      error.hidden = false;
    }
  });
  video.addEventListener("play", () => { pauseMusic(); play.hidden = true; });
  video.addEventListener("loadedmetadata", () => {
    video.parentElement.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
  });
  video.addEventListener("error", () => { error.hidden = false; play.hidden = false; });
  document.addEventListener("visibilitychange", () => { if (document.hidden) video.pause(); });
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) video.pause();
  }).observe(video);
}

function initHeroSlideshow() {
  const container = document.getElementById("hero-slides");
  const toggle = document.getElementById("slideshow-toggle");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const slides = [];
  let current = 0;
  let timer;
  let paused = motion.matches;
  let inView = true;
  const sync = () => {
    clearInterval(timer);
    toggle.textContent = paused ? "▷" : "Ⅱ";
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Фотослайдтарды қосу" : "Фотослайдтарды тоқтату");
    container.classList.toggle("paused", paused || document.hidden || !inView);
    if (paused || document.hidden || !inView || !envelopeOpened || slides.length < 2) return;
    timer = setInterval(() => {
      slides[current].classList.remove("active");
      current = (current + 1) % slides.length;
      slides[current].classList.add("active");
    }, 6500);
  };
  // Load in order; broken photos are skipped without a blank frame.
  async function loadSlides() {
    for (const src of (inv.photos || []).slice(0, 4)) {
      const img = new Image();
      img.alt = "";
      img.className = "hero-slide";
      const loaded = await new Promise(resolve => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
      });
      if (!loaded) continue;
      container.appendChild(img);
      slides.push(img);
      if (slides.length === 1) img.classList.add("active");
      sync();
    }
    toggle.hidden = slides.length < 2;
  }
  toggle.addEventListener("click", () => { paused = !paused; sync(); });
  motion.addEventListener("change", () => { paused = motion.matches; sync(); });
  document.addEventListener("visibilitychange", sync);
  document.addEventListener("invitation:opened", sync);
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); })
    .observe(document.getElementById("hero"));
  const sparkles = document.getElementById("hero-sparkles");
  for (let i = 0; i < 18; i++) {
    const particle = document.createElement("i");
    particle.style.cssText = `--x:${(i * 37) % 100}%;--delay:${-i * 0.9}s;--duration:${9 + i % 7}s`;
    sparkles.appendChild(particle);
  }
  sync();
  loadSlides();
}

function initBackToTop() {
  const back = document.getElementById("back-to-top");
  const hero = document.getElementById("hero");
  const update = () => back.classList.toggle("visible", envelopeOpened && window.scrollY > 160);
  window.addEventListener("scroll", update, { passive: true });
  document.addEventListener("invitation:opened", update);
  back.addEventListener("click", event => {
    event.preventDefault();
    hero.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  });
  update();
}

// =====================
// УТИЛИТЫ
// =====================

/** Безопасно устанавливает innerHTML (только текст, без XSS) */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/** Устанавливает атрибут элемента */
function setAttr(id, attr, value) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(attr, value);
}

/** Ждёт несколько мс */
function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// =====================
// ЗАПОЛНЕНИЕ ДАННЫХ ИЗ content.js
// =====================
function fillContent() {
  // Hero
  setText("hero-name", inv.brideName);
  const name = document.getElementById("hero-name");
  if (name) {
    name.setAttribute("aria-label", inv.brideName);
    name.replaceChildren(...Array.from(inv.brideName).map((letter, index) => {
      const span = document.createElement("span");
      span.className = "hero-letter";
      span.setAttribute("aria-hidden", "true");
      span.style.setProperty("--letter-index", index);
      span.textContent = letter === " " ? "\u00a0" : letter;
      return span;
    }));
  }
  setText("hero-date", `${inv.date} • ${inv.time}`);
  setText("hero-location", inv.locationName);
  setText("hero-hosts", `Той иелері: ${inv.hosts}`);

  // Секция даты
  setText("date-month", inv.date ? inv.date.split(" ")[1] || inv.date : "Қазан");
  setText("date-time", inv.time);
  setText("date-venue", "ShahHall");
  setText("date-city", inv.city);
  setText("date-hosts", inv.hosts);

  // Обращение к гостям
  setText("invitation-body", inv.invitationText);
  setText("invitation-sub", inv.invitationSubText || "");

  // Countdown title
  setText("countdown-title", `${inv.date} — ${inv.time}`);

  // Карта
  const mapVenueEl = document.getElementById("map-venue");
  if (mapVenueEl) mapVenueEl.textContent = inv.map?.address || `${inv.locationName} • ${inv.city}`;

  // Карта — кнопка маршрута
  const mapBtn = document.getElementById("map-btn");
  const gisBtn = document.getElementById("map-2gis-btn");
  if (gisBtn && inv.map) {
    gisBtn.href = inv.map.twoGisUrl || `https://2gis.kz/kyzylorda/search/${encodeURIComponent(inv.map.label)}`;
  }
  if (mapBtn && inv.map) {
    const lat = inv.map.latitude;
    const lng = inv.map.longitude;
    if (lat && lng && lat !== 0 && lng !== 0) {
      mapBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else {
      mapBtn.href = `https://www.google.com/maps/search/${encodeURIComponent(inv.map.label || inv.locationName + ' ' + inv.city)}`;
    }
  }

  // Финал
  setText("final-msg", inv.finalMessage || "Сіздерді асыға күтеміз!");
  setText("final-date", `${inv.date} • ${inv.time}`);
  setText("final-venue", inv.locationName);
  setText("final-hosts", inv.hosts);

  // Финальное фото
  const finalImg = document.getElementById("final-bg-img");
  if (finalImg && inv.photos && inv.photos.length > 1) {
    const lastPhoto = inv.photos[inv.photos.length - 1];
    finalImg.src = lastPhoto;
    finalImg.style.display = "block";
    finalImg.onload = () => {};
    finalImg.onerror = () => finalImg.style.display = "none";
  }

  // Guest list date
  setText("guest-list-date", `${inv.date} ${inv.dateTime ? inv.dateTime.slice(0,4) : "2026"}`);

  // Footer
  setText("footer-text", `${inv.brideName} • Ұзату тойы • ${inv.date} 2026`);
}

// =====================
// МУЗЫКА
// =====================
let audio = null;
let musicPlaying = false;
let musicStarted = false;

function initMusic() {
  if (!inv.music || musicStarted) return;
  musicStarted = true;

  audio = new Audio(inv.music);
  audio.loop = true;
  audio.volume = 0.4;

  // Плавное нарастание громкости
  audio.addEventListener("canplaythrough", () => {
    const video = document.getElementById("invitation-video");
    if (video && !video.paused) return;
    audio.volume = 0;
    audio.play().then(() => {
      musicPlaying = true;
      updateMusicBtn();
      fadeAudioIn(audio, 0.4, 2000);
    }).catch(() => {
      // Браузер заблокировал — ничего страшного
      musicPlaying = false;
    });
  });

  audio.onerror = () => {
    const btn = document.getElementById("music-btn");
    if (btn) btn.style.display = "none";
  };
}

function fadeAudioIn(audioEl, targetVol, durationMs) {
  const steps = 40;
  const interval = durationMs / steps;
  const increment = targetVol / steps;
  let current = 0;

  const timer = setInterval(() => {
    current += increment;
    audioEl.volume = Math.min(current, targetVol);
    if (current >= targetVol) clearInterval(timer);
  }, interval);
}

function toggleMusic() {
  const video = document.getElementById("invitation-video");
  if (video && !video.paused) video.pause();
  if (!audio) {
    initMusic();
    return;
  }

  if (musicPlaying) {
    audio.pause();
    musicPlaying = false;
  } else {
    audio.play().then(() => {
      musicPlaying = true;
    }).catch(() => {});
  }
  updateMusicBtn();
}

function updateMusicBtn() {
  const btn = document.getElementById("music-btn");
  const icon = document.getElementById("music-icon");
  if (!btn || !icon) return;

  if (musicPlaying) {
    icon.textContent = "♫";
    btn.classList.add("playing");
    btn.setAttribute("aria-label", "Музыканы тоқтату");
    btn.title = "Музыканы тоқтату";
  } else {
    icon.textContent = "♪";
    btn.classList.remove("playing");
    btn.setAttribute("aria-label", "Музыканы қосу");
    btn.title = "Музыканы қосу";
  }
}

// =====================
// АНИМАЦИЯ КОНВЕРТА
// =====================
let envelopeOpened = false;

async function openEnvelope() {
  if (envelopeOpened) return;
  envelopeOpened = true;

  const sealContainer = document.getElementById("seal-container");
  const envelopeFlap = document.getElementById("envelope-flap");
  const envelopeScreen = document.getElementById("envelope-screen");

  // 1. Анимация печати — нажатие
  if (sealContainer) {
    sealContainer.style.pointerEvents = "none";
    sealContainer.classList.add("cracking");
  }

  await wait(600);

  // 2. Клапан конверта
  if (envelopeFlap) {
    envelopeFlap.style.opacity = "1";
    envelopeFlap.style.transform = "scaleY(1)";
    envelopeFlap.classList.add("opening");
  }

  await wait(800);

  // 3. Запускаем музыку (после взаимодействия пользователя)
  initMusic();

  // 4. Плавное исчезновение конверта
  if (envelopeScreen) {
    envelopeScreen.classList.add("hiding");
  }

  await wait(800);

  // 5. Скрываем конверт и разблокируем скролл
  if (envelopeScreen) {
    envelopeScreen.classList.add("hidden");
    envelopeScreen.setAttribute("aria-hidden", "true");
  }

  document.body.classList.remove("no-scroll");

  // 6. Запускаем анимацию Hero
  animateHero();

  // 7. Показываем кнопку музыки
  const musicBtn = document.getElementById("music-btn");
  if (musicBtn) musicBtn.classList.add("visible");

  // 8. Загружаем количество гостей
  loadGuestCount();
}

function skipEnvelope() {
  envelopeOpened = true;
  const envelopeScreen = document.getElementById("envelope-screen");
  if (envelopeScreen) {
    envelopeScreen.style.transition = "opacity 0.3s";
    envelopeScreen.classList.add("hiding");
    setTimeout(() => {
      envelopeScreen.classList.add("hidden");
      envelopeScreen.setAttribute("aria-hidden", "true");
    }, 300);
  }

  document.body.classList.remove("no-scroll");
  animateHero();
  initMusic();

  const musicBtn = document.getElementById("music-btn");
  if (musicBtn) musicBtn.classList.add("visible");

  loadGuestCount();
  envelopeOpened = true;
}

// =====================
// HERO АНИМАЦИЯ
// =====================
function animateHero() {
  document.getElementById("hero").classList.add("is-open");
  document.dispatchEvent(new Event("invitation:opened"));
  const heroContent = document.getElementById("hero-content");
  if (heroContent) {
    heroContent.classList.add("animate");
  }
}

// =====================
// ФОТОГАЛЕРЕЯ
// =====================
let galleryPhotos = [];
let lightboxIndex = 0;

function buildGallery() {
  const grid = document.getElementById("gallery-grid");
  if (!grid || !inv.photos || inv.photos.length === 0) {
    if (grid) grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:80px;font-family:var(--font-serif);font-style:italic;color:var(--gray-text)">Фотосуреттер қосылмаған</div>`;
    return;
  }

  galleryPhotos = inv.photos;

  galleryPhotos.forEach((src, index) => {
    const item = document.createElement("div");
    item.className = "gallery-item reveal-scale";
    item.setAttribute("role", "listitem");
    item.setAttribute("tabindex", "0");
    item.setAttribute("aria-label", `Фото ${index + 1}`);

    const img = document.createElement("img");
    img.src = src;
    img.alt = `Фотосурет ${index + 1}`;
    img.loading = "lazy";
    img.decoding = "async";

    const overlay = document.createElement("div");
    overlay.className = "gallery-item-overlay";
    overlay.innerHTML = '<span class="gallery-zoom-icon" aria-hidden="true">⊕</span>';

    item.appendChild(img);
    item.appendChild(overlay);

    item.addEventListener("click", () => openLightbox(index));
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") openLightbox(index);
    });

    grid.appendChild(item);
  });
}

// =====================
// LIGHTBOX
// =====================
function openLightbox(index) {
  lightboxIndex = index;
  const lightbox = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");

  if (!lightbox || !img) return;

  img.src = galleryPhotos[index];
  img.alt = `Фотосурет ${index + 1}`;

  lightbox.classList.add("active");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closeLightbox() {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;

  lightbox.classList.remove("active");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
}

function lightboxNav(dir) {
  lightboxIndex = (lightboxIndex + dir + galleryPhotos.length) % galleryPhotos.length;
  const img = document.getElementById("lightbox-img");
  if (img) {
    img.style.opacity = "0";
    setTimeout(() => {
      img.src = galleryPhotos[lightboxIndex];
      img.alt = `Фотосурет ${lightboxIndex + 1}`;
      img.style.opacity = "1";
    }, 150);
  }
}

// =====================
// INTERSECTION OBSERVER (scroll анимации)
// =====================
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: "0px 0px -60px 0px",
  });

  // Добавляем задержки для групп элементов
  document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale").forEach((el, i) => {
    const siblingIndex = Array.from(el.parentElement.children).indexOf(el);
    el.style.transitionDelay = `${siblingIndex * 0.1}s`;
    observer.observe(el);
  });
}

// =====================
// COUNTDOWN ТАЙМЕР
// =====================
function initCountdown() {
  const targetDate = new Date(inv.dateTime);

  if (isNaN(targetDate.getTime())) {
    console.warn("Дата дұрыс емес:", inv.dateTime);
    return;
  }

  const grid = document.getElementById("countdown-grid");
  const finished = document.getElementById("countdown-finished");

  function update() {
    const now = new Date();
    const diff = targetDate - now;

    if (diff <= 0) {
      if (grid) grid.style.display = "none";
      if (finished) finished.style.display = "block";
      return;
    }

    const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs  = Math.floor((diff % (1000 * 60)) / 1000);

    function pad(n) { return String(n).padStart(2, "0"); }
    function setNum(id, val) {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.textContent !== pad(val)) {
        el.classList.remove("flip");
        void el.offsetWidth; // reflow
        el.classList.add("flip");
        el.textContent = pad(val);
      }
    }

    setNum("cd-days",  days);
    setNum("cd-hours", hours);
    setNum("cd-mins",  mins);
    setNum("cd-secs",  secs);
  }

  update();
  setInterval(update, 1000);
}

// =====================
// RSVP ФОРМА
// =====================
let guestCountValue = 1;
const MAX_GUESTS = 10;

function initRSVPForm() {
  const minusBtn = document.getElementById("count-minus");
  const plusBtn = document.getElementById("count-plus");
  const display = document.getElementById("guest-count-display");
  const hiddenInput = document.getElementById("rsvp-count");

  function updateCounter() {
    if (display) display.textContent = guestCountValue;
    if (hiddenInput) hiddenInput.value = guestCountValue;
    if (minusBtn) minusBtn.disabled = guestCountValue <= 1;
    if (plusBtn) plusBtn.disabled = guestCountValue >= MAX_GUESTS;
  }

  if (minusBtn) {
    minusBtn.addEventListener("click", () => {
      if (guestCountValue > 1) { guestCountValue--; updateCounter(); }
    });
  }

  if (plusBtn) {
    plusBtn.addEventListener("click", () => {
      if (guestCountValue < MAX_GUESTS) { guestCountValue++; updateCounter(); }
    });
  }

  // Отправка формы
  const form = document.getElementById("rsvp-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await submitRSVP();
    });
  }
}

async function submitRSVP() {
  const nameEl     = document.getElementById("rsvp-name");
  const countEl    = document.getElementById("rsvp-count");
  const statusEl   = document.querySelector('input[name="status"]:checked');
  const submitBtn  = document.getElementById("rsvp-submit");

  const name = nameEl ? nameEl.value.trim() : "";
  const count = countEl ? parseInt(countEl.value, 10) : 1;
  const status = statusEl ? statusEl.value : "confirmed";

  // Простая валидация на фронте
  if (!name || name.length < 2) {
    nameEl && (nameEl.style.borderBottomColor = "#c0392b");
    nameEl && nameEl.focus();
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.querySelector("span").textContent = "Жіберілуде...";
  }

  try {
    const response = await fetch("/api/guests/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, guestCount: count, status }),
    });

    const data = await response.json();

    if (data.success) {
      // Показываем успех
      const formEl = document.getElementById("rsvp-form");
      const successEl = document.getElementById("rsvp-success");
      if (formEl) formEl.style.display = "none";
      if (successEl) successEl.classList.add("visible");

      // Обновляем счётчик
      loadGuestCount();
    } else {
      throw new Error(data.message || "Қате");
    }
  } catch (err) {
    alert(`Қате: ${err.message}\n\nСерверді тексеріңіз.`);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.querySelector("span").textContent = "Қатысуды растау";
    }
  }
}

// =====================
// СЧЁТЧИК ГОСТЕЙ (из backend)
// =====================
async function loadGuestCount() {
  try {
    const res = await fetch("/api/guests/count");
    const data = await res.json();
    if (data.success) {
      const el = document.getElementById("live-guest-count");
      if (el) {
        el.style.transition = "all 0.5s";
        el.textContent = data.count;
      }
    }
  } catch (err) {
    const el = document.getElementById("live-guest-count");
    if (el) el.textContent = "—";
  }
}

// =====================
// СПИСОК ГОСТЕЙ — МОДАЛ С ПАРОЛЕМ
// =====================
let guestListToken = null;

function openPasswordModal() {
  const modal = document.getElementById("password-modal");
  const input = document.getElementById("password-input");
  if (modal) {
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 100);
  }

  const errorEl = document.getElementById("modal-error");
  if (errorEl) errorEl.classList.remove("visible");
}

function closePasswordModal() {
  const modal = document.getElementById("password-modal");
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }
}

async function submitPassword() {
  const input = document.getElementById("password-input");
  const errorEl = document.getElementById("modal-error");
  const password = input ? input.value.trim() : "";

  if (!password) return;

  try {
    const res = await fetch("/api/auth/guest-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (data.success && data.token) {
      guestListToken = data.token;
      closePasswordModal();
      await openGuestList();
    } else {
      if (errorEl) errorEl.classList.add("visible");
      if (input) {
        input.value = "";
        input.focus();
      }
    }
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = "Сервер қатесі. Кейінірек қайталаңыз.";
      errorEl.classList.add("visible");
    }
  }
}

// =====================
// СПИСОК ГОСТЕЙ — ОТОБРАЖЕНИЕ
// =====================
async function openGuestList() {
  if (!guestListToken) return;

  try {
    const res = await fetch("/api/guests/list", {
      headers: { "Authorization": `Bearer ${guestListToken}` },
    });

    const data = await res.json();

    if (!data.success) {
      alert("Токен жарамсыз. Қайта кіріңіз.");
      guestListToken = null;
      return;
    }

    renderGuestList(data.guests);

    const modal = document.getElementById("guest-list-modal");
    if (modal) {
      modal.classList.add("active");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");
    }
  } catch (err) {
    alert("Қате: " + err.message);
  }
}

function renderGuestList(guests) {
  const tbody = document.getElementById("guest-table-body");
  if (!tbody) return;

  const confirmed = guests.filter(g => g.status === "confirmed");
  const totalPeople = confirmed.reduce((s, g) => s + (g.guestCount || 1), 0);

  setText("gs-total", guests.length);
  setText("gs-confirmed", confirmed.length);
  setText("gs-people", totalPeople);

  if (guests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;font-style:italic;color:var(--gray-text)">Тізім бос</td></tr>`;
    return;
  }

  tbody.innerHTML = guests.map((g, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(g.name)}</td>
      <td>${g.guestCount}</td>
      <td><span class="status-badge ${g.status}">${g.status === "confirmed" ? "Қатысады" : "Қатыспайды"}</span></td>
    </tr>
  `).join("");
}

function closeGuestList() {
  const modal = document.getElementById("guest-list-modal");
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// =====================
// KEYBOARD NAVIGATION
// =====================
function initKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeLightbox();
      closePasswordModal();
      closeGuestList();
    }
    if (document.getElementById("lightbox")?.classList.contains("active")) {
      if (e.key === "ArrowLeft") lightboxNav(-1);
      if (e.key === "ArrowRight") lightboxNav(1);
    }
  });
}

// =====================
// SWIPE для Lightbox (мобильный)
// =====================
function initSwipe() {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;

  let startX = 0;
  lightbox.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener("touchend", (e) => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) {
      lightboxNav(diff > 0 ? 1 : -1);
    }
  }, { passive: true });
}

// =====================
// ИНИЦИАЛИЗАЦИЯ
// =====================
document.addEventListener("DOMContentLoaded", () => {

  // 1. Заполняем контент
  fillContent();

  // Фоновое слайд-шоу и возврат к главному экрану
  initHeroSlideshow();
  initInvitationVideo();
  initBackToTop();

  // 3. Галерея
  buildGallery();

  // 4. Таймер
  initCountdown();

  // 5. Форма RSVP
  initRSVPForm();

  // 6. Scroll анимации (после небольшой задержки)
  setTimeout(initScrollAnimations, 100);

  // 7. Клавиатура
  initKeyboard();

  // 8. Свайп
  initSwipe();

  // =====================
  // EVENT LISTENERS
  // =====================

  // Открытие конверта — клик по печати
  const sealContainer = document.getElementById("seal-container");
  if (sealContainer) {
    sealContainer.addEventListener("click", openEnvelope);
    sealContainer.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openEnvelope();
      }
    });
  }

  // Пропустить конверт
  const skipBtn = document.getElementById("skip-btn");
  if (skipBtn) skipBtn.addEventListener("click", skipEnvelope);

  // Кнопка музыки
  const musicBtn = document.getElementById("music-btn");
  if (musicBtn) musicBtn.addEventListener("click", toggleMusic);

  // Lightbox
  const lbClose = document.getElementById("lightbox-close");
  const lbPrev  = document.getElementById("lightbox-prev");
  const lbNext  = document.getElementById("lightbox-next");
  const lbEl    = document.getElementById("lightbox");

  if (lbClose) lbClose.addEventListener("click", closeLightbox);
  if (lbPrev)  lbPrev.addEventListener("click", () => lightboxNav(-1));
  if (lbNext)  lbNext.addEventListener("click", () => lightboxNav(1));
  if (lbEl)    lbEl.addEventListener("click", (e) => {
    if (e.target === lbEl) closeLightbox();
  });

  // Модал пароля
  const openModal = document.getElementById("open-password-modal");
  const closeModal = document.getElementById("close-password-modal");
  const passwordSubmit = document.getElementById("password-submit");
  const passwordInput = document.getElementById("password-input");
  const passwordModal = document.getElementById("password-modal");

  if (openModal)       openModal.addEventListener("click", openPasswordModal);
  if (closeModal)      closeModal.addEventListener("click", closePasswordModal);
  if (passwordSubmit)  passwordSubmit.addEventListener("click", submitPassword);
  if (passwordInput) {
    passwordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitPassword();
    });
  }
  if (passwordModal) {
    passwordModal.addEventListener("click", (e) => {
      if (e.target === passwordModal) closePasswordModal();
    });
  }

  // Закрыть список гостей
  const closeGuestListBtn = document.getElementById("close-guest-list");
  const guestListModal = document.getElementById("guest-list-modal");

  if (closeGuestListBtn) closeGuestListBtn.addEventListener("click", closeGuestList);
  if (guestListModal) {
    guestListModal.addEventListener("click", (e) => {
      if (e.target === guestListModal) closeGuestList();
    });
  }

  // Загружаем гостей при открытии страницы (если пользователь уже открывал)
  // Но сначала нужен конверт — loadGuestCount вызывается после открытия
});
