import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Mic,
  Volume2,
  MessageSquare,
  RefreshCcw,
  Upload,
  Video,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Ripple Effect Component
const Ripple = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-blue-500/50"
          initial={{ width: 20, height: 20, opacity: 0 }}
          animate={{
            width: [20, 400],
            height: [20, 400],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
};

// Loading Screen Component
const LoadingScreen = ({ onLoadingComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onLoadingComplete, 3000);
    return () => clearTimeout(timer);
  }, [onLoadingComplete]);

  return (
    <motion.div
      className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.p
        className="z-10 mb-8 text-5xl font-medium tracking-tighter text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        Loading
      </motion.p>
      <Ripple />
    </motion.div>
  );
};

const LipReader = () => {
  // States
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState("intro");
  const [isRecording, setIsRecording] = useState(false);
  const [prediction, setPrediction] = useState("");
  const [error, setError] = useState("");
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [uploadPrediction, setUploadPrediction] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [translation, setTranslation] = useState("");



  // Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const uploadedVideoRef = useRef(null);
  const animationFrameId = useRef(null);

  const startCamera = async () => {
    try {
      // Clean up any existing streams first
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      setError(
        "Unable to access camera. Please ensure camera permissions are granted."
      );
      setIsRecording(false);
    }
  };

  const stopCamera = () => {
    // Cancel any ongoing animation frame
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    // Stop all tracks and clean up stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const captureAndSendFrame = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const sendFrame = async () => {
      if (!isRecording || !videoRef.current || !videoRef.current.srcObject) {
        return;
      }

      ctx.drawImage(videoRef.current, 0, 0);
      const frame = canvas.toDataURL("image/jpeg");

      try {
        const response = await fetch("http://localhost:5000/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ frame }),
        });

        const data = await response.json();
        setPrediction(data.prediction);

        // Update the displayed frame with the processed image
        if (data.processed_frame) {
          const processedImage = new Image();
          processedImage.src = data.processed_frame;
          ctx.drawImage(processedImage, 0, 0);
        }

        if (isRecording) {
          animationFrameId.current = requestAnimationFrame(sendFrame);
        }
      } catch (err) {
        setError("Error communicating with backend server");
        setIsRecording(false);
      }
    };

    sendFrame();
  };

  const toggleRecording = async () => {
    const newIsRecording = !isRecording;
    setIsRecording(newIsRecording);

    if (newIsRecording) {
      // Starting recording
      await startCamera();
      setPrediction("");
      setError("");
      captureAndSendFrame();
    } else {
      // Stopping recording
      stopCamera();
      setPrediction("Click 'Start Reading' to begin");
    }
  };

  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Revoke the previous URL if it exists
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      // Generate a new preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      setUploadedVideo(file);
      setUploadPrediction("");
      setError("");
      console.log("Uploaded file:", file); // Debug: Log the uploaded file
    }
  };
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);


  const processUploadedVideo = async () => {
    if (!uploadedVideo) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("video", uploadedVideo);

    try {
      const response = await fetch("http://localhost:5000/api/process_video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response:", data);
      if (data.error) {
        throw new Error(data.error);
      }

      setUploadPrediction(data.prediction);
      setTranslation(data.translation);
      setError(""); // Clear any previous errors
    } catch (err) {
      setError(`Error processing video: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  const IntroScreen = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-screen text-center space-y-12 bg-[#1a1f2e]"
    >
      <div className="space-y-6">
        <h1 className="text-6xl font-bold text-white">Lip Reader</h1>
        <p className="text-xl text-gray-300">
          Transform silent speech into text using advanced AI technology
        </p>
      </div>

      <div className="flex justify-center gap-20">
        <motion.div
          className="text-center"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <Mic className="w-16 h-16 mb-4 mx-auto text-blue-400" />
          <p className="text-white">Silent Speech Recognition</p>
        </motion.div>
        <motion.div
          className="text-center"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <MessageSquare className="w-16 h-16 mb-4 mx-auto text-blue-400" />
          <p className="text-white">Real-time Transcription</p>
        </motion.div>
        <motion.div
          className="text-center"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <Volume2 className="w-16 h-16 mb-4 mx-auto text-blue-400" />
          <p className="text-white">No Audio Needed</p>
        </motion.div>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setStep("recording")}
        className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full text-xl font-semibold"
      >
        Get Started
      </motion.button>
    </motion.div>
  );

  const RecordingScreen = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto"
    >
      <h1 className="text-3xl font-bold text-center mb-8">Lip Reader</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Camera Section */}
        <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4">Live Camera</h2>
          <div className="relative aspect-video mb-6">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full rounded-lg bg-black"
            />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleRecording}
              className={`absolute bottom-4 right-4 px-6 py-3 rounded-full flex items-center gap-2 ${isRecording
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-500 hover:bg-blue-600"
                }`}
            >
              {isRecording ? (
                <>
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                  Stop
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  Start Reading
                </>
              )}
            </motion.button>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="bg-[#12151f] p-6 rounded-lg border border-gray-800">
            <h2 className="text-lg font-semibold mb-2">Predicted Speech:</h2>
            <p className="text-xl">
              {prediction || "Start recording to begin lip reading..."}
            </p>
          </div>
        </div>

        {/* Video Upload Section */}
        <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4">Upload Video</h2>

          {/* Video Preview */}
          {uploadedVideo ? (
            <div className="relative aspect-video mb-6">
              <video
                ref={uploadedVideoRef}
                controls
                className="w-full h-full rounded-lg bg-black"
                src={previewUrl}
                onLoadedData={() => {
                  console.log("Video preview loaded successfully");
                }}
                onError={(e) => {
                  console.error("Error loading video preview:", e);
                }}
              />
              <button
                onClick={() => {
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl("");
                  }
                  setUploadedVideo(null);
                }}
                className="absolute top-2 right-2 p-2 bg-red-500 rounded-full hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="aspect-video mb-6">
              <div className="w-full h-full border-2 border-dashed border-gray-600 rounded-lg p-8 flex flex-col items-center justify-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  id="videoUpload"
                  onChange={handleVideoUpload}
                />
                <label
                  htmlFor="videoUpload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Video className="w-12 h-12 text-gray-400 mb-4" />
                  <span className="text-gray-300 text-center">
                    Drop your video here or click to upload
                  </span>
                  <span className="text-sm text-gray-500 mt-2">
                    Supports: MP4, MOV, AVI
                  </span>
                </label>
              </div>
            </div>
          )}
          {/* Video Upload Controls */}
          {uploadedVideo && (
            <div className="flex justify-center mb-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={processUploadedVideo}
                disabled={isProcessing}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCcw className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Process Video
                  </>
                )}
              </motion.button>
            </div>
          )}

          {/* Video Results */}
          <div className="bg-[#12151f] p-6 rounded-lg border border-gray-800">
            <h2 className="text-lg font-semibold mb-2">Video Results:</h2>
            {uploadPrediction ? (
              <div className="space-y-4">
                <div className="p-4 bg-[#1a1f2e] border border-gray-700 rounded-md">
                  <h3 className="font-semibold text-blue-400">English Prediction:</h3>
                  <p className="mt-1 text-white">{uploadPrediction}</p>
                </div>

                <div className="p-4 bg-[#1a1f2e] border border-gray-700 rounded-md">
                  <h3 className="font-semibold text-blue-400">French Translation:</h3>
                  <p className="mt-1 text-white">{translation}</p>
                </div>
              </div>
            ) : (
              <p className="text-xl">Upload and process a video to begin...</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <LoadingScreen onLoadingComplete={() => setIsLoading(false)} />
      ) : (
        <div className="min-h-screen bg-[#1a1f2e] text-white p-8">
          {step === "intro" ? <IntroScreen /> : <RecordingScreen />}
        </div>
      )}
    </AnimatePresence>
  );
};

export default LipReader;
