(() => {
      const canvas = document.getElementById('flow-canvas');
      const hero = canvas.closest('.hero');
      const ctx = canvas.getContext('2d', { alpha: true });
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const finePointer = window.matchMedia('(pointer: fine)').matches;
      let width = 0;
      let height = 0;
      let dpr = 1;
      let animationId = 0;
      let time = 0;
      let particles = [];
      const pointer = { x: 0.5, y: 0.5, active: false };

      function createParticles() {
        const count = Math.min(112, Math.max(44, Math.floor((width * height) / 9000)));
        particles = Array.from({ length: count }, (_, index) => ({
          x: Math.random() * width,
          baseY: Math.random() * height,
          phase: Math.random() * Math.PI * 2,
          amplitude: 7 + Math.random() * 26,
          frequency: 0.004 + Math.random() * 0.006,
          speed: 0.10 + Math.random() * 0.34,
          radius: index % 8 === 0 ? 1.8 : 0.65 + Math.random() * 1.15,
          alpha: 0.20 + Math.random() * 0.52
        }));
      }

      function resize() {
        const rect = hero.getBoundingClientRect();
        width = Math.max(1, rect.width);
        height = Math.max(1, rect.height);
        dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        createParticles();
        if (reduceMotion.matches) drawStill();
      }

      function particleY(p) {
        const flow = Math.sin(p.x * p.frequency + time * 0.72 + p.phase) * p.amplitude;
        const drift = Math.cos(time * 0.28 + p.phase) * 10;
        const mouseInfluence = pointer.active ? (pointer.y * height - p.baseY) * 0.025 : 0;
        return p.baseY + flow + drift + mouseInfluence;
      }

      function drawStill() {
        ctx.clearRect(0, 0, width, height);
        drawFlowLines(0.4);
        particles.forEach((p) => {
          const x = p.x;
          const y = particleY(p);
          ctx.beginPath();
          ctx.arc(x, y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(190, 164, 255, ${p.alpha})`;
          ctx.fill();
        });
      }

      function drawFlowLines(t) {
        for (let j = 0; j < 6; j++) {
          const base = height * (0.25 + j * 0.105);
          ctx.beginPath();
          for (let x = -10; x <= width + 10; x += 8) {
            const y = base + Math.sin(x * (0.0037 + j * 0.00018) + t * 0.7 + j * 1.2) * (22 + j * 3)
              + Math.sin(x * 0.009 - t * 0.3 + j) * 7;
            if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `rgba(158, 119, 244, ${0.035 + j * 0.008})`;
          ctx.lineWidth = j === 2 ? 1.3 : 0.7;
          ctx.stroke();
        }
      }

      function render() {
        ctx.clearRect(0, 0, width, height);
        time += 0.012;
        drawFlowLines(time);
        for (const p of particles) {
          p.x += p.speed;
          if (p.x > width + 6) {
            p.x = -6;
            p.baseY = Math.random() * height;
          }
        }
        const positions = particles.map((p) => {
          let x = p.x;
          let y = particleY(p);
          if (pointer.active && finePointer) {
            const dx = x - pointer.x * width;
            const dy = y - pointer.y * height;
            const distance = Math.hypot(dx, dy);
            const radius = 205;
            if (distance > 0 && distance < radius) {
              const force = Math.pow((radius - distance) / radius, 1.35) * 76;
              x += (dx / distance) * force;
              y += (dy / distance) * force;
            }
          }
          return { x, y, p };
        });
        for (let i = 0; i < positions.length; i++) {
          for (let j = i + 1; j < positions.length; j++) {
            const dx = positions[i].x - positions[j].x;
            const dy = positions[i].y - positions[j].y;
            const distance = Math.hypot(dx, dy);
            if (distance < 165) {
              const alpha = Math.pow(1 - distance / 165, 1.25) * 0.31;
              ctx.beginPath();
              ctx.moveTo(positions[i].x, positions[i].y);
              ctx.lineTo(positions[j].x, positions[j].y);
              ctx.strokeStyle = `rgba(159, 122, 245, ${alpha})`;
              ctx.lineWidth = distance < 88 ? 0.95 : 0.7;
              ctx.stroke();
            }
          }
        }
        for (const point of positions) {
          const { x, y, p } = point;
          ctx.beginPath();
          ctx.arc(x, y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(205, 185, 255, ${p.alpha})`;
          ctx.fill();
          if (p.radius > 1.5) {
            const halo = ctx.createRadialGradient(x, y, 0, x, y, p.radius * 8);
            halo.addColorStop(0, `rgba(139, 92, 246, ${p.alpha * 0.42})`);
            halo.addColorStop(1, 'rgba(139, 92, 246, 0)');
            ctx.beginPath();
            ctx.arc(x, y, p.radius * 8, 0, Math.PI * 2);
            ctx.fillStyle = halo;
            ctx.fill();
          }
        }
        if (pointer.active && finePointer) {
          const gx = pointer.x * width;
          const gy = pointer.y * height;
          const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, 160);
          glow.addColorStop(0, 'rgba(139, 92, 246, 0.075)');
          glow.addColorStop(1, 'rgba(139, 92, 246, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(gx - 160, gy - 160, 320, 320);
        }
        animationId = window.requestAnimationFrame(render);
      }

      hero.addEventListener('pointermove', (event) => {
        if (!finePointer) return;
        const rect = hero.getBoundingClientRect();
        pointer.x = (event.clientX - rect.left) / rect.width;
        pointer.y = (event.clientY - rect.top) / rect.height;
        pointer.active = true;
      });
      hero.addEventListener('pointerleave', () => { pointer.active = false; });
      window.addEventListener('resize', resize, { passive: true });
      reduceMotion.addEventListener?.('change', () => {
        window.cancelAnimationFrame(animationId);
        if (reduceMotion.matches) drawStill(); else animationId = window.requestAnimationFrame(render);
      });

      resize();
      if (reduceMotion.matches) drawStill(); else animationId = window.requestAnimationFrame(render);
    })();

    (() => {
      const aboutSection = document.getElementById('sobre');
      const projectsSection = document.getElementById('projetos');
      const quoteSection = document.querySelector('.quote-section');
      const quoteContent = quoteSection?.querySelector('.quote-inner');
      if (aboutSection && projectsSection) {
        projectsSection.before(aboutSection);
        if (quoteContent) {
          quoteContent.classList.remove('wrap', 'quote-inner');
          quoteContent.classList.add('about-quote');
          aboutSection.querySelector('.about-grid')?.append(quoteContent);
          quoteSection.remove();
        }
      }
      const revealElements = document.querySelectorAll('.reveal');
      if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        revealElements.forEach((element) => element.classList.add('visible'));
      } else {
        const observer = new IntersectionObserver((entries, currentObserver) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              currentObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0.12 });
        revealElements.forEach((element) => observer.observe(element));
      }
      document.getElementById('year').textContent = String(new Date().getFullYear());
    })();

    (() => {
      const carousel = document.querySelector('[data-projects-carousel]');
      if (!carousel) return;

      const viewport = carousel.querySelector('[data-projects-viewport]');
      const track = carousel.querySelector('.projects-grid');
      const previous = carousel.querySelector('[data-project-prev]');
      const next = carousel.querySelector('[data-project-next]');
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (!viewport || !track || !previous || !next) return;

      function stepSize() {
        const firstCard = track.querySelector('.project-card:not([hidden])');
        if (!firstCard) return viewport.clientWidth;
        const gap = Number.parseFloat(window.getComputedStyle(track).gap) || 0;
        return firstCard.getBoundingClientRect().width + gap;
      }

      function updateControls() {
        const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        const canScroll = maxScroll > 2;
        previous.disabled = !canScroll || viewport.scrollLeft <= 2;
        next.disabled = !canScroll || viewport.scrollLeft >= maxScroll - 2;
      }

      previous.addEventListener('click', () => {
        viewport.scrollBy({ left: -stepSize(), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      });
      next.addEventListener('click', () => {
        viewport.scrollBy({ left: stepSize(), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      });
      viewport.addEventListener('scroll', updateControls, { passive: true });
      window.addEventListener('resize', updateControls, { passive: true });

      if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(updateControls);
        observer.observe(viewport);
        observer.observe(track);
      }

      updateControls();
      window.addEventListener('load', updateControls, { once: true });
    })();

