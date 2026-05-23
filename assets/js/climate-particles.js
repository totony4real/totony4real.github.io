/**
 * Slow Weather Dynamics Field
 * A sparse atmospheric flow background for the AI-for-climate homepage.
 */

(function () {
  "use strict";

  const config = {
    lineCountDesktop: 22,
    lineCountMobile: 12,
    particleCountDesktop: 14,
    particleCountMobile: 8,
    lineSteps: 90,
    stepLength: 16,
    interactionRadius: 230,
    driftSpeed: 0.00008,
    fadeInMs: 1200,
    frameInterval: 1000 / 30,
  };

  const colors = {
    light: {
      veilTop: "rgba(255, 255, 255, 0.9)",
      veilBottom: "rgba(238, 250, 252, 0.66)",
      line: "rgba(38, 152, 186, 0.25)",
      lineSoft: "rgba(10, 36, 99, 0.12)",
      glow: "rgba(0, 174, 214, 0.45)",
      particle: "rgba(0, 142, 168, 0.86)",
      vortex: "rgba(78, 204, 163, 0.2)",
    },
    dark: {
      veilTop: "rgba(28, 28, 29, 0.74)",
      veilBottom: "rgba(6, 20, 30, 0.62)",
      line: "rgba(0, 217, 255, 0.25)",
      lineSoft: "rgba(78, 204, 163, 0.12)",
      glow: "rgba(78, 204, 163, 0.48)",
      particle: "rgba(152, 246, 226, 0.88)",
      vortex: "rgba(0, 217, 255, 0.2)",
    },
  };

  let canvas;
  let ctx;
  let lines = [];
  let particles = [];
  let animationId = null;
  let currentTheme = "light";
  let isTabVisible = true;
  let isScrolling = false;
  let scrollTimeout = null;
  let startTime = performance.now();
  let lastFrameTime = 0;
  let mouse = { x: null, y: null };

  function seededRandom(seed) {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInOut(t) {
    return t * t * (3 - 2 * t);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getDimensions() {
    return {
      width: canvas.displayWidth || window.innerWidth,
      height: canvas.displayHeight || window.innerHeight,
    };
  }

  function buildField() {
    const { width, height } = getDimensions();
    const isMobile = width < 768;
    const lineCount = isMobile ? config.lineCountMobile : config.lineCountDesktop;
    const particleCount = isMobile ? config.particleCountMobile : config.particleCountDesktop;

    lines = Array.from({ length: lineCount }, (_, index) => {
      const t = lineCount === 1 ? 0 : index / (lineCount - 1);
      const lane = lerp(-0.1, 1.1, t);
      const wobble = (seededRandom(index + 21) - 0.5) * height * 0.16;

      return {
        seed: index + 1,
        startX: -width * 0.18 + seededRandom(index + 7) * width * 0.2,
        startY: lane * height + wobble,
        phase: seededRandom(index + 31) * Math.PI * 2,
        alpha: lerp(0.26, 0.54, seededRandom(index + 41)),
        width: lerp(0.55, 1.15, seededRandom(index + 51)),
      };
    });

    particles = Array.from({ length: particleCount }, (_, index) => ({
      lineIndex: Math.floor(seededRandom(index + 101) * lines.length),
      progress: seededRandom(index + 111),
      speed: lerp(0.000045, 0.00011, seededRandom(index + 121)),
      radius: lerp(1.1, 2.2, seededRandom(index + 131)),
      phase: seededRandom(index + 141) * Math.PI * 2,
    }));
  }

  function vectorAt(x, y, time) {
    const { width, height } = getDimensions();
    const nx = x / width;
    const ny = y / height;

    let vx = 1.05;
    let vy = -0.22;

    // Broad planetary-wave undulation, kept deliberately gentle.
    vx += Math.sin(ny * Math.PI * 2.4 + time * 0.42) * 0.22;
    vy += Math.sin(nx * Math.PI * 2.1 - time * 0.34) * 0.18;

    const vortices = [
      {
        x: width * (0.34 + Math.sin(time * 0.17) * 0.035),
        y: height * (0.68 + Math.cos(time * 0.13) * 0.045),
        strength: 0.68,
      },
      {
        x: width * (0.72 + Math.cos(time * 0.11) * 0.03),
        y: height * (0.36 + Math.sin(time * 0.16) * 0.04),
        strength: -0.5,
      },
    ];

    vortices.forEach((vortex) => {
      const dx = x - vortex.x;
      const dy = y - vortex.y;
      const radius = Math.max(width, height) * 0.34;
      const distSq = dx * dx + dy * dy;
      const influence = Math.exp(-distSq / (radius * radius));
      const dist = Math.sqrt(distSq) || 1;

      vx += (-dy / dist) * vortex.strength * influence;
      vy += (dx / dist) * vortex.strength * influence;
    });

    if (mouse.x !== null && mouse.y !== null) {
      const dx = x - mouse.x;
      const dy = y - mouse.y;
      const distSq = dx * dx + dy * dy;
      const radiusSq = config.interactionRadius * config.interactionRadius;

      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq) || 1;
        const influence = easeInOut(1 - dist / config.interactionRadius);
        vx += (-dy / dist) * influence * 0.38;
        vy += (dx / dist) * influence * 0.38;
      }
    }

    const length = Math.sqrt(vx * vx + vy * vy) || 1;
    return { x: vx / length, y: vy / length };
  }

  function traceLine(line, time) {
    const { width, height } = getDimensions();
    const drift = ((time * config.driftSpeed + line.phase) % 1) * width * 0.42;
    const wave = Math.sin(time * 0.24 + line.phase) * height * 0.04;
    let x = line.startX + drift;
    let y = line.startY + wave;
    const points = [];

    for (let i = 0; i < config.lineSteps; i++) {
      points.push({ x, y });
      const v = vectorAt(x, y, time);
      x += v.x * config.stepLength;
      y += v.y * config.stepLength;

      if (x > width * 1.18 || y < -height * 0.18 || y > height * 1.18) {
        break;
      }
    }

    return points;
  }

  function distanceToMouse(point) {
    if (mouse.x === null || mouse.y === null) return 0;

    const dx = point.x - mouse.x;
    const dy = point.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= config.interactionRadius) return 0;
    return easeInOut(1 - dist / config.interactionRadius);
  }

  function drawBackground(palette) {
    const { width, height } = getDimensions();
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, palette.veilTop);
    gradient.addColorStop(1, palette.veilBottom);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawVortexHints(time, palette) {
    const { width, height } = getDimensions();
    const hints = [
      { x: width * 0.34, y: height * 0.68, radius: Math.min(width, height) * 0.12 },
      { x: width * 0.72, y: height * 0.36, radius: Math.min(width, height) * 0.1 },
    ];

    hints.forEach((hint, index) => {
      ctx.save();
      ctx.translate(
        hint.x + Math.sin(time * 0.16 + index) * width * 0.018,
        hint.y + Math.cos(time * 0.12 + index) * height * 0.018,
      );
      ctx.rotate(time * 0.04 * (index === 0 ? 1 : -1));
      ctx.strokeStyle = palette.vortex;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, hint.radius, hint.radius * 0.52, 0, 0.3, Math.PI * 1.74);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawFlowLines(tracedLines, palette) {
    tracedLines.forEach(({ line, points }) => {
      if (points.length < 2) return;

      let mouseGlow = 0;
      for (let i = 0; i < points.length; i += 6) {
        mouseGlow = Math.max(mouseGlow, distanceToMouse(points[i]));
      }

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      ctx.strokeStyle = mouseGlow > 0.02 ? palette.glow : palette.line;
      ctx.lineWidth = line.width + mouseGlow * 1.1;
      ctx.globalAlpha = clamp(line.alpha * 0.54 + mouseGlow * 0.42, 0, 0.78);
      ctx.shadowBlur = mouseGlow * 12;
      ctx.shadowColor = palette.glow;
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function drawDataParticles(time, tracedLines, palette) {
    particles.forEach((particle) => {
      const tracedLine = tracedLines[particle.lineIndex % tracedLines.length];
      const points = tracedLine ? tracedLine.points : [];
      if (points.length < 2) return;

      particle.progress = (particle.progress + particle.speed * 16.67) % 1;
      const index = Math.floor(particle.progress * (points.length - 1));
      const point = points[index];
      const pulse = Math.sin(time * 1.2 + particle.phase) * 0.35 + 0.65;
      const mouseGlow = distanceToMouse(point);
      const radius = particle.radius * (0.8 + pulse * 0.5 + mouseGlow);

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = palette.particle;
      ctx.globalAlpha = clamp(0.24 + pulse * 0.24 + mouseGlow * 0.46, 0, 0.95);
      ctx.shadowBlur = 10 + mouseGlow * 18;
      ctx.shadowColor = palette.particle;
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.displayWidth = width;
    canvas.displayHeight = height;

    ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    buildField();
  }

  function animate(now) {
    if (!isTabVisible || isScrolling) {
      animationId = requestAnimationFrame(animate);
      return;
    }

    if (now - lastFrameTime < config.frameInterval) {
      animationId = requestAnimationFrame(animate);
      return;
    }
    lastFrameTime = now;

    const palette = colors[currentTheme] || colors.light;
    const time = (now - startTime) * 0.001;
    const { width, height } = getDimensions();
    const tracedLines = lines.map((line) => ({
      line,
      points: traceLine(line, time),
    }));

    ctx.clearRect(0, 0, width, height);
    drawBackground(palette);
    drawVortexHints(time, palette);
    drawFlowLines(tracedLines, palette);
    drawDataParticles(time, tracedLines, palette);

    animationId = requestAnimationFrame(animate);
  }

  function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }

  function handleMouseLeave() {
    mouse.x = null;
    mouse.y = null;
  }

  function handleVisibilityChange() {
    isTabVisible = !document.hidden;
  }

  function handleScroll() {
    isScrolling = true;

    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    scrollTimeout = setTimeout(() => {
      isScrolling = false;
    }, 160);
  }

  function updateTheme(theme) {
    currentTheme = theme;
  }

  function initCanvas() {
    canvas = document.getElementById("climate-particles-canvas");
    if (!canvas) return false;

    ctx = canvas.getContext("2d");
    currentTheme = document.documentElement.getAttribute("data-theme") || "light";

    resizeCanvas();

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return true;
  }

  function init() {
    if (!initCanvas()) return;

    startTime = performance.now();
    animate(startTime);

    canvas.style.opacity = "0";
    canvas.style.transition = `opacity ${config.fadeInMs}ms ease`;
    setTimeout(() => {
      canvas.style.opacity = "1";
    }, 100);
  }

  function destroy() {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    window.removeEventListener("resize", resizeCanvas);
    window.removeEventListener("scroll", handleScroll);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseleave", handleMouseLeave);
    document.removeEventListener("visibilitychange", handleVisibilityChange);

    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
  }

  window.updateClimateParticlesTheme = updateTheme;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("beforeunload", destroy);
})();
