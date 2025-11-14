import os
from flask import Flask, render_template

from experiments.cliffwalking.routes import cliff_bp
from experiments.taxi_v3.routes import taxi_v3_bp
from experiments.lunarlander.routes import lunarlander_bp
from experiments.snake.snake_routes import snake_bp

# Percorso assoluto del progetto (sempre ReinforcementLearning/)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
TEMPLATES_DIR = os.path.join(FRONTEND_DIR, "templates")
STATIC_DIR = os.path.join(FRONTEND_DIR, "static")

print("🔍 Base dir:", BASE_DIR)
print("🔍 Templates dir:", TEMPLATES_DIR)
print("🔍 Static dir:", STATIC_DIR)
print("🔍 Exists base.html:", os.path.exists(os.path.join(TEMPLATES_DIR, "base.html")))

def create_app():
    app = Flask(
        __name__,
        template_folder=TEMPLATES_DIR,
        static_folder=STATIC_DIR
    )

    @app.route("/")
    def index():
        return render_template("index.html", title="RL Lab")

    app.register_blueprint(taxi_v3_bp, url_prefix="/taxi_v3")
    app.register_blueprint(cliff_bp, url_prefix="/cliff")
    app.register_blueprint(lunarlander_bp, url_prefix="/lunarlander")

    app.register_blueprint(snake_bp, url_prefix="/snake")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
