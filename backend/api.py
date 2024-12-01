from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)

# Enable CORS for all routes
CORS(app)

# Base translation API endpoint
TRANSLATION_API = "http://localhost:11434/api/generate"


@app.route("/api/generate", methods=["POST"])
def translate():
    try:
        # Validate incoming request
        data = request.json
        if not data or "model" not in data or "prompt" not in data:
            return jsonify({"error": "Model and prompt are required"}), 400

        # Extract the model and prompt from the request
        model = data["model"]  # Translation model
        prompt = data["prompt"]  # English text

        # Forward the translation request to the translation API
        response = requests.post(
            TRANSLATION_API,
            json={"model": model, "prompt": prompt, "stream": True},
            stream=True,
        )

        # Stream the translation response back to the client
        def stream():
            for line in response.iter_lines():
                if line:
                    yield line.decode("utf-8") + "\n"

        return Response(stream(), content_type="application/json")

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
