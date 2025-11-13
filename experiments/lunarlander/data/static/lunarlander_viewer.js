document.addEventListener("DOMContentLoaded", async () => {
  const video = document.getElementById("landerVideo");
  const select = document.getElementById("checkpointSelect");
  const caption = document.getElementById("caption");
  const playAllBtn = document.getElementById("playAllBtn");
  const algoButtonsContainer = document.getElementById("algoButtons");
  const statsPanel = document.getElementById("statsPanel");
  const loadingSpinner = document.getElementById("loadingSpinner");

  let chart = null;
  let currentAlgo = null;
  let dataCache = {};
  let isPlaying = false;

  // === Utilità ===
  function showLoading() {
    loadingSpinner.classList.add("active");
  }

  function hideLoading() {
    loadingSpinner.classList.remove("active");
  }

  function updateStats(item) {
    const reward = item.reward.toFixed(2);
    const episode = item.episode;
    const status = reward > 200 ? "✅ Eccellente" : reward > 0 ? "⚠️ Buono" : "❌ In addestramento";

    statsPanel.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Episodio</span>
        <span class="stat-value">${episode}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Reward</span>
        <span class="stat-value ${reward > 200 ? 'positive' : reward > 0 ? 'neutral' : 'negative'}">${reward}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Status</span>
        <span class="stat-value">${status}</span>
      </div>
    `;
  }

  // === 1. Carica dinamicamente gli algoritmi ===
  async function loadAlgorithms() {
    showLoading();
    try {
      const res = await fetch("/lunarlander/algorithms");
      const algos = await res.json();

      algos.forEach((algo, idx) => {
        const btn = document.createElement("button");
        btn.className = "algo-btn";
        btn.dataset.algo = algo;
        btn.setAttribute("aria-label", `Algoritmo ${algo.toUpperCase()}`);
        btn.textContent = algo.toUpperCase();
        algoButtonsContainer.appendChild(btn);
      });

      // Attiva il primo di default
      const first = algoButtonsContainer.querySelector("button");
      if (first) {
        first.classList.add("active");
        currentAlgo = first.dataset.algo;
        await loadProgress(currentAlgo);
      }

      // Event delegation per i bottoni
      algoButtonsContainer.addEventListener("click", async (e) => {
        if (!e.target.classList.contains("algo-btn")) return;

        document.querySelectorAll(".algo-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        currentAlgo = e.target.dataset.algo;

        await loadProgress(currentAlgo);
      });
    } catch (error) {
      console.error("Errore nel caricamento degli algoritmi:", error);
      caption.textContent = "❌ Errore nel caricamento degli algoritmi";
    } finally {
      hideLoading();
    }
  }

  // === 2. Carica i progressi ===
  async function loadProgress(algo) {
    showLoading();
    caption.textContent = "⏳ Caricamento dati...";

    try {
      const res = await fetch(`/lunarlander/progress/${algo}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      dataCache[algo] = data;

      // Popola il select
      select.innerHTML = "";
      data.forEach((item, idx) => {
        const opt = document.createElement("option");
        opt.value = idx;
        const rewardText = item.reward > 0 ? `+${item.reward.toFixed(1)}` : item.reward.toFixed(1);
        opt.textContent = `Ep ${item.episode} — ${rewardText} pts`;
        select.appendChild(opt);
      });

      if (data.length > 0) {
        updateVideo(data[0]);
        updateStats(data[0]);
        await renderChart(algo);
      }
    } catch (error) {
      console.error("Errore nel caricamento dei progressi:", error);
      caption.textContent = "❌ Errore nel caricamento dei dati";
    } finally {
      hideLoading();
    }
  }

  function updateVideo(item) {
    video.src = `/lunarlander/videos/${item.file}`;
    caption.textContent = `🎬 Episodio ${item.episode} — Reward: ${item.reward.toFixed(1)}`;
  }

  select.addEventListener("change", () => {
    const algoData = dataCache[currentAlgo];
    const item = algoData[parseInt(select.value)];
    updateVideo(item);
    updateStats(item);
  });

  // === 3. Grafico Reward con caching ===
  async function renderChart(algo) {
    const ctx = document.getElementById("rewardChart").getContext("2d");
    const csvPath = `/lunarlander/rewards/${algo}`;

    try {
      const res = await fetch(csvPath);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      const rows = text.split("\n").filter(line => line.trim());

      const episodes = [];
      const rewards = [];

      rows.slice(1).forEach(line => {
        const [ep, rew] = line.split(",");
        if (ep && rew) {
          episodes.push(parseInt(ep));
          rewards.push(parseFloat(rew));
        }
      });

      // Calcola statistiche
      const avgReward = (rewards.reduce((a, b) => a + b, 0) / rewards.length).toFixed(2);
      const maxReward = Math.max(...rewards).toFixed(2);
      const minReward = Math.min(...rewards).toFixed(2);

      const chartContainer = document.getElementById("chartStats");
      chartContainer.innerHTML = `
        <div class="chart-stat">Max: <strong>${maxReward}</strong></div>
        <div class="chart-stat">Avg: <strong>${avgReward}</strong></div>
        <div class="chart-stat">Min: <strong>${minReward}</strong></div>
      `;

      if (chart) chart.destroy();

      chart = new Chart(ctx, {
        type: "line",
        data: {
          labels: episodes,
          datasets: [{
            label: `${algo.toUpperCase()} Rewards`,
            data: rewards,
            borderColor: "#00bfff",
            backgroundColor: "rgba(0, 191, 255, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: "#00bfff",
            pointBorderColor: "#fff",
            pointBorderWidth: 1,
            pointHoverRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              labels: {
                color: "#e0e0e0",
                font: { size: 12 },
                padding: 15
              }
            },
            tooltip: {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              titleColor: "#00bfff",
              bodyColor: "#e0e0e0",
              borderColor: "#00bfff",
              borderWidth: 1,
              padding: 10,
              displayColors: false
            }
          },
          scales: {
            x: {
              title: { display: true, text: "Episodes", color: "#e0e0e0" },
              ticks: { color: "#b0b0b0" },
              grid: { color: "rgba(255, 255, 255, 0.1)" }
            },
            y: {
              title: { display: true, text: "Reward", color: "#e0e0e0" },
              ticks: { color: "#b0b0b0" },
              grid: { color: "rgba(255, 255, 255, 0.1)" }
            }
          }
        }
      });
    } catch (error) {
      console.error("Errore nel rendering del grafico:", error);
    }
  }

  // === 4. Riproduzione automatica con controllo ===
  playAllBtn.addEventListener("click", async () => {
    if (isPlaying) return;

    const data = dataCache[currentAlgo];
    if (!data || data.length === 0) return;

    isPlaying = true;
    playAllBtn.disabled = true;
    playAllBtn.textContent = "⏸️ Riproduzione in corso...";

    try {
      for (let i = 0; i < data.length; i++) {
        updateVideo(data[i]);
        updateStats(data[i]);
        select.value = i;
        await new Promise(r => setTimeout(r, 3000)); // 3s per video
      }
    } finally {
      isPlaying = false;
      playAllBtn.disabled = false;
      playAllBtn.textContent = "▶️ Riproduci Evoluzione";
    }
  });

  // Avvia l'applicazione
  loadAlgorithms();
});