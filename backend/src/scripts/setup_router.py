from flask import Flask
from flask_cors import CORS  # type: ignore

from routes import hospital_routes, user_routes

app = Flask(__name__)
CORS(
    app,
    origins=["http://localhost:3000"],
    headers=["Content-Type"],
    methods=["GET", "POST"],
    supports_credentials=True,
)


app.register_blueprint(user_routes)
app.register_blueprint(hospital_routes)


def run_router() -> None:
    app.run()
