from flask import Blueprint, render_template, jsonify, send_from_directory
import os, json

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")
RESULTS_DIR = os.path.join(DATA_DIR, "static", "results")
VIDEOS_DIR = os.path.join(DATA_DIR, "static", "videos")

lunarlander_bp = Blueprint(
    "lunarlander",
    __name__,
    url_prefix="/lunarlander",   # <-- prefisso gestito da Flask
    template_folder=os.path.join(DATA_DIR, "templates"),
    static_folder=os.path.join(DATA_DIR, "static"),
    static_url_path="/lunarlander/static"
)

@lunarlander_bp.route("/")
def lunarlander_viewer():
    return render_template("lunarlander_viewer.html")

@lunarlander_bp.route("/videos/<path:filename>")
def serve_video(filename):
    return send_from_directory(VIDEOS_DIR, filename)

@lunarlander_bp.route("/progress/<algo>")
def get_progress(algo):
    json_path = os.path.join(RESULTS_DIR, f"{algo}_progress.json")
    if not os.path.exists(json_path):
        return jsonify({"error": f"Progress file for {algo} not found"}), 404
    with open(json_path, "r") as f:
        data = json.load(f)
    return jsonify(data)

@lunarlander_bp.route("/rewards/<algo>")
def get_rewards(algo):
    csv_path = os.path.join(RESULTS_DIR, f"rewards_{algo}.csv")
    if not os.path.exists(csv_path):
        return jsonify({"error": f"Rewards file for {algo} not found"}), 404
    return send_from_directory(RESULTS_DIR, f"rewards_{algo}.csv")

@lunarlander_bp.route("/algorithms")
def list_algorithms():
    algos = []
    for fname in os.listdir(RESULTS_DIR):
        if fname.endswith("_progress.json"):
            algos.append(fname.replace("_progress.json", ""))
    return jsonify(sorted(algos))
