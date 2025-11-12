from flask import Blueprint, render_template, jsonify, send_from_directory
import os, json

lunarlander_bp = Blueprint(
    "lunarlander", __name__,
    template_folder="data/templates",
    static_folder="data/static"
)
BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")
VIDEOS_DIR = os.path.join(BASE_DIR, "data", "static", "videos")

@lunarlander_bp.route("/lunarlander")
def lunarlander_viewer():
    """Pagina principale con l'interfaccia dei video"""
    return render_template("lunarlander_viewer.html")


@lunarlander_bp.route("/lunarlander/videos/<path:filename>")
def serve_video(filename):
    """Serve i file video mp4 salvati nei checkpoint"""
    return send_from_directory(VIDEOS_DIR, filename)


@lunarlander_bp.route("/lunarlander/progress/<algo>")
def get_progress(algo):
    """Ritorna il JSON con i progressi di training di un algoritmo"""
    json_path = os.path.join(VIDEOS_DIR, f"{algo}_learning_progress.json")
    if not os.path.exists(json_path):
        return jsonify({"error": "Progress file not found"}), 404
    with open(json_path, "r") as f:
        data = json.load(f)
    return jsonify(data)
