import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore'
import { useUserStore } from '../lib/userStore'
import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '../lib/chatStore'
import EmojiPicker, { Emoji } from 'emoji-picker-react'
import doodlepr from '/doodlepr.png?url'
import { db } from '../lib/firebase'
import upload from '../lib/upload'
import Gallery from '../ui/SVG/Gallery'
import Mic from '../ui/SVG/Mic'
import { FaArrowLeft } from "react-icons/fa6";
import Arrow from '../ui/SVG/Arrow'
import Emojis from '../ui/SVG/Emojis'
import { Download } from '../ui/SVG/Download'
import Pause from '../ui/SVG/Pause'
import { ArrowDown } from "lucide-react";
import { FaFileAlt } from "react-icons/fa";
import Document from '../ui/SVG/Document'
import {LiveAudioVisualizer } from 'react-audio-visualize';
import PlayIcon from '../ui/SVG/PlayIcon'
import CloseIcon from '../ui/SVG/CloseIcon'
import CircleIcon from '../ui/SVG/CircleIcon'
import {MoonLoader, SyncLoader} from "react-spinners"
import {DoubleTickWhite, DoubleTickBlue} from '../ui/SVG/DoubleTick'
import TranslatedMessage from './TranslatedMessage'
import CameraButton from './CameraButton'




const Chat = ({ setActiveView, className = "", setActiveDetail }) => {
  const sendSound = useRef(new Audio("/send.mp3"));
  const {chatId, user, isCurrentUserBlocked, isReceiverBlocked} = useChatStore();
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);
  const [loadedImages, setLoadedImages] = useState([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [profile, setProfile] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false);
  const [transformOrigin, setTransformOrigin] = useState("center center");
  const [micLoad, setMicLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [open, setOpen]=useState(false);
  const {currentUser} = useUserStore();
  const [chat, setChat]=useState({})
  const [text, setText]=useState("")
  const [img, setImg]=useState({
    file:null,
    url:"",
  })
  const [video, setVideo] = useState({
    file: null,
    url: "",
    thumbnail: "",
  });
  const emojiRef = useRef(null);
  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  
useEffect(() => {
    const unlockSound = () => {
      sendSound.current.play().then(() => {
        sendSound.current.pause()
        sendSound.current.currentTime = 0
      }).catch(() => {})
      document.removeEventListener("click", unlockSound)
    }
    document.addEventListener("click", unlockSound)
    return () => document.removeEventListener("click", unlockSound)
  }, [])

  const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(src);
    img.onerror = reject;
  });
  };

  useEffect(() => {
    if (!chat?.messages) return;
    const loadImages = async () => {
      const imageUrls = chat.messages.filter((m) => m.img).map((m) => m.img);
      try {
        await Promise.all(
          imageUrls.map((src) =>
            preloadImage(src).then(() => {
              setLoadedImages((prev) => [...new Set([...prev, src])]);
            })
          )
        );
        // Scroll after all images are ready
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      } catch (err) {
        console.error("Image preload failed", err);
      }
    };
    loadImages();
  }, [chat?.messages]);

useEffect(() => {
  if (!chatId || !chat?.messages) return;

  const unseenMessages = chat.messages.filter(
    (msg) => msg.senderId !== currentUser.id && !msg.seen?.includes(currentUser.id)
  );

  if (unseenMessages.length === 0) return; // nothing to update

  const chatRef = doc(db, "chats", chatId);

  const updatedMessages = chat.messages.map((msg) =>
    unseenMessages.some((um) => um.id === msg.id)
      ? { ...msg, seen: [...(msg.seen || []), currentUser.id] }
      : msg
  );

  updateDoc(chatRef, { messages: updatedMessages });
}, [chatId, chat?.messages, currentUser.id]);



  const endRef = useRef(null);
useEffect(() => {
  if (!chat?.messages) return;

  let attempts = 0;
  const scroll = () => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    //   attempts++;
    //   if (attempts < 20) {
    //     setTimeout(scroll, 200);
    //   }
    }
  };

  scroll();
}, [chat?.messages]);

  useEffect(()=>{
    const unSub = onSnapshot(doc(db,"chats", chatId), (res)=>{
      setChat(res.data())
    })

    return ()=>{
      unSub();
    };
  },[chatId])
  console.log("hello"+chat)

  const handleEmoji = (e)=>{
    setText(prev=>prev + e.emoji);
    setOpen(false)
  };

const handleFile = async (e) => {
  if (!e.target.files[0]) return;
  const file = e.target.files[0];
  const fileType = file.type;

  setUploading(true);
  setProgress(0);

  try {
    // IMAGE CASE
    if (fileType.startsWith("image/")) {
      setImg({ file, url: URL.createObjectURL(file) });

      const imgUrl = await upload(file, (p) => setProgress(p));

      await updateDoc(doc(db, "chats", chatId), {
        messages: arrayUnion({
          senderId: currentUser.id,
          text: "",
          createdAt: new Date(),
          img: imgUrl,
        }),
      });

      // update userChats lastMessage
      const userIDs = [currentUser.id, user.id];
      userIDs.forEach(async (id) => {
        const userChatsRef = doc(db, "userchats", id);
        const snap = await getDoc(userChatsRef);

        if (snap.exists()) {
          const data = snap.data();
          const chatIndex = data.chats.findIndex((c) => c.chatId === chatId);

          data.chats[chatIndex].lastMessage = " Image";
          data.chats[chatIndex].isSeen = id === currentUser.id;
          data.chats[chatIndex].updatedAt = Date.now();
          if (id === currentUser.id) {
            data.chats[chatIndex].unreadCount = 0;
          } else {
            data.chats[chatIndex].unreadCount =
              (data.chats[chatIndex].unreadCount || 0) + 1;
          }

          await updateDoc(userChatsRef, { chats: data.chats });
        }
      });

      setImg({ file: null, url: "" });
    }

    // VIDEO CASE
    else if (fileType.startsWith("video/")) {
      const videoUrl = URL.createObjectURL(file);
      setVideo({ file, url: videoUrl });

      const videoUrlFirebase = await upload(file, (p) => setProgress(p));

      await updateDoc(doc(db, "chats", chatId), {
        messages: arrayUnion({
          senderId: currentUser.id,
          text: "",
          createdAt: new Date(),
          video: videoUrlFirebase,
        }),
      });

      // update userChats lastMessage
      const userIDs = [currentUser.id, user.id];
      userIDs.forEach(async (id) => {
        const userChatsRef = doc(db, "userchats", id);
        const snap = await getDoc(userChatsRef);

        if (snap.exists()) {
          const data = snap.data();
          const chatIndex = data.chats.findIndex((c) => c.chatId === chatId);

          data.chats[chatIndex].lastMessage = "Video";
          data.chats[chatIndex].isSeen = id === currentUser.id;
          data.chats[chatIndex].updatedAt = Date.now();
          if (id === currentUser.id) {
            data.chats[chatIndex].unreadCount = 0;
          } else {
            data.chats[chatIndex].unreadCount =
              (data.chats[chatIndex].unreadCount || 0) + 1;
          }

          await updateDoc(userChatsRef, { chats: data.chats });
        }
      });

      setVideo({ file: null, url: "" });
    }

    setUploading(false);
    setProgress(0);
     const sound = sendSound.current
      sound.currentTime = 0
      sound.play().catch(() => {
        console.log("Send sound blocked until user interacts")
      })
  } catch (err) {
    console.error("File upload failed", err);
    setUploading(false);
    setProgress(0);
  }
};



const handleDoc = async (e) => {
  if (!e.target.files[0]) return;
  const file = e.target.files[0];
  const fileType = file.type;

  // allow only PDF, DOC, DOCX
  if (
    fileType !== "application/pdf" &&
    fileType !== "application/msword" &&
    fileType !==
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    alert("Only PDF and DOC/DOCX files are allowed!");
    return;
  }

  setUploading(true);
  setProgress(0);

  try {
    const docUrl = await upload(file, (p) => setProgress(p));

    const docType = fileType.includes("pdf") ? "pdf" : "doc";

    await updateDoc(doc(db, "chats", chatId), {
      messages: arrayUnion({
        senderId: currentUser.id,
        text: "",
        createdAt: new Date(),
        doc: docUrl,
        docName: file.name,
        docSize: (file.size / 1024 / 1024).toFixed(2) + " MB",
        docType,
      }),
    });

    // update userChats lastMessage
    const userIDs = [currentUser.id, user.id];
    userIDs.forEach(async (id) => {
      const userChatsRef = doc(db, "userchats", id);
      const snap = await getDoc(userChatsRef);

      if (snap.exists()) {
        const data = snap.data();
        const chatIndex = data.chats.findIndex((c) => c.chatId === chatId);

        data.chats[chatIndex].lastMessage =
          docType === "pdf" ? "📄 PDF" : "📄 Document";
        data.chats[chatIndex].isSeen = id === currentUser.id;
        data.chats[chatIndex].updatedAt = Date.now();
        if (id === currentUser.id) {
          data.chats[chatIndex].unreadCount = 0;
        } else {
          data.chats[chatIndex].unreadCount =
            (data.chats[chatIndex].unreadCount || 0) + 1;
        }

        await updateDoc(userChatsRef, { chats: data.chats });
      }
    });

    setUploading(false);
    setProgress(0);
     const sound = sendSound.current
      sound.currentTime = 0
      sound.play().catch(() => {
        console.log("Send sound blocked until user interacts")
      })
  } catch (err) {
    console.error("Doc upload failed", err);
    setUploading(false);
    setProgress(0);
  }
};


 const handleSend = async () => {
  if (text.trim() === "" && !img.file && !video.file) return;

  let imgUrl = null;
  let videoUrl = null;
  let lastMessage = "";

  try {
    if (img.file) {
      imgUrl = await upload(img.file);
      lastMessage = "Image";
    } else if (video.file) {
      videoUrl = await upload(video.file);
      lastMessage = "Video";
    } else if (text.trim() !== "") {
      lastMessage = text;
    }

    await updateDoc(doc(db, "chats", chatId), {
      messages: arrayUnion({
        senderId: currentUser.id,
        text,
        createdAt: new Date(),
        delivered: true,
        seen: [],
        ...(imgUrl && { img: imgUrl }),
        ...(videoUrl && { video: videoUrl }),
      }),
    });
    

    const userIDs = [currentUser.id, user.id];
    userIDs.forEach(async (id) => {
      const userChatsRef = doc(db, "userchats", id);
      const snap = await getDoc(userChatsRef);

      if (snap.exists()) {
        const data = snap.data();
        const chatIndex = data.chats.findIndex((c) => c.chatId === chatId);

        if (chatIndex !== -1) {
          data.chats[chatIndex].lastMessage = lastMessage;
          data.chats[chatIndex].isSeen = id === currentUser.id;
          data.chats[chatIndex].updatedAt = Date.now();

          if (id === currentUser.id) {
            data.chats[chatIndex].unreadCount = 0; //  sender resets
          } else {
            data.chats[chatIndex].unreadCount =
              (data.chats[chatIndex].unreadCount || 0) + 1;
          }

          await updateDoc(userChatsRef, { chats: data.chats });
        }
      }
    });
  } catch (err) {
    console.log(err);
  }

  setImg({ file: null, url: "" });
  setVideo({ file: null, url: "" });
  setText("");
   const sound = sendSound.current
      sound.currentTime = 0
      sound.play().catch(() => {
        console.log("Send sound blocked until user interacts")
      })
};



  useEffect(() => {
  const handleKeyDown = (e) => {
     if (e.key === "Enter" && !e.shiftKey && text.trim().length > 0) {
      e.preventDefault();
      handleSend();
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [text, img]);

// Start timer when recording starts
useEffect(() => {
  if (isRecording && !isPaused) {
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  } else {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

  return () => clearInterval(timerRef.current);
}, [isRecording, isPaused]);

// Reset timer on cancel/stop
const resetTimer = () => setRecordingTime(0);

const formatTime = (secs) => {
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
};



const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Pick a mime that Chrome likes; fallback if needed
    let mimeType = "audio/webm";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "audio/webm;codecs=opus";
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = ""; // let browser decide
    }

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    // optional: simple debug
    recorder.onerror = (e) => console.error("Recorder error:", e.error);

    // Collect data every 250ms to avoid big final chunk timing issues
    recorder.start(250);

    setIsRecording(true);
    setIsPaused(false);
  } catch (err) {
    console.error("Mic permission / getUserMedia failed:", err);
  }
};

const pauseRecording = () => {
  const rec = mediaRecorderRef.current;
  if (rec && rec.state === "recording") {
    rec.pause();
    setIsPaused(true);
  }
};

const resumeRecording = () => {
  const rec = mediaRecorderRef.current;
  if (rec && rec.state === "paused") {
    rec.resume();
    setIsPaused(false);
  }
};

const cancelRecording = () => {
  const rec = mediaRecorderRef.current;
  resetTimer()
  if (rec) {
    // Stop cleanly
    try { rec.ondataavailable = null; } catch {}
    rec.stream.getTracks().forEach((t) => t.stop());
    if (rec.state !== "inactive") rec.stop();
  }

  mediaRecorderRef.current = null;
  chunksRef.current = [];
  setIsRecording(false);
  setIsPaused(false);
};

const stopAndSend = () => {
  const rec = mediaRecorderRef.current;
  if (!rec) return;
  

  // Attach a one-time stop handler BEFORE stopping
  const handleStop = async () => {
    
    resetTimer()
    try {
      // Build blob from ref (not state!)
      const parts = chunksRef.current;
      if (!parts || parts.length === 0) {
        console.error("No audio chunks recorded");
        cleanup();
        return;
      }
      setMicLoading(true)
      setIsPaused(true);

      const blob = new Blob(parts, { type: "audio/webm" });
      // Optional local preview:
      // const localUrl = URL.createObjectURL(blob);
      // setAudioUrl(localUrl);

      const file = new File([blob], `voice-${Date.now()}.webm`, {
        type: "audio/webm",
      });

      // Upload using your existing helper
      const audioUrlFirebase = await upload(file, (p) => setProgress(p));

      await updateDoc(doc(db, "chats", chatId), {
        messages: arrayUnion({
          senderId: currentUser.id,
          text: "",
          createdAt: new Date(),
          audio: audioUrlFirebase,
        }),
      });
      setMicLoading(false)
      resetTimer()
       const sound = sendSound.current
      sound.currentTime = 0
      sound.play().catch(() => {
        console.log("Send sound blocked until user interacts")
      })
      

      const userIDs = [currentUser.id, user.id];
      userIDs.forEach(async (id) => {
        const userChatsRef = doc(db, "userchats", id);
        const snap = await getDoc(userChatsRef);
        if (snap.exists()) {
          const data = snap.data();
          const chatIndex = data.chats.findIndex((c) => c.chatId === chatId);
          data.chats[chatIndex].lastMessage = "Voice message";
          data.chats[chatIndex].isSeen = id === currentUser.id;
          data.chats[chatIndex].updatedAt = Date.now();
          if (id === currentUser.id) {
            data.chats[chatIndex].unreadCount = 0;
          } else {
            data.chats[chatIndex].unreadCount =
              (data.chats[chatIndex].unreadCount || 0) + 1;
}
          await updateDoc(userChatsRef, { chats: data.chats });
        }
      });
    } catch (err) {
      console.error("Upload/send failed:", err);
    } finally {
      cleanup();
    }
  };

  const cleanup = () => {
    try {
      rec.stream.getTracks().forEach((t) => t.stop());
    } catch {}
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setIsPaused(false);
  };

  rec.addEventListener("stop", handleStop, { once: true });
  try {
    // Flush the final chunk before stopping
    rec.requestData();
  } catch {}
  rec.stop();
};


const handleInputChange = async (e) => {
  setText(e.target.value);

  const chatRef = doc(db, "chats", chatId);

  await updateDoc(chatRef, {
    [`typing.${currentUser.id}`]: e.target.value.length > 0
  });
};

const handleBlur = async () => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    [`typing.${currentUser.id}`]: false
  });
};




const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  

  return (
    <>
    {profile && <div className="border-2 w-screen h-screen bg-black/70 absolute z-50 flex justify-center items-center">
      <div className='relative border-4 border-gray-400 rounded-2xl w-full sm:w-150 h-auto sm:h-150 overflow-hidden'>
        <button onClick={()=>setProfile(false)} className='absolute top-1 right-1  bg-gray-400 rounded-xl px-2 py-1 cursor-pointer hover:bg-gray-500 transition-colors text-xl text-white z-10'>close</button>
        <img
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            setTransformOrigin(`${x}% ${y}%`);
            setIsZoomed((prev) => !prev);
          }}
          src={!isCurrentUserBlocked ? user?.avatar : "./avatar.svg"}
          alt=""
          className="w-full h-full object-fit rounded-xl transition-transform duration-300"
          style={{
            transform: isZoomed ? "scale(2)" : "scale(1)",
            transformOrigin,
            cursor: isZoomed ? "zoom-out" : "zoom-in",
          }}
        />
      </div>
    </div>}
    {/* <div className={` relative ${className} flex-col bg-[#EEDEB3] justify-between flex-3  h-[100dvh] w-[100dvw]`}> */}
    <div className={`
        fixed inset-0 z-40 flex flex-col bg-[#EEDEB3] justify-between h-[100dvh] w-[100dvw]
        xl:static xl:flex-3
        ${className}
      `}>
      <div
        className="absolute inset-0 bg-repeat z-0 mr-2"
        style={{
          backgroundImage: `url(${doodlepr})`,
          backgroundSize: 'auto',
          backgroundPosition: 'top left',
          opacity: 0.5,
        }}
      />

    <>
      {/* profile section */}
      <div className='z-10 w-full h-auto flex px-2 pt-1'>
      <div className='w-full z-10 h-auto py-3.5 px-2 gap-5 bg-gray-600 rounded-3xl flex justify-between items-center' style={{ boxShadow: '0 8px 6px -4px rgba(0, 0, 0, 0.2)' }}>
            <button onClick={() => setActiveView("list")}className="xl:hidden bg-gray-300 rounded-lg px-3 py-1"> <FaArrowLeft /> </button>
        <div className='w-full flex justify-start items-center gap-5'>
          <div onClick={()=>setProfile(true)} className='w-12 lg:w-15 cursor-pointer h-12 lg:h-15 rounded-[50%]'><img className='object-cover rounded-[50%] h-full w-full' src={!isCurrentUserBlocked && user?.avatar || './avatar.svg'} alt=''/></div>
          <div className='flex flex-col justify-start items-start'>
            <div className='text-white font-semibold'>{!isCurrentUserBlocked ? user?.username : "User"}</div>
            <div className='truncate block lg:hidden w-40 lg:w-120 text-neutral-300'>{!isCurrentUserBlocked ? user?.desc : ""}</div>
          </div>
        </div>
        <div className='w-full flex justify-end items-center gap-5'>
          {/* <div className='w-6 lg:w-8 h-6 lg:h-8 cursor-pointer'><img className='object-cover h-full w-full' src='./info.png' alt=''/></div> */}
          <div onClick={()=>setActiveDetail("details")} className='w-6 lg:w-8 h-6 lg:h-8 cursor-pointer rounded-full bg-gray-300 flex lg:hidden justify-center items-center text-gray-600 font-bold text-2xl p-4'>i</div>
        </div>
      </div>
      </div>

      {/* chatting section */}

      

      <div
       onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.target;
          if (scrollHeight - scrollTop - clientHeight > 100) {
            setShowScrollDown(true);
          } else {
            setShowScrollDown(false);
          }
        }}
        className='bg-[#EEDEB3] scrollbar-z w-full h-full flex flex-col verflow-y-auto gap-5 px-2 pt-5 '>    
        {chat?.messages?.length === 0 && <div className='font-semibold text-3xl flex justify-center items-center w-full h-full'>{(!isCurrentUserBlocked && !isReceiverBlocked) ? 'Say Hello' : 'Blocked'}</div>}
          {chat?.messages?.map((message)=>{
             const isBlocked = message.user?.blocked.includes(currentUser.id);
              return (
          <div key={message?.createdAt} className={`w-full flex  ${message.senderId === currentUser?.id ? 'justify-end  items-end':'justify-start items-start'} py-1 z-10`}>
            <div className={`w-[80%] md:w-150 flex ${message.senderId === currentUser?.id ? 'justify-end':'justify-start'} items-end gap-3`}>
              {message.senderId !== currentUser?.id && <div className='h-8 w-9'><img className='object-cover h-full w-full rounded-[50%]' src={ message.senderId === currentUser.id  ? currentUser.avatar || './avatar.svg'  : user.avatar || './avatar.svg'} alt=''/></div>}         
              <div className={`w-full h-auto flex flex-col ${message.senderId === currentUser?.id ? 'justify-end  items-end':'justify-start  items-start'} items-end gap-2`}>
                {/* {message.img && <img className='rounded-2xl' src={message.img} alt=''/>} */}
                {message.img && (
                  <>
                  <div className={`relative group rounded-2xl p-1  ${message.senderId === currentUser?.id ? 'bg-green-700':'bg-gray-500'}`}>
                     {!loadedImages.includes(message.img) ? (
                       <div className="w-30 h-40 bg-gray-300 animate-pulse rounded-2xl"></div> 
                     ):(

                       <img 
                       src={message.img} 
                       alt="message" 
                       className="rounded-2xl w-70 h-auto  md:max-w-sm lg:max-w-md"
                       />
                      )}
                    
                    <button
                      onClick={async () => {
                        try {
                          // Fetch the image
                          const response = await fetch(message.img);
                          const blob = await response.blob();
                          
                          // Extract original filename from Firebase URL
                          const urlParts = message.img.split("?");
                          const path = decodeURIComponent(urlParts[0]); // remove query params
                          const filename = path.split("/").pop() || `chat-image-${Date.now()}.png`;
                          
                          // Create a local object URL
                          const url = URL.createObjectURL(blob);
                          window.open(url, "_blank");
                          
                          // Force download with the original filename
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = filename; 
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          
                          URL.revokeObjectURL(url);
                        } catch (err) {
                          console.error("Download failed", err);
                        }
                      }}
                      className={`absolute cursor-pointer ${message.senderId === currentUser?.id ? 'bottom-10':'bottom-2'} bottom-10 right-2 bg-gray-400 hover:opacity-100 text-white p-1 rounded-full opacity-0 group-hover:opacity-50 transition`}
                    >
                      <Download />
                    </button>
                        <div  className=' w-full flex justify-between lg:justify-end items-center'>
                          <div className='flex lg:hidden justify-start items-center text-gray-300 text-xs pl-2'>
                            Long press to save or share
                          </div>
                          <div className='flex justify-end items-center'>
                            {message.createdAt && (
                              <div className="text-gray-300 text-[12px] flex justify-end pr-2 py-1">
                                {new Date(message.createdAt.seconds * 1000).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                            {message.senderId === currentUser.id && (
                              <span className="ml-1 text-xs flex justify-end items-center">
                                {message.seen?.length > 0 ?  <DoubleTickBlue/> : <DoubleTickWhite/>}
                              </span>
                            )}
                            </div>
                        </div>
                  </div>
                      </>
                )}

                {message.audio && (
                  <div className={` ${message.senderId === currentUser?.id ? 'bg-green-700':'bg-gray-500'} p-1 rounded-xl sm:rounded-4xl`}>
                  <audio controls preload="metadata" className="max-w-xs">
                    <source src={message.audio} type="audio/webm" />
                    Your browser does not support audio playback.
                  </audio>
                  <div  className=' w-full flex justify-end items-center'>

                  {message.createdAt && (
                    <div className="text-gray-300 text-[12px] flex justify-end pr-4 py-1">
                      {new Date(message.createdAt.seconds * 1000).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                  {message.senderId === currentUser.id && (
                    <span className="ml-1 text-xs flex justify-end items-center">
                      {message.seen?.length > 0 ?  <DoubleTickBlue/> : <DoubleTickWhite/>}
                    </span>
                  )}
                  </div>
                  </div>
                )}


                {/* DOC/PDF Messages */}
                  {message.doc && (
                    <div className="relative group flex flex-col scrollbar-z  gap-2 bg-gray-100 p-3 rounded-xl max-w-xs md:max-w-sm lg:max-w-md">
                      {message.docType === "pdf" ? (
                        <>
                          {/* PDF Inline Preview */}
                          <div className="w-full h-60 scrollbar-z overflow-hidden bg-white shadow">
                                  <iframe
                                    src={`${message.doc}#toolbar=0&navpanes=0&scrollbar=0 scrollbar-z`}
                                    title={message.docName}
                                    className="w-full scrollbar-z h-full  border-0"
                                  />
                                </div>

                          <div className="flex justify-between  items-center w-full">
                            <div className="flex flex-col">
                              <span className="font-semibold truncate">{message.docName}</span>
                              <span className="text-sm text-gray-600">{message.docSize}</span>
                            </div>

                            {/* Download button */}
                            <button
                              onClick={async () => {
                                 if (isIOS) {
                                    window.open(message.doc, "_blank");
                                    return;
                                  }
                                try {
                                  const response = await fetch(message.doc);
                                  const blob = await response.blob();

                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = message.docName || `file-${Date.now()}.pdf`;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  URL.revokeObjectURL(url);
                                } catch (err) {
                                  console.error("Download failed", err);
                                }
                              }}
                              className="cursor-pointer bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-full opacity-70 group-hover:opacity-100 transition"
                            >
                              <Download />
                            </button>
                          </div>
                            <div  className=' w-full flex justify-end items-center'>

                            {message.createdAt && (
                              <div className="text-gray-500 text-[12px] flex justify-end">
                                {new Date(message.createdAt.seconds * 1000).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                            {message.senderId === currentUser.id && (
                              <span className="ml-1 text-xs flex justify-end items-center">
                                {message.seen?.length > 0 ?  <DoubleTickBlue/> : <DoubleTickWhite/>}
                              </span>
                            )}
                            </div>
                        </>
                      ) : (
                        <>
                          {/* DOC/DOCX (No preview, only icon + info) */}
                          <div className="flex items-center gap-3">
                            <FaFileAlt className="text-blue-600 w-8 h-8" />
                            <div className="flex flex-col">
                              <span className="font-semibold truncate">{message.docName}</span>
                              <span className="text-sm text-gray-600">{message.docSize}</span>
                            </div>
                          </div>

                          {/* Download button */}
                          <button
                            onClick={async () => {
                               if (isIOS) {
                                    window.open(message.doc, "_blank");
                                    return;
                                  }
                              try {
                                const response = await fetch(message.doc);
                                const blob = await response.blob();

                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = message.docName || `file-${Date.now()}.doc`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                              } catch (err) {
                                console.error("Download failed", err);
                              }
                            }}
                            className="self-end cursor-pointer bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-full opacity-70 group-hover:opacity-100 transition"
                          >
                            <Download />
                          </button>
                        <div  className=' w-full flex justify-end items-center'>

                        {message.createdAt && (
                          <div className="text-gray-500 text-[12px] flex justify-end">
                            {new Date(message.createdAt.seconds * 1000).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                        {message.senderId === currentUser.id && (
                          <span className="ml-1 text-xs flex justify-end items-center">
                            {message.seen?.length > 0 ?  <DoubleTickBlue/> : <DoubleTickWhite/>}
                          </span>
                        )}
                        </div>
                        </>
                      )}
                    </div>
                  )}


                {message.video && (
                  <div
                    className={`${
                      message.senderId === currentUser?.id ? "bg-green-700" : "bg-gray-500"
                    } p-1 rounded-2xl`}
                  >
                    <video
                      src={message.video}
                      controls
                      preload="metadata"
                      poster="/fallback-thumbnail.png"
                      className="rounded-2xl w-70 h-auto md:max-w-sm lg:max-w-md"
                    />

                    {/* Mobile buttons */}

                    {/* Timestamp + seen status */}
                    <div className="w-full flex justify-between lg:justify-end items-center">
                      <div className="flex lg:hidden justify-start pl-2 gap-2">
                        {/* iOS Safari / iPhone → Share button */}
                        {typeof window !== "undefined" &&
                          /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
                          navigator.share && (
                            <button
                              onClick={() =>
                                navigator.share({
                                  title: "Video",
                                  url: message.video,
                                })
                              }
                              className="text-sm bg-blue-600 px-2 py-1 rounded text-white"
                            >
                              Share
                            </button>
                          )}

                        {/* Android → Download button */}
                        {typeof window !== "undefined" &&
                          /Android/i.test(navigator.userAgent) && (
                            <a
                              href={message.video}
                              download
                              className="text-sm bg-blue-600 px-2 py-1 rounded text-white"
                            >
                              Download
                            </a>
                          )}
                      </div>
                      <div className='flex justify-end items-center pr-2'>
                      {message.createdAt && (
                        <div className="text-gray-300 text-[12px] flex justify-end">
                          {new Date(message.createdAt.seconds * 1000).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                      {message.senderId === currentUser.id && (
                        <span className="ml-1 text-xs flex justify-end items-center">
                          {message.seen?.length > 0 ? <DoubleTickBlue /> : <DoubleTickWhite />}
                        </span>
                      )}
                    </div>
                    </div>
                  </div>
                )}




                {message.text && (
                  <div className={` ${message.senderId === currentUser?.id ? 'bg-green-700':'bg-gray-500'} text-white p-2 rounded-2xl flex flex-col gap-2 w-auto max-w-[100%] overflow-hidden break-all`}>
                  <div className={` ${message.senderId === currentUser?.id ? 'justify-end':'justify-start'} flex justify-end items-end w-full text-md sm:text-xl`}><TranslatedMessage text={message.text} /></div>
                  <div  className=' w-full flex justify-end items-center'>

                  {message.createdAt && (
                    <div className="text-gray-300 text-[12px] flex justify-end">
                      {new Date(message.createdAt.seconds * 1000).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                  {message.senderId === currentUser.id && (
                    <span className="ml-1 text-xs flex justify-end items-center">
                      {message.seen?.length > 0 ?  <DoubleTickBlue/> : <DoubleTickWhite/>}
                    </span>
                  )}
                  </div>


                </div>
                )}
              </div>
            </div>
          </div>
)})}
          {/* Pending doc/pdf preview while uploading */}
            {uploading && progress > 0 && (
              <div className="w-full flex justify-end items-end py-1 z-10">
                <div className="w-[80%] md:w-150 flex justify-end items-end gap-3">
                  <div className="relative bg-gray-200 p-3 rounded-xl flex flex-col items-center gap-2 w-60">
                    <FaFileAlt className="text-gray-600 w-10 h-10" />
                    <span className="text-gray-700 font-semibold">Uploading...</span>
                    <span className="text-sm text-gray-500">{progress}%</span>
                    <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}


          {/* Pending video preview while uploading */}
            {video.url && (
              <div className="w-full flex justify-end items-end py-1 z-10">
                <div className="w-[80%] md:w-150 flex justify-end items-end gap-3">
                  <div className="relative">
                    {/* Show thumbnail if available, else fallback */}
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt="video thumbnail"
                        className="rounded-2xl opacity-70"
                      />
                    ) : (
                      <div className="w-40 h-40 bg-gray-300 rounded-2xl animate-pulse"></div>
                    )}
                  </div>
                </div>
              </div>
            )}

        {activeVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50">
            <div className="relative w-[90%] md:w-[70%] lg:w-[50%]">
              <video src={activeVideo} controls autoPlay className="w-full rounded-xl" />
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute top-2 right-2 bg-gray-700 text-white px-3 py-1 rounded-full"
              >
                ✕
              </button>
            </div>
          </div>
        )}

          


        <div ref={endRef}></div>
        {showScrollDown && (
          <button
          onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-30 z-50 cursor-pointer left-1/2 -translate-x-1/2 bg-black text-white p-2 rounded-full shadow-lg hover:bg-gray-800 transition"
          >
            <ArrowDown size={24} />
          </button>
        )}

          



      </div>

      {/* message send section */}
        {chat?.typing && Object.entries(chat.typing).map(([uid, isTyping]) => (
          uid !== currentUser.id && isTyping && (
            <div key={uid} className="text-md text-white mb-2 ml-4 font-semibold bg-black/80 w-25 rounded-2xl italic px-2 py-1">
              typing<span><SyncLoader size={5} color='#ffff' /></span>
            </div>
          )
        ))}

      {(!isCurrentUserBlocked && !isReceiverBlocked) ? <div className=' z-10 w-full h-auto flex justify-start items-center gap-5 px-3 pb-1 ' >
        <div className='w-full h-auto flex p-2 px-4 flex-col gap-2 justify-start items-center bg-gray-600 rounded-2xl' style={{ boxShadow: '0 -8px 6px -4px rgba(0, 0, 0, 0.2)' }}>
          {!mediaRecorderRef.current && <input className='w-full h-auto text-white outline-none focus:outline-none disabled:cursor-not-allowed' placeholder='Type Here' type='text' value={text} onChange={handleInputChange} onBlur={handleBlur} disabled={isCurrentUserBlocked || isReceiverBlocked }/>}

           <div className='flex justify-between items-center w-full'>
            {mediaRecorderRef.current && (
              <LiveAudioVisualizer
              mediaRecorder={mediaRecorderRef.current}
              width={270}
              height={70}
              barWidth={2}
                    gap={1}
                    fftSize={1024}
                    smoothingTimeConstant={0.4}
                    barColor="rgb(239, 68, 68)"
                    />
                  )}
                  {mediaRecorderRef.current && <div className='text-red-500 font-mono text-xl mb-3'>{formatTime(recordingTime)}</div>}
            </div>


          <div className='w-full h-auto flex justify-between items-center'>
            {!isRecording && <div className='w-full h-full flex justify-start items-center gap-3'>
               <label htmlFor='file'><Gallery/></label><input type='file' id='file' className='hidden' accept="image/*,video/*" onChange={handleFile}/>
               <CameraButton/>
               <label htmlFor='Doc' className='cursor-pointer'><Document/></label><input type='file' id='Doc' className='hidden' accept=".pdf,.doc,.docx"  onChange={handleDoc}/>
               

                <div className='emoji hidden md:flex relative  cursor-pointer' onClick={()=>setOpen(!open)}>
                    <Emojis/>
                    <div ref={emojiRef} className='picker absolute bottom-12 left-0'>
                      <EmojiPicker open={open} onEmojiClick={handleEmoji}/>
                    </div>
                </div>
              </div>}

            { !micLoad && (isRecording && <div className='w-full h-full flex justify-start items-center gap-3'>
              {isPaused ? <div onClick={resumeRecording} ><PlayIcon/></div> :<div onClick={pauseRecording}><Pause/></div> }
               <div onClick={cancelRecording} ><CloseIcon/></div>
            </div>)}

           <div className="w-full h-full flex justify-end items-center">
            {/* Mic & Send */}
            <div className="relative w-10 h-10">
              {text.length === 0 ? (
                <div className="flex gap-2 items-center">
                  {!isRecording ? (
                    <button
                    aria-label='mic'
                      onClick={startRecording}
                      className="bg-black rounded-full w-10 h-10 flex justify-center items-center text-white"
                    >
                      <Mic />
                    </button>
                  ) : (
                  //  <>{micLoad && <div>Loading...</div>}</>
                   <>{micLoad ? <div className='w-auto h-auto p-1 flex justify-center items-center rounded-full'><MoonLoader size={20} color='#ffff' /></div> :<div onClick={stopAndSend} ><CircleIcon/></div>} </>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleSend}
                  className="bg-black w-10 h-10 rounded-full flex justify-center items-center text-white"
                >
                  <Arrow />
                </button>
              )}
            </div>

            

          </div>

          </div>
        </div>
      </div>: !isCurrentUserBlocked ? <div className=' z-10 w-full h-auto flex justify-center items-center gap-5 px-3 pb-1 font-bold text-xl '>Unblock the user to start talking</div> : <div className=' z-10 w-full h-auto flex justify-center items-center gap-5 px-3 pb-1 font-bold text-xl'>You have been blocked by the user</div>}
                    
      {/* {cameraOpen && (
        <CameraModal 
          onClose={() => setCameraOpen(false)} 
          onCapture={async (photo) => {
            setCameraOpen(false);

            try {
              setImg({ file: photo.file, url: photo.url });
              setUploading(true);
              setProgress(0);

              const imgUrl = await upload(photo.file, (p) => setProgress(p));

              await updateDoc(doc(db, "chats", chatId), {
                messages: arrayUnion({
                  senderId: currentUser.id,
                  text: "",
                  createdAt: new Date(),
                  img: imgUrl,
                }),
                 lastMessage: " Photo",
                  updatedAt: Date.now(),
              });

              setImg({ file: null, url: "" });
              setUploading(false);
              setProgress(0);
            } catch (err) {
              console.error("Camera upload failed", err);
              setUploading(false);
            }
          }} 
        />
      )} */}



    </>
      
    </div>
    </>
  )
}

export default Chat
