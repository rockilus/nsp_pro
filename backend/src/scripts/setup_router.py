from datetime import timedelta

from flask import Flask
from flask_cors import CORS  # type: ignore
from flask_jwt_extended import JWTManager
from routes import (
    coverage_routes,
    constraint_param_routes,
    constraint_routes,
    shift_param_routes,
    shift_routes,
    solver_routes,
    worker_dimension_routes,
    worker_routes,
)

app = Flask(__name__)
CORS(
    app,
    origins=["http://localhost:3000"],
    headers=["Content-Type"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    supports_credentials=True,
)
# Change this to a secure secret key in production
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
# Should be true for production
app.config["JWT_COOKIE_SECURE"] = False
app.config["JWT_SECRET_KEY"] = "your-secret-key"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)

app.register_blueprint(shift_routes)
app.register_blueprint(shift_param_routes)
app.register_blueprint(worker_routes)
app.register_blueprint(worker_dimension_routes)
app.register_blueprint(constraint_param_routes)
app.register_blueprint(constraint_routes)
app.register_blueprint(solver_routes)
app.register_blueprint(coverage_routes)

jwt = JWTManager(app)


def run_router() -> None:
    app.run()


# from flask import Flask, jsonify, request
# from flask_jwt_extended import (
#     JWTManager,
#     jwt_required,
#     create_access_token,
#     get_jwt_identity,
#     get_raw_jwt,
# )
# from flask_bcrypt import Bcrypt
# from mongoengine import connect, Document, StringField, BooleanField

# app = Flask(__name__)
# app.config[
#     "JWT_SECRET_KEY"
# ] = "your-secret-key"  # Change this to a secure secret key in production
# app.config["MONGODB_SETTINGS"] = {
#     "db": "your-database-name",
#     "host": "your-mongodb-connection-url",
# }

# bcrypt = Bcrypt(app)
# jwt = JWTManager(app)
# connect(
#     db=app.config["MONGODB_SETTINGS"]["db"],
#     host=app.config["MONGODB_SETTINGS"]["host"],
# )
