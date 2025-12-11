/**
 * Climate Neural Network Particle System
 * A custom particle animation representing ML-driven climate modeling
 * Combines hexagonal grids (ice crystals + ML networks) with organic flow
 */

(function () {
  "use strict";

  // Configuration
  const config = {
    particleCountDesktop: 40, // Reduced from 90 - much sparser
    particleCountMobile: 20, // Reduced from 45
    connectionDistance: 200, // Increased to maintain connectivity
    mouseInteractionRadius: 250, // Larger area for line effects
    animationSpeed: 0.2,
    particleMinSize: 1, // Much smaller particles
    particleMaxSize: 1.5, // Subtle dots
    driftSpeed: { min: 0.1, max: 0.3 },
    directionChangeInterval: { min: 200, max: 300 },
  };

  // Animation state
  let animationTime = 0;

  // State
  let canvas, ctx;
  let particles = [];
  let mouse = { x: null, y: null };
  let animationId = null;
  let currentTheme = "light";
  let isTabVisible = true;

  // Color schemes - Aurora themed
  const colors = {
    light: {
      primary: "#0a2463",
      secondary: "#ffffff",
      accent: "#2698ba",
      glow: "#00d9ff",
      aurora1: "#2698ba",
      aurora2: "#4ecca3",
      aurora3: "#00d9ff",
      connection: "rgba(38, 152, 186, 0.3)", // More visible
    },
    dark: {
      primary: "#00d9ff",
      secondary: "#ffffff",
      accent: "#4ecca3",
      glow: "#2698ba",
      aurora1: "#00d9ff",
      aurora2: "#4ecca3",
      aurora3: "#2698ba",
      connection: "rgba(0, 217, 255, 0.4)", // More visible
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
      const width = canvas.displayWidth || canvas.width;
      const height = canvas.displayHeight || canvas.height;

      if (this.x < -10) this.x = width + 10;
      if (this.x > width + 10) this.x = -10;
      if (this.y < -10) this.y = height + 10;
      if (this.y > height + 10) this.y = -10;
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

      // Very subtle particles - just tiny dots
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

      if (isNearMouse && glowIntensity > 0.3) {
        // Slightly brighter when near mouse
        ctx.fillStyle = palette.glow;
        ctx.globalAlpha = 0.6 + glowIntensity * 0.4;
      } else {
        // Very subtle when idle
        ctx.fillStyle = palette.primary;
        ctx.globalAlpha = 0.3;
      }

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

    // Listen to document for mouse events (since container has pointer-events: none)
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return true;
  }

  /**
   * Resize canvas to match container
   */
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;

    // Get viewport dimensions (since container is fixed full-screen)
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Set display size
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    // Set actual size in memory (scaled for retina)
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Scale context to ensure correct drawing operations
    ctx.scale(dpr, dpr);

    // Store display dimensions for particle calculations
    canvas.displayWidth = width;
    canvas.displayHeight = height;

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

    // Use display dimensions for calculations
    const width = canvas.displayWidth || canvas.width;
    const height = canvas.displayHeight || canvas.height;

    const cols = Math.ceil(Math.sqrt(particleCount * (width / height)));
    const rows = Math.ceil(particleCount / cols);

    const spacingX = width / (cols + 1);
    const spacingY = height / (rows + 1);

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

    console.log(`Initialized ${particles.length} particles in ${width}x${height} canvas`);
  }

  /**
   * Draw connections with emphasis on mouse proximity
   * Lines get thicker and show aurora colors near cursor
   */
  function drawConnections() {
    const palette = colors[currentTheme];

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < config.connectionDistance) {
          // Calculate opacity based on distance (neural network weight)
          const baseOpacity = 1 - distance / config.connectionDistance;

          // Calculate distance from line to mouse (closest point on line)
          let lineProximity = 0;

          if (mouse.x !== null && mouse.y !== null) {
            // Find closest point on line segment to mouse
            const lineLength = distance;
            const t = Math.max(
              0,
              Math.min(
                1,
                ((mouse.x - particles[i].x) * (particles[j].x - particles[i].x) +
                  (mouse.y - particles[i].y) * (particles[j].y - particles[i].y)) /
                  (lineLength * lineLength),
              ),
            );

            const closestX = particles[i].x + t * (particles[j].x - particles[i].x);
            const closestY = particles[i].y + t * (particles[j].y - particles[i].y);

            const distToLine = Math.sqrt(
              Math.pow(mouse.x - closestX, 2) + Math.pow(mouse.y - closestY, 2),
            );

            if (distToLine < config.mouseInteractionRadius) {
              lineProximity = 1 - distToLine / config.mouseInteractionRadius;
            }
          }

          // Pulsing effect
          const pulsePhase = (animationTime * 0.002 + (i + j) * 0.1) % (Math.PI * 2);
          const pulse = Math.sin(pulsePhase) * 0.2 + 0.8;

          // Calculate line thickness based on proximity
          const baseWidth = 0.8;
          const maxWidth = 6;
          const lineWidth = baseWidth + lineProximity * (maxWidth - baseWidth);

          // Draw multi-layer aurora effect for lines near cursor
          if (lineProximity > 0.05) {
            // Draw glow layers (bigger to smaller)
            for (let layer = 4; layer > 0; layer--) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);

              // Aurora gradient along the line
              const gradient = ctx.createLinearGradient(
                particles[i].x,
                particles[i].y,
                particles[j].x,
                particles[j].y,
              );

              const alpha1 = Math.floor((lineProximity * baseOpacity * 200) / layer);
              const alpha2 = Math.floor((lineProximity * baseOpacity * 150) / layer);
              const alpha3 = Math.floor((lineProximity * baseOpacity * 200) / layer);

              gradient.addColorStop(0, `${palette.aurora1}${alpha1.toString(16).padStart(2, '0')}`);
              gradient.addColorStop(0.5, `${palette.aurora2}${alpha2.toString(16).padStart(2, '0')}`);
              gradient.addColorStop(1, `${palette.aurora3}${alpha3.toString(16).padStart(2, '0')}`);

              ctx.strokeStyle = gradient;
              ctx.lineWidth = lineWidth * (1 + (4 - layer) * 0.5);
              ctx.stroke();
            }

            // Bright core line
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);

            const coreGradient = ctx.createLinearGradient(
              particles[i].x,
              particles[i].y,
              particles[j].x,
              particles[j].y,
            );
            coreGradient.addColorStop(0, palette.glow);
            coreGradient.addColorStop(0.5, palette.secondary);
            coreGradient.addColorStop(1, palette.glow);

            ctx.strokeStyle = coreGradient;
            ctx.lineWidth = lineWidth * 0.5;
            ctx.globalAlpha = lineProximity * pulse;
            ctx.stroke();
            ctx.globalAlpha = 1;
          } else {
            // Inactive/subtle lines
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);

            // Subtle gradient
            const gradient = ctx.createLinearGradient(
              particles[i].x,
              particles[i].y,
              particles[j].x,
              particles[j].y,
            );

            const alpha = Math.floor(baseOpacity * 80 * pulse);
            gradient.addColorStop(0, `${palette.accent}${alpha.toString(16).padStart(2, '0')}`);
            gradient.addColorStop(0.5, `${palette.primary}${alpha.toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, `${palette.accent}${alpha.toString(16).padStart(2, '0')}`);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = baseWidth;
            ctx.stroke();
          }
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

    // Increment animation time for pulsing effects
    animationTime++;

    // Use display dimensions for clearing
    const width = canvas.displayWidth || canvas.width;
    const height = canvas.displayHeight || canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

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
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseleave", handleMouseLeave);
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
