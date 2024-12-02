from flask import Flask, request, jsonify
import os
from werkzeug.utils import secure_filename
from flask_cors import CORS  # Add this import
from lip_predictor import predict_from_video

# Configuration
UPLOAD_FOLDER = "./uploads"
MODEL_PATH = "./best_model.pth"

# Initialize Flask app
# Configuration
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max file size
app.config["UPLOAD_FOLDER"] = "./uploads"

# Enable CORS
CORS(app)

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route("/api/process_video", methods=["POST"])
def process_video_endpoint():
    print("Received video processing request")

    if "video" not in request.files:
        print("No video file in request")
        return jsonify({"error": "No video file provided"}), 400

    video = request.files["video"]
    if video.filename == "":
        print("Empty filename provided")
        return jsonify({"error": "Empty filename provided"}), 400

    try:
        # Save the uploaded file
        filename = secure_filename(video.filename)
        video_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        print(f"Attempting to save video at: {video_path}")

        # Ensure the upload directory exists
        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

        # Save the file
        video.save(video_path)
        print(f"Video successfully saved at: {video_path}")

        # Process the video and predict
        prediction = predict_from_video(video_path, MODEL_PATH)
        print(f"Prediction generated: {prediction}")

        # Remove the video after processing
        os.remove(video_path)
        print(f"Video file removed after processing")

        return jsonify({"prediction": prediction, "filePath": filename})
    except Exception as e:
        print(f"Error processing video: {str(e)}")
        # If there was an error, try to clean up the file if it exists
        if os.path.exists(video_path):
            os.remove(video_path)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
