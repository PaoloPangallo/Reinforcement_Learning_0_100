class SnakeViewer {
  constructor() {
    // Polyfill for roundRect if not supported
    if (!CanvasRenderingContext2D.prototype.roundRect) {
      CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
      };
    }

    // Canvas & Context
    this.canvas = document.getElementById('snake-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.overlay = document.getElementById('canvas-overlay');

    // UI Elements
    this.episodeSelect = document.getElementById('episode-select');
    this.speedSlider = document.getElementById('speed-slider');
    this.speedValue = document.getElementById('speed-value');
    this.frameSlider = document.getElementById('frame-slider');
    this.playBtn = document.getElementById('play-btn');
    this.pauseBtn = document.getElementById('pause-btn');
    this.resetBtn = document.getElementById('reset-btn');

    // Info Elements
    this.currentFrameDisplay = document.getElementById('current-frame');
    this.totalFramesDisplay = document.getElementById('total-frames');
    this.statusIndicator = document.getElementById('status-indicator');
    this.fpsCounter = document.getElementById('fps-counter');

    // State
    this.episodeData = null;
    this.isPlaying = false;
    this.currentFrame = 0;
    this.animationId = null;
    this.lastFrameTime = 0;
    this.fps = 0;
    this.fpsHistory = [];

    this.init();
  }

  init() {
    // Event Listeners
    this.episodeSelect.addEventListener('change', () => this.onEpisodeChange());
    this.speedSlider.addEventListener('input', (e) => this.onSpeedChange(e));
    this.frameSlider.addEventListener('input', (e) => this.onFrameSliderChange(e));
    this.playBtn.addEventListener('click', () => this.play());
    this.pauseBtn.addEventListener('click', () => this.pause());
    this.resetBtn.addEventListener('click', () => this.reset());

    // Load initial episode
    this.loadEpisode();

    // Update FPS counter
    setInterval(() => this.updateFpsDisplay(), 500);
  }

  async loadEpisode() {
    const episodeFile = this.episodeSelect.value;
    try {
      this.setStatus('Loading...', 'neutral');
      const response = await fetch(`/snake/episode/${episodeFile}`);
      this.episodeData = await response.json();
      this.reset();
      this.setStatus('Ready', 'ready');
      this.updateStats();
    } catch (error) {
      console.error('Error loading episode:', error);
      this.setStatus('Error loading episode', 'error');
    }
  }

  onEpisodeChange() {
    this.pause();
    this.loadEpisode();
  }

  onSpeedChange(e) {
    const speed = parseInt(e.target.value);
    this.speedValue.textContent = `${speed}x`;
  }

  onFrameSliderChange(e) {
    const frame = parseInt(e.target.value);
    this.currentFrame = frame;
    this.drawFrame();
    this.updateFrameInfo();
  }

  play() {
    if (!this.episodeData) return;

    if (this.currentFrame >= this.episodeData.steps.length - 1) {
      this.reset();
    }

    this.isPlaying = true;
    this.playBtn.disabled = true;
    this.pauseBtn.disabled = false;
    this.setStatus('Playing', 'playing');
    this.animate();
  }

  pause() {
    this.isPlaying = false;
    this.playBtn.disabled = false;
    this.pauseBtn.disabled = true;
    this.setStatus('Paused', 'ready');
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  reset() {
    this.isPlaying = false;
    this.currentFrame = 0;
    this.playBtn.disabled = false;
    this.pauseBtn.disabled = true;
    this.setStatus('Ready', 'ready');

    if (this.episodeData) {
      this.frameSlider.max = this.episodeData.steps.length - 1;
      this.totalFramesDisplay.textContent = this.episodeData.steps.length;
    }

    this.drawFrame();
    this.updateFrameInfo();
  }

  animate() {
    const now = performance.now();
    const speed = parseInt(this.speedSlider.value);
    const frameTime = 1000 / speed;

    if (now - this.lastFrameTime >= frameTime) {
      this.lastFrameTime = now;

      if (this.currentFrame < this.episodeData.steps.length - 1) {
        this.currentFrame++;
        this.frameSlider.value = this.currentFrame;
        this.drawFrame();
        this.updateFrameInfo();

        // FPS tracking
        this.fpsHistory.push(1000 / (now - this.lastFrameTime));
        if (this.fpsHistory.length > 30) this.fpsHistory.shift();
      } else {
        this.pause();
        this.setStatus('Finished', 'finished');
      }
    }

    if (this.isPlaying) {
      this.animationId = requestAnimationFrame(() => this.animate());
    }
  }

  drawFrame() {
    if (!this.episodeData) return;

    const step = this.episodeData.steps[this.currentFrame];
    const gridSize = this.episodeData.grid_size;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGrid(gridSize);
    this.drawApple(step.apple, gridSize);
    this.drawSnake(step.snake, gridSize);
    this.updateDetailInfo(step);
  }

  drawGrid(gridSize) {
    const cellSize = this.canvas.width / gridSize;
    this.ctx.strokeStyle = 'rgba(64, 64, 64, 0.3)';
    this.ctx.lineWidth = 0.5;

    for (let i = 0; i <= gridSize; i++) {
      const pos = i * cellSize;
      // Vertical lines
      this.ctx.beginPath();
      this.ctx.moveTo(pos, 0);
      this.ctx.lineTo(pos, this.canvas.height);
      this.ctx.stroke();

      // Horizontal lines
      this.ctx.beginPath();
      this.ctx.moveTo(0, pos);
      this.ctx.lineTo(this.canvas.width, pos);
      this.ctx.stroke();
    }
  }

  drawApple(apple, gridSize) {
    const cellSize = this.canvas.width / gridSize;
    const x = apple[1] * cellSize;
    const y = apple[0] * cellSize;

    // Apple body
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.beginPath();
    this.ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Apple shine
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(x + cellSize * 0.65, y + cellSize * 0.35, cellSize / 6, 0, Math.PI * 2);
    this.ctx.fill();

    // Apple stem
    this.ctx.strokeStyle = '#27ae60';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x + cellSize / 2, y + cellSize / 2 - cellSize / 2.2);
    this.ctx.lineTo(x + cellSize / 2, y + cellSize / 2 - cellSize / 3);
    this.ctx.stroke();
  }

  drawSnake(snake, gridSize) {
    const cellSize = this.canvas.width / gridSize;

    // Body (skip head)
    for (let i = 1; i < snake.length; i++) {
      const segment = snake[i];
      const x = segment[1] * cellSize;
      const y = segment[0] * cellSize;

      // Gradient body
      const gradient = this.ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
      gradient.addColorStop(0, '#27ae60');
      gradient.addColorStop(1, '#229954');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 3);
      this.ctx.fill();

      // Body outline
      this.ctx.strokeStyle = 'rgba(39, 174, 96, 0.6)';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }

    // Head
    const head = snake[0];
    const headX = head[1] * cellSize;
    const headY = head[0] * cellSize;

    const headGradient = this.ctx.createRadialGradient(
      headX + cellSize / 2, headY + cellSize / 2, cellSize / 6,
      headX + cellSize / 2, headY + cellSize / 2, cellSize / 1.8
    );
    headGradient.addColorStop(0, '#2ecc71');
    headGradient.addColorStop(1, '#27ae60');

    this.ctx.fillStyle = headGradient;
    this.ctx.beginPath();
    this.ctx.roundRect(headX + 2, headY + 2, cellSize - 4, cellSize - 4, 3);
    this.ctx.fill();

    // Head shine effect
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    this.ctx.beginPath();
    this.ctx.arc(headX + cellSize * 0.35, headY + cellSize * 0.35, cellSize / 5.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Head border (darker)
    this.ctx.strokeStyle = '#1e8449';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(headX + 2, headY + 2, cellSize - 4, cellSize - 4, 3);
    this.ctx.stroke();
  }

  updateFrameInfo() {
    this.currentFrameDisplay.textContent = this.currentFrame;
  }

  updateDetailInfo(step) {
    document.getElementById('detail-step').textContent = step.step;
    document.getElementById('detail-reward').textContent = step.reward.toFixed(3);
    document.getElementById('detail-snake-pos').textContent = `[${step.snake[0][0]}, ${step.snake[0][1]}]`;
    document.getElementById('detail-apple-pos').textContent = `[${step.apple[0]}, ${step.apple[1]}]`;
    document.getElementById('stat-length').textContent = step.snake.length;
  }

  updateStats() {
    if (!this.episodeData) return;

    document.getElementById('stat-total-steps').textContent = this.episodeData.end.total_steps;
    document.getElementById('stat-apples').textContent = this.episodeData.end.total_apples;
    document.getElementById('stat-cause').textContent = this.episodeData.end.cause.toUpperCase();
  }

  updateFpsDisplay() {
    if (this.fpsHistory.length > 0) {
      const avgFps = (this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length).toFixed(0);
      this.fpsCounter.textContent = avgFps;
    }
  }

  setStatus(text, status) {
    this.statusIndicator.textContent = text;
    this.statusIndicator.className = `info-value ${status === 'playing' ? 'playing' : status === 'error' ? 'finished' : ''}`;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  new SnakeViewer();
});