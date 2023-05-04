from flask import Flask

from routes import user_routes, hospital_routes

app = Flask(__name__)

app.register_blueprint(user_routes)
app.register_blueprint(hospital_routes)


def run_router() -> None:
    app.run()
