"""
Flask Application Factory Initialization
"""

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from backend.app.core.config import Config
from backend.app.db.models import db

jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize Extensions
    db.init_app(app)
    jwt.init_app(app)

    # Ensure database tables and columns are up to date
    with app.app_context():
        db.create_all()
        try:
            from sqlalchemy import text
            with db.engine.connect() as conn:
                res = conn.execute(text("PRAGMA table_info(tasks)")).fetchall()
                col_names = [r[1] for r in res]
                if 'raid_item_id' not in col_names:
                    conn.execute(text("ALTER TABLE tasks ADD COLUMN raid_item_id INTEGER REFERENCES raid_items(id)"))
                    conn.commit()
                if 'comments_json' not in col_names:
                    conn.execute(text("ALTER TABLE tasks ADD COLUMN comments_json TEXT DEFAULT '[]'"))
                    conn.commit()
        except Exception as mig_err:
            print(f"[DB Auto-Migration Warning] {mig_err}")


    # Register API Blueprints

    from backend.app.api.auth import auth_bp
    from backend.app.api.projects import projects_bp
    from backend.app.api.raid import raid_bp
    from backend.app.api.emails import emails_bp
    from backend.app.api.admin import admin_bp
    from backend.app.api.agents import agents_bp
    from backend.app.api.chat_history import chat_history_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(raid_bp)
    app.register_blueprint(emails_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(agents_bp)
    app.register_blueprint(chat_history_bp)

    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'Enterprise PM AI Assistant Backend',
            'version': '1.0.0'
        }), 200

    # Start Background FAISS Vector Store Scheduler
    try:
        from backend.app.core.scheduler import start_background_scheduler
        start_background_scheduler()
    except Exception as e:
        print(f"[Scheduler Startup Warning] {e}")

    return app


