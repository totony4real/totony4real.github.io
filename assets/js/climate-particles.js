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
    connectionDistance: 150, // Increased for more connections
    mouseInteractionRadius: 200, // Increased interaction area
    animationSpeed: 0.2,
    particleMinSize: 2.5,
    particleMaxSize: 5,
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

      // Enhanced aurora glow effect when near mouse
      if (isNearMouse && glowIntensity > 0.2) {
        // Outer glow (largest)
        const outerGlow = ctx.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.size * 8,
        );
        outerGlow.addColorStop(0, `${palette.aurora1}${Math.floor(glowIntensity * 100).toString(16).padStart(2, '0')}`);
        outerGlow.addColorStop(0.3, `${palette.aurora2}${Math.floor(glowIntensity * 60).toString(16).padStart(2, '0')}`);
        outerGlow.addColorStop(0.6, `${palette.aurora3}${Math.floor(glowIntensity * 30).toString(16).padStart(2, '0')}`);
        outerGlow.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 8, 0, Math.PI * 2);
        ctx.fillStyle = outerGlow;
        ctx.fill();

        // Middle glow
        const middleGlow = ctx.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.size * 4,
        );
        middleGlow.addColorStop(0, `${palette.glow}${Math.floor(glowIntensity * 180).toString(16).padStart(2, '0')}`);
        middleGlow.addColorStop(0.5, `${palette.accent}${Math.floor(glowIntensity * 120).toString(16).padStart(2, '0')}`);
        middleGlow.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = middleGlow;
        ctx.fill();
      }

      // Main particle with aurora effect
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

      if (isNearMouse) {
        // Aurora gradient for the particle itself
        const particleGradient = ctx.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.size,
        );
        particleGradient.addColorStop(0, palette.glow);
        particleGradient.addColorStop(0.6, palette.accent);
        particleGradient.addColorStop(1, palette.aurora2);
        ctx.fillStyle = particleGradient;
      } else {
        // Subtle gradient for inactive particles
        const inactiveGradient = ctx.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.size,
        );
        inactiveGradient.addColorStop(0, palette.primary);
        inactiveGradient.addColorStop(1, palette.accent);
        ctx.fillStyle = inactiveGradient;
      }

      const alpha = 0.7 + glowIntensity * 0.3;
      ctx.globalAlpha = alpha;
      ctx.fill();

      // Add bright core
      if (isNearMouse && glowIntensity > 0.5) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = palette.secondary;
        ctx.globalAlpha = glowIntensity;
        ctx.fill();
      }

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

    // Listen to both canvas and container for mouse events
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    canvas.parentElement.addEventListener("mousemove", handleMouseMove);
    canvas.parentElement.addEventListener("mouseleave", handleMouseLeave);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return true;
  }

  /**
   * Resize canvas to match container
   */
  function resizeCanvas() {
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;

    // Get the actual dimensions
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

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
   * Draw connections between nearby particles with aurora effects
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
          const baseOpacity = 1 - distance / config.connectionDistance;

          // Check if either particle is near mouse
          let mouseBoost = 0;
          let nearestDist = Infinity;

          if (mouse.x !== null && mouse.y !== null) {
            const dist1 = Math.sqrt(
              Math.pow(particles[i].x - mouse.x, 2) + Math.pow(particles[i].y - mouse.y, 2),
            );
            const dist2 = Math.sqrt(
              Math.pow(particles[j].x - mouse.x, 2) + Math.pow(particles[j].y - mouse.y, 2),
            );

            nearestDist = Math.min(dist1, dist2);

            if (nearestDist < config.mouseInteractionRadius) {
              mouseBoost = 1 - nearestDist / config.mouseInteractionRadius;
            }
          }

          // Pulsing effect based on animation time
          const pulsePhase = (animationTime * 0.002 + (i + j) * 0.1) % (Math.PI * 2);
          const pulse = Math.sin(pulsePhase) * 0.3 + 0.7;

          if (mouseBoost > 0.1) {
            // Enhanced aurora effect on active connections

            // Draw glow layers for depth
            for (let layer = 3; layer > 0; layer--) {
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

              const alpha1 = Math.floor((mouseBoost * baseOpacity * 255) / (layer * 1.5));
              const alpha2 = Math.floor((mouseBoost * baseOpacity * 200) / (layer * 1.5));
              const alpha3 = Math.floor((mouseBoost * baseOpacity * 255) / (layer * 1.5));

              gradient.addColorStop(0, `${palette.aurora1}${alpha1.toString(16).padStart(2, '0')}`);
              gradient.addColorStop(0.5, `${palette.aurora2}${alpha2.toString(16).padStart(2, '0')}`);
              gradient.addColorStop(1, `${palette.aurora3}${alpha3.toString(16).padStart(2, '0')}`);

              ctx.strokeStyle = gradient;
              ctx.lineWidth = (3 - layer + 1) * mouseBoost * 1.5;
              ctx.stroke();
            }

            // Bright core line
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = palette.glow;
            ctx.lineWidth = 1.5 * mouseBoost;
            ctx.globalAlpha = mouseBoost * pulse;
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Flowing particles along connections
            if (mouseBoost > 0.5) {
              const flowProgress = (animationTime * 0.003 + (i + j) * 0.05) % 1;
              const flowX = particles[i].x + (particles[j].x - particles[i].x) * flowProgress;
              const flowY = particles[i].y + (particles[j].y - particles[i].y) * flowProgress;

              ctx.beginPath();
              ctx.arc(flowX, flowY, 2, 0, Math.PI * 2);

              const flowGradient = ctx.createRadialGradient(flowX, flowY, 0, flowX, flowY, 8);
              flowGradient.addColorStop(0, palette.glow);
              flowGradient.addColorStop(0.5, palette.aurora2);
              flowGradient.addColorStop(1, "transparent");

              ctx.fillStyle = flowGradient;
              ctx.globalAlpha = mouseBoost;
              ctx.fill();
              ctx.globalAlpha = 1;
            }
          } else {
            // Regular connection (more visible than before)
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);

            // Subtle gradient on inactive connections too
            const gradient = ctx.createLinearGradient(
              particles[i].x,
              particles[i].y,
              particles[j].x,
              particles[j].y,
            );

            const alpha = Math.floor(baseOpacity * 120 * pulse);
            gradient.addColorStop(0, `${palette.accent}${alpha.toString(16).padStart(2, '0')}`);
            gradient.addColorStop(0.5, `${palette.primary}${alpha.toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, `${palette.accent}${alpha.toString(16).padStart(2, '0')}`);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1.5;
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
