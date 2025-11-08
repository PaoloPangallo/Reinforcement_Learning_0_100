import os, json
from flask import Blueprint, render_template, jsonify, current_app

taxi_v3_bp = Blueprint(
    "taxi_v3",
    __name__,
    template_folder="templates",
    static_folder="static"
)

@taxi_v3_bp.route("/")
def taxi_v3_viewer():
    return render_template("taxi_v3_viewer.html", title="Taxi-v3 Viewer")

# === API endpoints ===
@taxi_v3_bp.route("/api/policy")
def api_policy():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(base_dir, "data", "taxi_v3_results.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify({"policy": data["policy"], "metadata": data["metadata"]})
    except Exception as e:
        current_app.logger.error(f"Errore policy: {e}")
        return jsonify({"error": str(e)}), 500

@taxi_v3_bp.route("/api/rewards")
def api_rewards():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(base_dir, "data", "taxi_v3_results.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify({"rewards": data["rewards"], "avg100": data.get("reward_avg_last100", None)})
    except Exception as e:
        current_app.logger.error(f"Errore rewards: {e}")
        return jsonify({"error": str(e)}), 500


@taxi_v3_bp.route("/api/trajectory")
def api_trajectory():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(base_dir, "data", "taxi_v3_results.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify({"trajectory": data.get("trajectory", [])})
    except Exception as e:
        current_app.logger.error(f"Errore trajectory: {e}")
        return jsonify({"error": str(e)}), 500

