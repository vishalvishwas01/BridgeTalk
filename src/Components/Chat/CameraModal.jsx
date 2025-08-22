import { useEffect, useRef, useState } from "react";
import { db } from "../lib/firebase";
import { arrayUnion, doc, serverTimestamp, updateDoc, getDoc } from "firebase/firestore";
import { useUserStore } from "../lib/userStore";
import { useChatStore } from "../lib/chatStore";
import upload from "../lib/upload";

const CameraModal = ({ onClose, onCapture }) => {
  const videoRef = useRef(null);
  const { currentUser } = useUserStore();
  const { chatId, user } = useChatStore();
  const [stream, setStream] = useState(null);
  const [captured, setCaptured] = useState(null); // preview image
  const [loading, setLoading] = useState(false); // processing state

  // Start camera on mount
  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  // Stop all video tracks
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
   if (videoRef.current) {
    videoRef.current.srcObject = null;
  }
};

  // Capture snapshot for preview
  const handleCapture = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/png");
    setCaptured(dataUrl);

    stopCamera(); // stop camera while previewing
  };

  // Retake → restart camera
  const handleRetake = () => {
    setCaptured(null);
    startCamera();
  };

  // Send photo


const handleSend = async () => {
  if (!captured) return;
  setLoading(true);

  try {
    // convert dataURL -> File
    const blob = await fetch(captured).then((res) => res.blob());
    const file = new File([blob], `photo-${Date.now()}.png`, { type: "image/png" });

    // upload to storage
    const imgUrl = await upload(file);

    // message doc
    await updateDoc(doc(db, "chats", chatId), {
      messages: arrayUnion({
        senderId: currentUser.id,
        type: "image",
        img: imgUrl,
        createdAt: new Date(),
      }),
    });

    // update userChats lastMessage + unreadCount
    const userIDs = [currentUser.id, user.id];
    for (const id of userIDs) {
      const userChatRef = doc(db, "userchats", id);
      const snap = await getDoc(userChatRef);

      if (snap.exists()) {
        const data = snap.data();
        const chatIndex = data.chats.findIndex((c) => c.chatId === chatId);

        if (chatIndex !== -1) {
          data.chats[chatIndex].lastMessage = "📷 Photo";
          data.chats[chatIndex].isSeen = id === currentUser.id;
          data.chats[chatIndex].updatedAt = Date.now();

          if (id === currentUser.id) {
            data.chats[chatIndex].unreadCount = 0;
          } else {
            data.chats[chatIndex].unreadCount =
              (data.chats[chatIndex].unreadCount || 0) + 1;
          }

          await updateDoc(userChatRef, { chats: data.chats });
        }
      }
    }

    // cleanup + close modal
    onClose();
  } catch (err) {
    console.error("Error sending photo:", err);
  } finally {
    setLoading(false);
    stopCamera();
  }
};



  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center z-50">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="text-white text-lg font-semibold animate-pulse">
            Processing photo...
          </div>
        </div>
      )}

      {!captured ? (
        // Live camera view
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="rounded-lg max-w-full max-h-[70vh] border-2 border-white"
          />
          <div className="flex gap-4 mt-4">
            <button
              onClick={handleCapture}
              className="px-4 py-2 bg-green-600 cursor-pointer text-white rounded-lg hover:bg-green-700"
            >
              Capture
            </button>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2 bg-gray-600 cursor-pointer text-white rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        // Preview captured image
        <>
          <img
            src={captured}
            alt="Captured"
            className="rounded-lg max-w-full max-h-[70vh] border-2 border-white"
          />
          <div className="flex gap-4 mt-4">
            <button
              onClick={handleSend}
              className="px-4 py-2 bg-blue-600 cursor-pointer text-white rounded-lg hover:bg-blue-700"
            >
              Send
            </button>
            <button
              onClick={handleRetake}
              className="px-4 py-2 bg-yellow-500 cursor-pointer text-white rounded-lg hover:bg-yellow-600"
            >
              Retake
            </button>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2 bg-red-600 text-white cursor-pointer rounded-lg hover:bg-red-700"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CameraModal;
