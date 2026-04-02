/* PRELOADER — wait for CSS intro to finish, then exit (no idle gap). Intro: bar ends at 0.7s + 0.9s = 1.6s */
const PRELOADER_INTRO_MS = 1680;
const PRELOADER_EXIT_MS = 900; /* match styles.css #pl.gone 0.9s */

function hidePreloader() {
  const pl = document.getElementById('pl');
  if (!pl) return;
  pl.classList.add('gone');
  setTimeout(() => pl.remove(), PRELOADER_EXIT_MS);
}

function schedulePreloaderHide() {
  setTimeout(hidePreloader, PRELOADER_INTRO_MS);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', schedulePreloaderHide, { once: true });
} else {
  schedulePreloaderHide();
}

/* TICKER */
const tWords = ['Architecture', 'Interior Design', 'Product Render', 'Animation', 'Branding', 'Virtual Staging'];
const tEl = document.getElementById('tkt');
tEl.innerHTML = (tWords.map((w) => `<div class="ti"><span class="ti-t">${w}</span><span class="ti-d"></span></div>`).join('')).repeat(6);

/* MARQUEE */
const mW1 = ['ARCHITECTURE', 'INTERIOR DESIGN', 'PRODUCT RENDER', 'ANIMATION'];
function buildM(ws) { return (ws.map((w) => `<span class="mi">${w}</span><span class="ms">·</span>`).join('')).repeat(4); }
document.getElementById('m1').innerHTML = buildM(mW1);

/* CURSOR */
const cD = document.getElementById('cD');
const cR = document.getElementById('cR');
let mx = window.innerWidth / 2;
let my = window.innerHeight / 2;
let rx = mx;
let ry = my;
document.addEventListener('mousemove', (e) => {
  mx = e.clientX;
  my = e.clientY;
  cD.style.cssText = `left:${mx}px;top:${my}px`;
});
(function ra() {
  rx += (mx - rx) * 0.1;
  ry += (my - ry) * 0.1;
  cR.style.cssText = `left:${rx}px;top:${ry}px`;
  requestAnimationFrame(ra);
}());
(() => {
  const sel = 'a,button,.srv,.wk,.st,.tp,.cl-nm';
  document.addEventListener('mouseover', (e) => {
    if (e.target && e.target.closest && e.target.closest(sel)) document.body.classList.add('ch');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target && e.target.closest && e.target.closest(sel)) document.body.classList.remove('ch');
  });
})();

/* NAV SCROLL */
window.addEventListener('scroll', () => document.getElementById('nav').classList.toggle('sc', scrollY > 60));

/* REVEAL */
const ro = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) {
    e.target.classList.add('on');
    ro.unobserve(e.target);
  }
}), { threshold: 0.08 });
function observeReveals(root = document) {
  root.querySelectorAll('.rv').forEach((el) => ro.observe(el));
}
observeReveals();

/* PROJECTS (work grid) */
async function loadProjects() {
  const grid = document.getElementById('workGrid');
  if (!grid) return;
  const url = grid.getAttribute('data-projects-json') || 'projects/projects.json';

  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return;
    const projects = await res.json();
    if (!Array.isArray(projects)) return;

    grid.innerHTML = projects.map((p, i) => {
      const delay = i % 4;
      const dClass = delay === 1 ? ' d1' : delay === 2 ? ' d2' : delay === 3 ? ' d3' : '';
      const title = String(p?.title || '').toUpperCase();
      const cat = String(p?.cardCategory || '');
      const href = String(p?.href || '#');
      const cover = String(p?.cover || '');
      const alt = `${p?.title || 'Project'} cover`;
      return `
        <a href="${href}" class="wk rv${dClass}">
          <img class="wk-cover" src="${cover}" alt="${alt}">
          <div class="wk-inf"><div class="wk-cat">${cat}</div><div class="wk-nm">${title}</div></div>
        </a>
      `.trim();
    }).join('');

    observeReveals(grid);
    if (window.__layoutWorkGrid) window.__layoutWorkGrid();
  } catch {
    // If JSON is missing/invalid, keep grid empty.
  }
}
loadProjects();

/* COUNT-UP */
const co = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  const el = e.target;
  const target = +el.dataset.count;
  const sfx = el.dataset.suffix || '+';
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 55));
  const iv = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur + sfx;
    if (cur >= target) clearInterval(iv);
  }, 22);
  co.unobserve(el);
}), { threshold: 0.5 });
document.querySelectorAll('.st-n').forEach((el) => co.observe(el));

/* ABOUT VECTOR FIELD */
(() => {
  const canvas = document.getElementById('aboutFieldCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const config = {
    gridSize: 78,
    letterSize: 42,
    dotColor: '#b794f4',
    influenceRadius: 200,
    dotSize: 30,
    baseColor: 'rgba(183, 148, 244, 0.18)',
    phrase: 'WEARESPECTRUMVISION'
  };

  const mouse = { x: -1000, y: -1000 };
  const dotMouse = { x: -1000, y: -1000 };
  let rafId = 0;

  function fitCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawLetter(x, y, angle, scale, color, ch) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.font = `700 ${config.letterSize}px Syne, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }

  function lerpColor(intensity) {
    const opacity = intensity * 0.9 + 0.1;
    return `rgba(183, 148, 244, ${opacity})`;
  }

  function drawField() {
    const width = canvas.getBoundingClientRect().width;
    const height = canvas.getBoundingClientRect().height;
    ctx.clearRect(0, 0, width, height);

    if (dotMouse.x > -999 && dotMouse.y > -999) {
      ctx.beginPath();
      ctx.arc(dotMouse.x, dotMouse.y, config.dotSize, 0, Math.PI * 2);
      ctx.fillStyle = config.dotColor;
      ctx.fill();
    }

    const cols = Math.floor(width / config.gridSize);
    const rows = Math.floor(height / config.gridSize);
    const letters = config.phrase.split('');
    let index = 0;

    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < rows; j += 1) {
        const x = i * config.gridSize + config.gridSize / 2;
        const y = j * config.gridSize + config.gridSize / 2;
        const dx = mouse.x - x;
        const dy = mouse.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let intensity = 0;
        if (distance < config.influenceRadius) {
          intensity = 1 - distance / config.influenceRadius;
          intensity = Math.pow(intensity, 2);
        }

        const scale = 0.75 + intensity * 0.5;
        const color = lerpColor(intensity);
        const finalAngle = Math.PI * (1 - intensity);
        const ch = letters[index % letters.length];
        index += 1;
        drawLetter(x, y, finalAngle, scale, intensity > 0 ? color : config.baseColor, ch);
      }
    }

    rafId = requestAnimationFrame(drawField);
  }

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const inside = localX >= 0 && localX <= rect.width && localY >= 0 && localY <= rect.height;

    if (!inside) {
      mouse.x = -1000;
      mouse.y = -1000;
      dotMouse.x = -1000;
      dotMouse.y = -1000;
      return;
    }

    mouse.x = localX;
    mouse.y = localY;
    const pad = config.dotSize + 2;
    dotMouse.x = Math.min(Math.max(localX, pad), rect.width - pad);
    dotMouse.y = Math.min(Math.max(localY, pad), rect.height - pad);
  });

  canvas.addEventListener('mouseleave', () => {
    mouse.x = -1000;
    mouse.y = -1000;
    dotMouse.x = -1000;
    dotMouse.y = -1000;
  });

  window.addEventListener('resize', fitCanvas);
  fitCanvas();
  drawField();

  window.addEventListener('beforeunload', () => cancelAnimationFrame(rafId));
})();

/* MAGNETIC BUTTONS */
document.querySelectorAll('.btn-p,.btn-o').forEach((btn) => {
  btn.addEventListener('mousemove', (e) => {
    const r = btn.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.22;
    const y = (e.clientY - r.top - r.height / 2) * 0.32;
    btn.style.transform = `translate(${x}px,${y}px)`;
  });
  btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
});

/* PARALLAX on hero title */
window.addEventListener('scroll', () => {
  const y = scrollY;
  const title = document.querySelector('.h-title');
  if (title) title.style.transform = `translateY(${y * 0.18}px)`;
});

/* SERVICES ACCORDION */
(() => {
  const items = Array.from(document.querySelectorAll('.srv'));
  if (!items.length) return;

  const EASE_OPEN = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const EASE_CLOSE = 'cubic-bezier(0.4, 0, 1, 1)';

  function animateOpen(panel) {
    panel.getAnimations().forEach((a) => a.cancel());
    panel.style.display = 'block';
    const targetHeight = panel.scrollHeight;
    const anim = panel.animate(
      [
        { height: '0px', opacity: 0, transform: 'translateY(-8px)', marginTop: '0px' },
        { height: `${targetHeight}px`, opacity: 1, transform: 'translateY(0)', marginTop: '8px' }
      ],
      { duration: 520, easing: EASE_OPEN, fill: 'forwards' }
    );
    anim.onfinish = () => {
      panel.style.height = 'auto';
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0)';
      panel.style.marginTop = '8px';
    };
  }

  function animateClose(panel) {
    panel.getAnimations().forEach((a) => a.cancel());
    const startHeight = panel.getBoundingClientRect().height;
    const anim = panel.animate(
      [
        { height: `${startHeight}px`, opacity: 1, transform: 'translateY(0)', marginTop: '8px' },
        { height: '0px', opacity: 0, transform: 'translateY(-8px)', marginTop: '0px' }
      ],
      { duration: 360, easing: EASE_CLOSE, fill: 'forwards' }
    );
    anim.onfinish = () => {
      panel.style.height = '0px';
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(-8px)';
      panel.style.marginTop = '0px';
    };
  }

  function toggleItem(item) {
    const isOpen = item.classList.contains('op');
    items.forEach((el) => {
      const panel = el.querySelector('.srv-more');
      el.classList.remove('op');
      el.setAttribute('aria-expanded', 'false');
      if (panel) animateClose(panel);
    });
    if (!isOpen) {
      item.classList.add('op');
      item.setAttribute('aria-expanded', 'true');
      const panel = item.querySelector('.srv-more');
      if (panel) animateOpen(panel);
    }
  }

  items.forEach((item) => {
    const panel = item.querySelector('.srv-more');
    if (panel) {
      panel.style.height = '0px';
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(-8px)';
      panel.style.marginTop = '0px';
    }
    item.addEventListener('click', () => toggleItem(item));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleItem(item);
      }
    });
  });
})();

/* WORK GRID MASONRY */
(() => {
  const grid = document.querySelector('.wg');
  if (!grid) return;

  const GAP = 14;

  function getColumnCount(width) {
    if (width <= 620) return 1;
    if (width <= 920) return 2;
    if (width <= 1280) return 3;
    return 4;
  }

  function layoutMasonry() {
    const items = Array.from(grid.querySelectorAll('.wk'));
    if (!items.length) return;

    const gridWidth = grid.clientWidth;
    const colCount = getColumnCount(gridWidth);
    const colWidth = (gridWidth - GAP * (colCount - 1)) / colCount;
    const heights = new Array(colCount).fill(0);

    items.forEach((item) => {
      item.style.width = `${colWidth}px`;
      let minCol = 0;
      for (let i = 1; i < colCount; i += 1) {
        if (heights[i] < heights[minCol]) minCol = i;
      }
      const left = minCol * (colWidth + GAP);
      const top = heights[minCol];
      item.style.left = `${left}px`;
      item.style.top = `${top}px`;
      heights[minCol] = top + item.offsetHeight + GAP;
    });

    grid.style.height = `${Math.max(...heights) - GAP}px`;
  }

  let raf = 0;
  function requestLayout() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(layoutMasonry);
  }
  window.__layoutWorkGrid = requestLayout;

  function bindImageListeners(root = grid) {
    const imgs = root.querySelectorAll('.wk-cover');
    imgs.forEach((img) => {
      if (!img.__masonryBound) {
        img.__masonryBound = true;
        if (!img.complete) img.addEventListener('load', requestLayout);
      }
    });
  }
  bindImageListeners();

  const mo = new MutationObserver(() => {
    bindImageListeners();
    requestLayout();
  });
  mo.observe(grid, { childList: true, subtree: true });

  window.addEventListener('resize', requestLayout);
  window.addEventListener('load', requestLayout);
  requestLayout();
})();
