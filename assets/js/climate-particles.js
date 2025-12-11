/**
 * Climate Neural Network Particle System
 * A custom particle animation representing ML-driven climate modeling
 * Combines hexagonal grids (ice crystals + ML networks) with organic flow
 */

(function () {
  "use strict";

  // Configuration
  const config = {
    particleCountDesktop: 90,
    particleCountMobile: 45,
    connectionDistance: 120,
    mouseInteractionRadius: 150,
    animationSpeed: 0.2,
    particleMinSize: 2,
    particleMaxSize: 4,
    driftSpeed: { min: 0.1, max: 0.3 },
    directionChangeInterval: { min: 200, max: 300 },
  };

  // State
  let canvas, ctx;
  let particles = [];
  let mouse = { x: null, y: null };
  let animationId = null;
  let currentTheme = "light";
  let isTabVisible = true;

  // Color schemes
  const colors = {
    light: {
      primary: "#0a2463",
      secondary: "#ffffff",
      accent: "#2698ba",
      glow: "#00d9ff",
      connection: "rgba(10, 36, 99, 0.15)",
    },
    dark: {
      primary: "#00d9ff",
      secondary: "#ffffff",
      accent: "#4ecca3",
      glow: "#2698ba",
      connection: "rgba(0, 217, 255, 0.2)",
    },
  };

  /**
   * Particle class
   */
  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.baseX = x;
      this.baseY = y;
      this.size = Math.random() * (config.particleMaxSize - config.particleMinSize) + config.particleMinSize;
      this.vx = (Math.random() - 0.5) * config.driftSpeed.max;
      this.vy = (Math.random() - 0.5) * config.driftSpeed.max;
      this.directionTimer = Math.floor(
        Math.random() * (config.directionChangeInterval.max - config.directionChangeInterval.min) +
          config.directionChangeInterval.min,
      );
      this.directionCounter = 0;
      this.connections = [];
    }

    update() {
      // Organic drift
      this.x += this.vx * config.animationSpeed;
      this.y += this.vy * config.animationSpeed;

      // Periodic direction change
      this.directionCounter++;
      if (this.directionCounter >= this.directionTimer) {
        this.vx = (Math.random() - 0.5) * config.driftSpeed.max;
        this.vy = (Math.random() - 0.5) * config.driftSpeed.max;
        this.directionCounter = 0;
        this.directionTimer = Math.floor(
          Math.random() * (config.directionChangeInterval.max - config.directionChangeInterval.min) +
            config.directionChangeInterval.min,
        );
      }

      // Boundary check - gentle wrap around
      if (this.x < -10) this.x = canvas.width + 10;
      if (this.x > canvas.width + 10) this.x = -10;
      if (this.y < -10) this.y = canvas.height + 10;
      if (this.y > canvas.height + 10) this.y = -10;
    }

    draw() {
      const palette = colors[currentTheme];

      // Calculate mouse distance for interaction
      let distanceToMouse = Infinity;
      if (mouse.x !== null && mouse.y !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        distanceToMouse = Math.sqrt(dx * dx + dy * dy);
      }

      // Particle glow based on mouse proximity
      const isNearMouse = distanceToMouse < config.mouseInteractionRadius;
      const glowIntensity = isNearMouse
        ? 1 - distanceToMouse / config.mouseInteractionRadius
        : 0;

      // Draw particle
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

      if (isNearMouse && glowIntensity > 0.3) {
        // Aurora glow effect
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
        gradient.addColorStop(0, palette.glow);
        gradient.addColorStop(0.5, palette.accent);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Main particle
      const alpha = 0.6 + glowIntensity * 0.4;
      ctx.fillStyle = isNearMouse ? palette.glow : palette.primary;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Initialize canvas
   */
  function initCanvas() {
    canvas = document.getElementById("climate-particles-canvas");
    if (!canvas) return false;

    ctx = canvas.getContext("2d");
    resizeCanvas();

    // Add event listeners
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return true;
  }

  /**
   * Resize canvas to match container
   */
  function resizeCanvas() {
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;

    // Set display size
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    // Set actual size in memory (scaled for retina)
    canvas.width = container.offsetWidth * dpr;
    canvas.height = container.offsetHeight * dpr;

    // Scale context to ensure correct drawing operations
    ctx.scale(dpr, dpr);

    // Regenerate particles on resize
    initParticles();
  }

  /**
   * Initialize particles in hexagonal grid
   */
  function initParticles() {
    particles = [];
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? config.particleCountMobile : config.particleCountDesktop;

    const cols = Math.ceil(Math.sqrt(particleCount * (canvas.width / canvas.height)));
    const rows = Math.ceil(particleCount / cols);

    const spacingX = canvas.width / (cols + 1);
    const spacingY = canvas.height / (rows + 1);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Hexagonal offset
        const offsetX = row % 2 === 0 ? 0 : spacingX / 2;

        // Base position with randomness
        const x = (col + 1) * spacingX + offsetX + (Math.random() - 0.5) * spacingX * 0.4;
        const y = (row + 1) * spacingY + (Math.random() - 0.5) * spacingY * 0.4;

        particles.push(new Particle(x, y));

        if (particles.length >= particleCount) break;
      }
      if (particles.length >= particleCount) break;
    }
  }

  /**
   * Draw connections between nearby particles
   */
  function drawConnections() {
    const palette = colors[currentTheme];

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < config.connectionDistance) {
          // Calculate opacity based on distance (neural network weight visualization)
          const opacity = 1 - distance / config.connectionDistance;

          // Check if either particle is near mouse
          let mouseBoost = 0;
          if (mouse.x !== null && mouse.y !== null) {
            const dist1 = Math.sqrt(
              Math.pow(particles[i].x - mouse.x, 2) + Math.pow(particles[i].y - mouse.y, 2),
            );
            const dist2 = Math.sqrt(
              Math.pow(particles[j].x - mouse.x, 2) + Math.pow(particles[j].y - mouse.y, 2),
            );

            if (
              dist1 < config.mouseInteractionRadius ||
              dist2 < config.mouseInteractionRadius
            ) {
              mouseBoost = 0.5;
            }
          }

          // Draw connection
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);

          if (mouseBoost > 0) {
            // Aurora glow on connections
            ctx.strokeStyle = palette.glow;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = opacity * 0.6 + mouseBoost;
          } else {
            ctx.strokeStyle = palette.connection.includes("rgba")
              ? palette.connection
              : palette.primary;
            ctx.lineWidth = 1;
            ctx.globalAlpha = opacity * 0.4;
          }

          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  /**
   * Animation loop
   */
  function animate() {
    if (!isTabVisible) {
      animationId = requestAnimationFrame(animate);
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections first (behind particles)
    drawConnections();

    // Update and draw particles
    particles.forEach((particle) => {
      particle.update();
      particle.draw();
    });

    animationId = requestAnimationFrame(animate);
  }

  /**
   * Mouse event handlers
   */
  function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }

  function handleMouseLeave() {
    mouse.x = null;
    mouse.y = null;
  }

  /**
   * Handle tab visibility
   */
  function handleVisibilityChange() {
    isTabVisible = !document.hidden;
  }

  /**
   * Update theme colors
   */
  function updateTheme(theme) {
    currentTheme = theme;
  }

  /**
   * Initialize and start animation
   */
  function init() {
    if (!initCanvas()) {
      console.warn("Climate particles canvas not found");
      return;
    }

    // Detect initial theme
    const htmlElement = document.documentElement;
    currentTheme = htmlElement.getAttribute("data-theme") || "light";

    // Initialize particles
    initParticles();

    // Start animation
    animate();

    // Fade in effect
    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 1s ease-in";
    setTimeout(() => {
      canvas.style.opacity = "1";
    }, 100);
  }

  /**
   * Cleanup
   */
  function destroy() {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    window.removeEventListener("resize", resizeCanvas);
    if (canvas) {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    }
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  }

  /**
   * Global function for theme updates
   */
  window.updateClimateParticlesTheme = updateTheme;

  /**
   * Start when DOM is ready
   */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /**
   * Cleanup on page unload
   */
  window.addEventListener("beforeunload", destroy);
})();
