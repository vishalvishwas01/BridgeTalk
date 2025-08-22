// CameraButton.jsx
import { useState } from "react";
import { db } from "../lib/firebase";
import { arrayUnion, doc, updateDoc, getDoc } from "firebase/firestore";
import { useUserStore } from "../lib/userStore";
import { useChatStore } from "../lib/chatStore";
import upload from "../lib/upload";
import CameraModal from "./CameraModal";
import  Camera  from "../ui/SVG/Camera";
import VideoModal from "./VideoModal";
import VideoLogo from "../ui/SVG/VideoLogo";

const CameraButton = () => {
  const { currentUser } = useUserStore();
  const { chatId, user } = useChatStore();

  const [cameraOpen, setCameraOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const handleSendPhoto = async (file, type = "image") => {
  if (!file) return;
  try {
    const fileUrl = await upload(file);

    // Save message
    await updateDoc(doc(db, "chats", chatId), {
      messages: arrayUnion({
        senderId: currentUser.id,
        type,
        [type]: fileUrl, // img: or video:
        createdAt: new Date(),
      }),
    });

    // Update userChats
    const userIDs = [currentUser.id, user.id];
    for (const id of userIDs) {
      const userChatRef = doc(db, "userchats", id);
      const snap = await getDoc(userChatRef);
      if (snap.exists()) {
        const data = snap.data();
        const chatIndex = data.chats.findIndex((c) => c.chatId === chatId);
        if (chatIndex !== -1) {
          data.chats[chatIndex].lastMessage =
            type === "image" ? "📷 Photo" : "📹 Video";
          data.chats[chatIndex].isSeen = id === currentUser.id;
          data.chats[chatIndex].updatedAt = Date.now();
          data.chats[chatIndex].unreadCount =
            id === currentUser.id ? 0 : (data.chats[chatIndex].unreadCount || 0) + 1;
          await updateDoc(userChatRef, { chats: data.chats });
        }
      }
    }
  } catch (err) {
    console.error("Error sending file:", err);
  }
};


  // 📱 Mobile → Native camera input
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await handleSendPhoto(file);
    }
  };

  return (
    <>
     {isMobile ? (
  <>
    {/* Photo input */}
    <label className="cursor-pointer">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <Camera /> {/* photo icon */}
    </label>

    {/* Video input */}
    <label className="cursor-pointer flex sm:hidden">
      <input
        type="file"
        accept="video/*"
        capture="camcorder"
        onChange={async (e) => {
          const file = e.target.files[0];
          if (file) await handleSendPhoto(file, "video");
        }}
        className="hidden"
      />
      <span><VideoLogo/></span> {/* replace with video icon */}
    </label>
  </>
) : (
  <>
    {/* Desktop Camera */}
    <label onClick={() => setCameraOpen(true)} className="cursor-pointer">
      <Camera />
    </label>

    {/* Desktop Video */}
    <label onClick={() => setVideoOpen(true)} className="cursor-pointer ml-3 hidden">
      <span>🎥</span>
    </label>
  </>
)}

{!isMobile && cameraOpen && (
  <CameraModal
    onClose={() => setCameraOpen(false)}
    onCapture={async (photo) => {
      await handleSendPhoto(photo.file, "image");
      setCameraOpen(false);
    }}
  />
)}

{!isMobile && videoOpen && (
  <VideoModal
    onClose={() => setVideoOpen(false)}
    onCapture={async (video) => {
      await handleSendPhoto(video.file, "video");
      setVideoOpen(false);
    }}
  />
)}

    </>
  );
};

export default CameraButton;
