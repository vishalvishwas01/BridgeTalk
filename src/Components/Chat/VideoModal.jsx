import { useEffect, useRef, useState } from "react";

const VideoModal = ({ onClose, onCapture }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [recording, setRecording] = useState(false);
  const [time, setTime] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      clearInterval(timerRef.current);
    };
  }, []);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    const recorder = new MediaRecorder(streamRef.current);
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    };

    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);

    // start timer
    setTime(0);
    timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
    setRecording(false);
    clearInterval(timerRef.current);
  };

  const handleSend = async () => {
    const blob = await fetch(previewUrl).then((r) => r.blob());
    const file = new File([blob], `video-${Date.now()}.webm`, { type: "video/webm" });
    await onCapture({ file, url: previewUrl });
  };

  const handleRetake = () => {
    setPreviewUrl(null);
    startCamera();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50">
      {!previewUrl ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="rounded-lg max-w-full max-h-[70vh]"
          />
          {recording && (
            <div className="text-red-500 font-semibold mt-2">
              Recording... {time}s
            </div>
          )}
          <div className="flex gap-4 mt-4">
            {!recording ? (
              <button
                onClick={startRecording}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Start
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg"
              >
                Stop
              </button>
            )}
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <video
            src={previewUrl}
            controls
            className="rounded-lg max-w-full max-h-[70vh]"
          />
          <div className="flex gap-4 mt-4">
            <button
              onClick={handleSend}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Send
            </button>
            <button
              onClick={handleRetake}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg"
            >
              Retake
            </button>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default VideoModal;
