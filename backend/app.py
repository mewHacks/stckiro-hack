import os

from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
# ponytail: allow only the frontend origin; set FRONTEND_ORIGIN in prod
CORS(app, origins=os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000"))


@app.get("/api/health")
def health():
    return jsonify(status="ok")


if __name__ == "__main__":
    app.run(port=int(os.environ.get("PORT", 5000)), debug=True)
