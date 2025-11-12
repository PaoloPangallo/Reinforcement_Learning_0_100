# experiments/cliffwalking/routes.py
from flask import Blueprint, render_template, jsonify
import os, json, numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

cliff_bp = Blueprint(
    "cliff",
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static")
)

# ------------------------------
# Pagina principale viewer
# ------------------------------
@cliff_bp.route("/")
def index():
    return render_template("cliff_viewer.html")


# ------------------------------
# Pagina confronto algoritmi
# ------------------------------
@cliff_bp.route("/comparison")
def comparison():
    return render_template("cliff_comparison.html")


# ------------------------------
# API: risultati comparativi globali
# ------------------------------
@cliff_bp.route("/api/results")
def get_results():
    data_path = os.path.join("experiments", "cliffwalking", "data", "comparison_summary.json")
    if not os.path.exists(data_path):
        return jsonify({"error": "comparison_summary.json non trovato"}), 404
    with open(data_path, "r") as f:
        data = json.load(f)

    # 🔧 Normalizza i nomi chiave
    snaps = data.get("available_snapshots", {})
    normalized = {}

    for key, value in snaps.items():
        if key == "expected":  # correzione specifica
            normalized["expected_sarsa"] = value
        elif key == "sarsa_lambda":  # già corretto
            normalized["sarsa_lambda"] = value
        else:
            normalized[key] = value

    # se manca SARSA(λ) → crea una copia provvisoria da SARSA
    if "sarsa_lambda" not in normalized and "sarsa" in normalized:
        normalized["sarsa_lambda"] = normalized["sarsa"]

    data["available_snapshots"] = normalized
    print("✅ Chiavi normalizzate:", list(normalized.keys()))
    return jsonify(data)


# ------------------------------
# API: policy (griglia frecce) per episodio e algoritmo
# ------------------------------

# ------------------------------
@cliff_bp.route("/api/trajectory/<algorithm>/<int:episode>")
def get_trajectory(algorithm, episode):
    """
    Restituisce la traiettoria salvata in traj/traj_<algorithm>_<episode>.json
    """
    data_path = os.path.join("experiments", "cliffwalking", "traj", f"traj_{algorithm}_{episode}.json")

    if not os.path.exists(data_path):
        print(f"❌ File non trovato: {data_path}")
        return jsonify({"error": f"Trajectory for {algorithm} {episode} not found"}), 404

    with open(data_path, "r") as f:
        data = json.load(f)
    print(f"✅ Traiettoria caricata: {data_path} ({len(data)} step)")
    return jsonify(data)
