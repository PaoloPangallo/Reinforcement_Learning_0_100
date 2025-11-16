# walker_routes.py

from flask import Blueprint, render_template, jsonify, send_from_directory
from pathlib import Path

walker_bp = Blueprint(
    "walker",
    __name__,
    template_folder="templates",
    static_folder="static",
    url_prefix="/walker"
)

ROOT = Path(__file__).resolve().parent.parent.parent
BASE_DIR = ROOT / "notebook" / "experiments" / "experiments" / "bipedal_td3"
ACTIVE_RUN = BASE_DIR / "run_active"
ACTIVE_METRICS = ACTIVE_RUN / "metrics"

ACTIVE_MODELS = ACTIVE_RUN / "models"
ACTIVE_VIDEOS = ACTIVE_RUN / "videos"


# ==========================================================
# 1. HOME VIEWER — mostra episodi della run attiva
# ==========================================================
def get_active_episodes():
    """Ritorna tutti gli episodi della run attiva."""
    episodes = []

    if not ACTIVE_METRICS.exists():
        return episodes

    for f in ACTIVE_METRICS.glob("trajectory_ep_*.json"):
        ep = int(f.stem.split("_")[-1])
        episodes.append(ep)

    return sorted(episodes)


@walker_bp.route("/")
def walker_home():
    """Mostra il viewer con la lista degli episodi della run attiva."""
    return render_template(
        "walker_viewers.html",
        active_run="run_active",
        episodes=get_active_episodes()
    )


# ==========================================================
# 2. API: lista degli episodi nella run attiva
# ==========================================================
@walker_bp.route("/api/episodes")
def api_episodes():
    return jsonify({
        "run": "run_active",
        "episodes": get_active_episodes()
    })


# ==========================================================
# 3. API: trajectory di un episodio specifico
# ==========================================================
@walker_bp.route("/api/trajectory/<int:ep>")
def api_trajectory(ep):
    filename = f"trajectory_ep_{ep:04d}.json"
    return send_from_directory(ACTIVE_METRICS, filename)


# ==========================================================
# (OPZIONALE) 4. API per archiviare e vedere run vecchie
# ==========================================================
@walker_bp.route("/api/archive")
def api_archive():
    """Ritorna tutte le run NON attive (archivio)."""
    archive = {}

    for run in BASE_DIR.iterdir():
        if run.is_dir() and run.name != "run_active":
            metrics = run / "metrics"
            episodes = []
            for f in metrics.glob("trajectory_ep_*.json"):
                ep = int(f.stem.split("_")[-1])
                episodes.append(ep)

            archive[run.name] = sorted(episodes)

    return jsonify(archive)
