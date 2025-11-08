async function loadExperiments() {
  const res = await fetch("/api/experiments");
  const exps = await res.json();
  const select = document.getElementById("experiments-select");
  exps.forEach(e => {
    const opt = document.createElement("option");
    opt.value = e;
    opt.textContent = e.charAt(0).toUpperCase() + e.slice(1);
    select.appendChild(opt);
  });
}

document.getElementById("open-viewer").addEventListener("click", () => {
  const exp = document.getElementById("experiments-select").value;
  if (exp) window.location.href = `/viewer/${exp}`;
});

loadExperiments();
