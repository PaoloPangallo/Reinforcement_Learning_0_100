from flask import Blueprint, render_template, jsonify
from pathlib import Path
import json

snake_bp = Blueprint(
    "snake",
    __name__,
    template_folder="templates",
    static_folder="static"
)

# Path dei file delle traiettorie
BASE_TRAJ_DIR = Path("notebook/artifacts/trajectories/ppo_snake_v1")

def load_episode_list():
    if not BASE_TRAJ_DIR.exists():
        return []

    files = sorted(BASE_TRAJ_DIR.glob("*.json"))

    episodes = []
    for f in files:
        name = f.stem
        # naming es: apples_005_ep_01.json
        parts = name.split("_")
        apples = int(parts[1])
        ep_index = int(parts[3])
        episodes.append({
            "file": f.name,
            "apples": apples,
            "episode": ep_index,
        })
    return episodes


@snake_bp.route("/")
def index():
    episodes = load_episode_list()
    return render_template("snake_viewer.html", episodes=episodes)


@snake_bp.route("/episode/<filename>")
def get_episode(filename):
    fpath = BASE_TRAJ_DIR / filename
    if not fpath.exists():
        return jsonify({"error": "file not found"}), 404
    with open(fpath) as f:
        return jsonify(json.load(f))
