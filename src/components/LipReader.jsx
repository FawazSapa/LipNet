import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Mic,
  Volume2,
  MessageSquare,
  RefreshCcw,
  AlertCircle,
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
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState("intro");
  const [isRecording, setIsRecording] = useState(false);
  const [prediction, setPrediction] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
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
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  useEffect(() => {
    if (step === "recording") {
      startCamera();
    }
    return () => stopCamera();
  }, [step]);

  const captureAndSendFrame = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    let animationFrameId; // Add this to track the animation frame

    const sendFrame = async () => {
      if (!isRecording) {
        cancelAnimationFrame(animationFrameId); // Cancel the animation frame when not recording
        return;
      }

      ctx.drawImage(videoRef.current, 0, 0);
      const frame = canvas.toDataURL("image/jpeg");

      try {
        const response = await fetch("http://localhost:5000/predict", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ frame }),
        });

        const data = await response.json();
        setPrediction(data.prediction);
      } catch (err) {
        setError("Error communicating with backend server");
        setIsRecording(false);
        cancelAnimationFrame(animationFrameId); // Cancel animation frame on error
        return;
      }

      animationFrameId = requestAnimationFrame(sendFrame); // Store the ID
    };

    sendFrame();
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setPrediction("");
      setError("");
      captureAndSendFrame();
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
      className="max-w-4xl mx-auto"
    >
      <h1 className="text-3xl font-bold text-center mb-8">Lip Reader</h1>

      <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-xl">
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
            className={`absolute bottom-4 right-4 px-6 py-3 rounded-full flex items-center gap-2 ${
              isRecording
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
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <LoadingScreen onLoadingComplete={() => setIsLoading(false)} />
      ) : (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
          {step === "intro" ? <IntroScreen /> : <RecordingScreen />}
        </div>
      )}
    </AnimatePresence>
  );
};

export default LipReader;
