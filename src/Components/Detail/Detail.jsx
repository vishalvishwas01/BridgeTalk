import { arrayRemove, arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useChatStore } from '../lib/chatStore'
import { db } from '../lib/firebase'
import { useUserStore } from '../lib/userStore';
import { useState, useEffect, useRef } from 'react';
import { MoonLoader } from 'react-spinners';
import { FaArrowLeft } from "react-icons/fa6";

const Detail = ({ setActiveDetail, setActiveView, className="" }) => {
  const {chatId, user, isCurrentUserBlocked, isReceiverBlocked, changeBlock, changeChat} = useChatStore();
  const {currentUser}=useUserStore();
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [profile, setProfile] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false);
  const [transformOrigin, setTransformOrigin] = useState("center center");
  const [userData, setUserData] = useState(user);

    // inside Detail component
useEffect(() => {
  if (!user?.id) return;
  const unsub = onSnapshot(doc(db, "users", user.id), (docSnap) => {
    if (docSnap.exists()) {
      setUserData({ id: docSnap.id, ...docSnap.data() });
    }
  });
  return () => unsub();
}, [user?.id]);



  const handleClearChat = async () => {
  if (!chatId) return;
  try {
    // Clear messages
    await updateDoc(doc(db, "chats", chatId), { messages: [] });

    // Clear lastMessage for both users
    const userIDs = [currentUser.id, user.id];
    for (const id of userIDs) {
      const userChatsRef = doc(db, "userchats", id);
      const userChatsSnap = await getDoc(userChatsRef);

      if (userChatsSnap.exists()) {
        const userChatsData = userChatsSnap.data();
        const chatIndex = userChatsData.chats.findIndex(c => c.chatId === chatId);
        if (chatIndex !== -1) {
          userChatsData.chats[chatIndex].lastMessage = "";
          await updateDoc(userChatsRef, { chats: userChatsData.chats });
        }
      }
    }

    console.log("Chat cleared for both users!");
  } catch (err) {
    console.error(err);
  }
};

  const handleBlock = async()=>{
    if(!user) return;
    setBlockLoading(true)
      const userDocRef = doc(db,"users",currentUser.id)
    try {
      await updateDoc(userDocRef,{
        blocked: isReceiverBlocked ? arrayRemove(user.id) : arrayUnion(user.id),
      });
      changeBlock()
    } catch (err) {
      console.log(err)
    } finally {
      setBlockLoading(false)
      window.location.reload();
    }
  }


const handleDelete = async () => {
  if (!chatId) return;
  setDeleteLoading(true);
  try {
    const userChatsRef = doc(db, "userchats", currentUser.id);
    const userChatsSnap = await getDoc(userChatsRef);

    if (userChatsSnap.exists()) {
      const currentChats = userChatsSnap.data().chats || [];

      // find the chat being deleted
      const removedChat = currentChats.find((c) => c.chatId === chatId);

      // remove from current user
      const updatedChats = currentChats.filter((c) => c.chatId !== chatId);
      await updateDoc(userChatsRef, { chats: updatedChats });

      //  also remove from the other user
      if (removedChat) {
        const otherUserChatsRef = doc(db, "userchats", removedChat.receiverId);
        const otherUserSnap = await getDoc(otherUserChatsRef);

        if (otherUserSnap.exists()) {
          const otherUserChats = otherUserSnap.data().chats || [];
          const updatedOtherChats = otherUserChats.filter(
            (c) => c.chatId !== chatId
          );
          await updateDoc(otherUserChatsRef, { chats: updatedOtherChats });
        }
      }
    }

    //  close chat (show <Nothing/>)
    changeChat(null, null);
     setActiveView("list"); 
    setActiveDetail("");

  } catch (err) {
    console.log("Error deleting chat:", err);
  } finally {
    setDeleteLoading(false);
  }
};

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
          className="w-full h-full object-cover rounded-xl transition-transform duration-300"
          style={{
            transform: isZoomed ? "scale(2)" : "scale(1)",
            transformOrigin,
            cursor: isZoomed ? "zoom-out" : "zoom-in",
          }}
        />
      </div>
    </div>}

    <div className={`
          fixed inset-0 z-50 flex flex-col justify-between px-2 py-3 bg-[#DDDAD0]
          h-[100dvh] w-[100dvw]
          xl:static xl:h-auto xl:w-auto xl:flex
          ${className}
        `} 
      style={{ boxShadow: '-8px 0 6px -4px rgba(0, 0, 0, 0.2)' }}>
      <div className='border-b-2 border-gray-400 pb-4 w-full h-auto flex flex-col justify-center items-center gap-5'>
        <button onClick={()=>setProfile(true)} className='flex justify-center items-center w-30 h-30 cursor-pointer'><img className='w-full h-full object-cover rounded-[50%]' src={!isCurrentUserBlocked ? user?.avatar  : "./avatar.svg"} alt=''/></button>
          <div onClick={()=>{setActiveDetail("")}} className='absolute left-5 top-20 xl:hidden bg-gray-400 rounded-lg px-3 py-1'><FaArrowLeft /></div>
        <div className='w-full flex justify-center items-center text-3xl font-semibold'>{!isCurrentUserBlocked ? user?.username : "User"}</div>
        <div className='w-full h-auto flex flex-col justify-start items-start'>
          <div className='w-80 h-auto break-all font-semibold'>Email:<span className='font-normal'> {!isCurrentUserBlocked ? user?.email : "No email provided"}</span></div>
        </div>
        <div className={`w-full h-60 sm:h-80 lg:h-100 flex justify-start items-start text-start line-clamp-1 overflow-auto scrollbar-z ${!isCurrentUserBlocked ? userData?.desc ? 'text-black-500':'text-gray-500' : ""} `}> {!isCurrentUserBlocked ? userData?.desc || "No Description available" : ""}</div>
      </div>

      <div className='w-full h-auto flex flex-col justify-center items-center gap-5'>
        <button onClick={handleClearChat} className={` ${!isCurrentUserBlocked ? "flex" : "hidden"} w-full justify-center items-center text-red-400 hover:text-red-500 transition-all font-semibold text-xl py-2 cursor-pointer`}>Clear chat</button>
        <button onClick={handleDelete} className='bg-red-500 opacity-70 hover:opacity-100 transition-all rounded-2xl w-full flex justify-center items-center text-white font-semibold text-xl py-2 cursor-pointer'>{deleteLoading ? <MoonLoader size={20} color='#ffff'/> : "Remove User"}</button>
        <button
          onClick={!isCurrentUserBlocked ? handleBlock : null}
          disabled={isCurrentUserBlocked || blockLoading}
          className={`${
            isCurrentUserBlocked
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-500 hover:opacity-100 cursor-pointer"
          } opacity-70 transition-all rounded-2xl w-full flex justify-center items-center text-white font-semibold text-xl py-2`}
        >
          {blockLoading ? (
            <MoonLoader size={20} color="#fff" />
          ) : isCurrentUserBlocked ? (
            "You are Blocked"
          ) : isReceiverBlocked ? (
            "Unblock"
          ) : (
            "Block User"
          )}
        </button>

      </div>

    </div>
    </>
  )
}

export default Detail
