// cliff_comparison.js
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Costruisci il path corretto in base all'URL corrente
    const basePath = window.location.pathname.startsWith("/cliff")
      ? "/cliff"
      : "";
    const res = await fetch(`${basePath}/api/results`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const labels = data.algorithms;
    const rewards = data.mean_last100;
    const times = data.elapsed_sec;

    const rewardCtx = document.getElementById("rewardChart");
    const timeCtx = document.getElementById("timeChart");

    if (rewardCtx) {
      new Chart(rewardCtx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Reward ultimi 100 episodi",
              data: rewards,
              backgroundColor: "steelblue"
            }
          ]
        },
        options: { responsive: true }
      });
    }

    if (timeCtx) {
      new Chart(timeCtx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Tempo di training (s)",
              data: times,
              backgroundColor: "gray"
            }
          ]
        },
        options: { responsive: true }
      });
    }
  } catch (err) {
    console.error("❌ Errore nel caricamento dei risultati:", err);
  }
});
