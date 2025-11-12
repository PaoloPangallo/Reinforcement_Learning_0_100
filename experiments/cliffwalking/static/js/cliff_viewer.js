/**
 * CliffWalking Visualizer - Production Ready
 * RL Algorithm Visualization
 */

// ===================================
// CONFIG
// ===================================
const CONFIG = {
  grid: { rows: 4, cols: 12, goal: 47, start: 0 },
  speeds: { slow: 600, normal: 300, fast: 100 },
  algorithms: {
    qlearning: 'Q-Learning',
    sarsa: 'SARSA',
    expected_sarsa: 'Expected SARSA',
    sarsa_lambda: 'SARSA(λ)',
  },
  basePath: '/cliff',
  actions: ['↑', '→', '↓', '←'],
  toastDuration: 4000,
};

// Get cliff states
const getCliffStates = () => {
  const states = new Set();
  for (let c = 0; c < CONFIG.grid.cols - 1; c++) {
    states.add((CONFIG.grid.rows - 1) * CONFIG.grid.cols + c);
  }
  return states;
};

const CLIFF_STATES = getCliffStates();

// ===================================
// STATE MANAGEMENT
// ===================================
const state = {
  currentAlgorithm: 'qlearning',
  currentEpisode: null,
  currentTrajectory: [],
  currentStep: 0,
  isPlaying: false,
  playSpeed: 'normal',
  visitedStates: new Set(),
};

// ===================================
// DOM ELEMENTS
// ===================================
const els = {
  algoSelect: document.getElementById('algo-select'),
  epSelect: document.getElementById('episode-select'),
  speedSelect: document.getElementById('speed-select'),
  playBtn: document.getElementById('play-btn'),
  resetBtn: document.getElementById('reset-btn'),
  timeline: document.getElementById('timeline'),
  gridContainer: document.getElementById('grid-container'),
  stepDisplay: document.getElementById('step-display'),
  totalSteps: document.getElementById('total-steps'),
  infoAlgo: document.getElementById('info-algo'),
  infoEpisode: document.getElementById('info-episode'),
  infoStep: document.getElementById('info-step'),
  infoTotal: document.getElementById('info-total'),
  infoReward: document.getElementById('info-reward'),
  actionDisplay: document.getElementById('action-display'),
  statEpisodes: document.getElementById('stat-episodes'),
  statLength: document.getElementById('stat-length'),
  statFinalReward: document.getElementById('stat-final-reward'),
  errorToast: document.getElementById('error-toast'),
};

// ===================================
// UTILITIES
// ===================================
const coordsToState = (r, c) => r * CONFIG.grid.cols + c;

const showError = (message) => {
  els.errorToast.querySelector('.toast-message').textContent = message;
  els.errorToast.classList.add('show');
  setTimeout(() => els.errorToast.classList.remove('show'), CONFIG.toastDuration);
};

// ===================================
// RENDERING
// ===================================
const renderGrid = (currentState = null) => {
  els.gridContainer.innerHTML = '';

  for (let r = 0; r < CONFIG.grid.rows; r++) {
    for (let c = 0; c < CONFIG.grid.cols; c++) {
      const cellState = coordsToState(r, c);
      const cell = document.createElement('div');
      cell.classList.add('cell');

      // Cell type
      if (cellState === CONFIG.grid.start) {
        cell.classList.add('start');
        cell.textContent = 'S';
      } else if (cellState === CONFIG.grid.goal) {
        cell.classList.add('goal');
        cell.textContent = '🎯';
      } else if (CLIFF_STATES.has(cellState)) {
        cell.classList.add('cliff');
        cell.textContent = '⚠️';
      }

      // Current state
      if (cellState === currentState) {
        cell.classList.add('current');
        const agent = document.createElement('div');
        agent.classList.add('agent');
        agent.textContent = '🤖';
        cell.appendChild(agent);
      } else if (state.visitedStates.has(cellState)) {
        cell.classList.add('visited');
      }

      els.gridContainer.appendChild(cell);
    }
  }
};

const updateInfo = (step, totalSteps, reward, action, algo, episode) => {
  els.infoAlgo.textContent = CONFIG.algorithms[algo] || algo;
  els.infoEpisode.textContent = episode || '—';
  els.infoStep.textContent = step;
  els.infoTotal.textContent = totalSteps;
  els.stepDisplay.textContent = step;
  els.totalSteps.textContent = `Totale: ${totalSteps}`;
  els.infoReward.textContent = reward.toFixed(2);
  els.actionDisplay.textContent = action;
};

const updateStats = (episodes, length, finalReward) => {
  els.statEpisodes.textContent = episodes;
  els.statLength.textContent = length;
  els.statFinalReward.textContent = finalReward.toFixed(2);
};

const updatePlayButton = (isPlaying) => {
  els.playBtn.textContent = isPlaying ? '⏸️ Pausa' : '▶️ Play';
};

const renderFrame = () => {
  if (state.currentTrajectory.length === 0) {
    renderGrid();
    return;
  }

  const step = Math.min(state.currentStep, state.currentTrajectory.length - 1);
  const stepData = state.currentTrajectory[step];
  const cellState = stepData.state;
  const action = stepData.action;

  // Cumulative reward
  let reward = 0;
  for (let i = 0; i <= step; i++) {
    reward += state.currentTrajectory[i].reward || 0;
  }

  // Add to visited
  state.visitedStates.add(cellState);

  // Render
  renderGrid(cellState);
  updateInfo(
    step,
    state.currentTrajectory.length,
    reward,
    CONFIG.actions[action] || '—',
    state.currentAlgorithm,
    state.currentEpisode
  );
  els.timeline.max = state.currentTrajectory.length;
  els.timeline.value = step;
};

// ===================================
// API CALLS
// ===================================
const fetchEpisodes = async (algo) => {
  try {
    const res = await fetch(`${CONFIG.basePath}/api/results`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.available_snapshots?.[algo] || [];
  } catch (err) {
    showError(`Errore caricamento episodi: ${err.message}`);
    return [];
  }
};

const fetchTrajectory = async (algo, ep) => {
  try {
    const res = await fetch(`${CONFIG.basePath}/api/trajectory/${algo}/${ep}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    showError(`Errore caricamento traiettoria: ${err.message}`);
    return [];
  }
};

// ===================================
// STATE TRANSITIONS
// ===================================
const loadTrajectory = async (algo, ep) => {
  state.currentAlgorithm = algo;
  state.currentEpisode = ep;
  state.currentStep = 0;
  state.visitedStates.clear();
  state.isPlaying = false;

  state.currentTrajectory = await fetchTrajectory(algo, ep);

  if (state.currentTrajectory.length === 0) {
    showError('Traiettoria vuota');
    return;
  }

  const finalReward = state.currentTrajectory.reduce((sum, s) => sum + (s.reward || 0), 0);
  updateStats(els.epSelect.options.length, state.currentTrajectory.length, finalReward);
  renderFrame();
};

const loadEpisodes = async (algo) => {
  els.algoSelect.disabled = true;
  els.epSelect.disabled = true;

  const episodes = await fetchEpisodes(algo);
  const unique = [...new Set(episodes)].sort((a, b) => parseInt(a) - parseInt(b));

  els.epSelect.innerHTML = '';
  if (unique.length === 0) {
    els.epSelect.innerHTML = '<option value="">(nessun episodio)</option>';
    els.algoSelect.disabled = false;
    els.epSelect.disabled = false;
    return;
  }

  unique.forEach(ep => {
    const opt = document.createElement('option');
    opt.value = ep;
    opt.textContent = `Episodio ${ep}`;
    els.epSelect.appendChild(opt);
  });

  updateStats(unique.length, 0, 0);

  if (unique.length > 0) {
    els.epSelect.value = unique[0];
    await loadTrajectory(algo, unique[0]);
  }

  els.algoSelect.disabled = false;
  els.epSelect.disabled = false;
};

// ===================================
// AUTO PLAY
// ===================================
const autoPlay = async () => {
  if (state.isPlaying || state.currentTrajectory.length === 0) return;

  state.isPlaying = true;
  updatePlayButton(true);
  els.algoSelect.disabled = true;
  els.epSelect.disabled = true;
  els.speedSelect.disabled = true;

  const speed = CONFIG.speeds[state.playSpeed] || CONFIG.speeds.normal;

  for (let i = state.currentStep; i < state.currentTrajectory.length && state.isPlaying; i++) {
    state.currentStep = i;
    renderFrame();
    await new Promise(r => setTimeout(r, speed));
  }

  state.isPlaying = false;
  updatePlayButton(false);
  els.algoSelect.disabled = false;
  els.epSelect.disabled = false;
  els.speedSelect.disabled = false;
};

// ===================================
// EVENT LISTENERS
// ===================================
els.algoSelect.addEventListener('change', (e) => {
  loadEpisodes(e.target.value);
});

els.epSelect.addEventListener('change', (e) => {
  if (e.target.value) {
    loadTrajectory(state.currentAlgorithm, e.target.value);
  }
});

els.playBtn.addEventListener('click', () => {
  if (state.currentTrajectory.length === 0) {
    showError('Nessuna traiettoria caricata');
    return;
  }
  if (state.isPlaying) {
    state.isPlaying = false;
    updatePlayButton(false);
  } else {
    autoPlay();
  }
});

els.resetBtn.addEventListener('click', () => {
  state.currentStep = 0;
  state.isPlaying = false;
  state.visitedStates.clear();
  updatePlayButton(false);
  renderFrame();
});

els.timeline.addEventListener('input', (e) => {
  if (state.isPlaying) return;
  state.currentStep = parseInt(e.target.value);
  renderFrame();
});

els.speedSelect.addEventListener('change', (e) => {
  state.playSpeed = e.target.value;
});

document.getElementById('error-toast').querySelector('.toast-close').addEventListener('click', (e) => {
  e.target.closest('.toast').classList.remove('show');
});

// ===================================
// INIT
// ===================================
window.addEventListener('DOMContentLoaded', () => {
  renderGrid();
  loadEpisodes('qlearning');
});