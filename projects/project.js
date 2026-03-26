(() => {
  const revealEls = document.querySelectorAll('.reveal');
  const ro = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('on');
      ro.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  revealEls.forEach((el) => ro.observe(el));

  const images = Array.from(document.querySelectorAll('.render'));
  const lb = document.getElementById('lightbox');
  if (!lb || !images.length) return;

  const lbImg = document.getElementById('lbImg');
  const lbCount = document.getElementById('lbCount');
  const btnPrev = document.getElementById('lbPrev');
  const btnNext = document.getElementById('lbNext');
  const btnClose = document.getElementById('lbClose');
  const lbFigure = lb.querySelector('.lb-figure');

  let idx = 0;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let swipeX = 0;
  let pointerDown = false;
  let startX = 0;
  let startY = 0;
  let startPanX = 0;
  let startPanY = 0;

  function resetView() {
    zoom = 1;
    panX = 0;
    panY = 0;
    swipeX = 0;
    lbImg.style.opacity = '';
    lb.classList.remove('dragging');
    applyTransform();
  }

  function applyTransform() {
    if (zoom > 1) {
      lbImg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
      lbImg.style.cursor = pointerDown ? 'grabbing' : 'grab';
      lbImg.style.opacity = '';
    } else {
      lbImg.style.transform = `translateX(${swipeX}px) scale(1)`;
      lbImg.style.cursor = 'grab';
    }
  }

  function setZoom(nextZoom) {
    const clamped = Math.max(1, Math.min(4, nextZoom));
    zoom = clamped;
    if (zoom === 1) {
      panX = 0;
      panY = 0;
      swipeX = 0;
      lbImg.style.opacity = '';
    }
    applyTransform();
  }

  function updateLightbox() {
    const img = images[idx];
    lbImg.src = img.src;
    lbImg.alt = img.alt || 'Project render';
    lbCount.textContent = `${idx + 1} / ${images.length}`;
    resetView();
  }

  function openAt(i) {
    idx = i;
    updateLightbox();
    lb.classList.add('on');
    document.body.style.overflow = 'hidden';
  }

  function closeLb() {
    lb.classList.remove('on');
    document.body.style.overflow = '';
    resetView();
  }

  function next() {
    idx = (idx + 1) % images.length;
    updateLightbox();
  }

  function prev() {
    idx = (idx - 1 + images.length) % images.length;
    updateLightbox();
  }

  images.forEach((img, i) => {
    img.addEventListener('click', () => openAt(i));
  });

  btnNext.addEventListener('click', next);
  btnPrev.addEventListener('click', prev);
  btnClose.addEventListener('click', closeLb);

  lb.addEventListener('click', (e) => {
    if (e.target === lb) closeLb();
  });

  window.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('on')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowRight' && zoom === 1) next();
    if (e.key === 'ArrowLeft' && zoom === 1) prev();
    if (e.key === '+' || e.key === '=') setZoom(zoom + 0.2);
    if (e.key === '-') setZoom(zoom - 0.2);
    if (e.key === '0') setZoom(1);
  });

  lbImg.addEventListener('mousedown', (e) => {
    pointerDown = true;
    startX = e.clientX;
    startY = e.clientY;
    startPanX = panX;
    startPanY = panY;
    lb.classList.add('dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!pointerDown || !lb.classList.contains('on')) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (zoom > 1) {
      panX = startPanX + dx;
      panY = startPanY + dy;
      applyTransform();
      return;
    }
    swipeX = dx * 0.85;
    applyTransform();
    lbImg.style.opacity = `${Math.max(0.75, 1 - Math.abs(dx) / 520)}`;
  });

  window.addEventListener('mouseup', (e) => {
    if (!pointerDown || !lb.classList.contains('on')) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    pointerDown = false;
    lb.classList.remove('dragging');
    if (zoom > 1) {
      applyTransform();
      return;
    }
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    }
    swipeX = 0;
    lbImg.style.opacity = '';
    applyTransform();
  });

  lbFigure.addEventListener('wheel', (e) => {
    if (!lb.classList.contains('on')) return;
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.2 : -0.2;
    setZoom(zoom + step);
  }, { passive: false });

  lbImg.addEventListener('dblclick', () => {
    if (!lb.classList.contains('on')) return;
    setZoom(zoom > 1 ? 1 : 2);
  });

  lbImg.addEventListener('touchstart', (e) => {
    pointerDown = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startPanX = panX;
    startPanY = panY;
    lb.classList.add('dragging');
  }, { passive: true });

  lbImg.addEventListener('touchmove', (e) => {
    if (!pointerDown || !lb.classList.contains('on')) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (zoom > 1) {
      panX = startPanX + dx;
      panY = startPanY + dy;
      applyTransform();
      return;
    }
    swipeX = dx * 0.85;
    applyTransform();
    lbImg.style.opacity = `${Math.max(0.75, 1 - Math.abs(dx) / 520)}`;
  }, { passive: true });

  lbImg.addEventListener('touchend', (e) => {
    if (!pointerDown || !lb.classList.contains('on')) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    pointerDown = false;
    lb.classList.remove('dragging');
    if (zoom > 1) {
      applyTransform();
      return;
    }
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    }
    swipeX = 0;
    lbImg.style.opacity = '';
    applyTransform();
  }, { passive: true });
})();
