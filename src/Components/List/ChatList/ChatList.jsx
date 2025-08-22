import { useEffect, useRef, useState } from 'react'
import AddUser from './AddUser/AddUser'
import { useUserStore } from '../../lib/userStore'
import { useChatStore } from '../../lib/chatStore'
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import TranslatedMessage from '../../Chat/TranslatedMessage'

const ChatList = ({ setActiveView }) => {
  const [addMode, setAddMode] = useState(false)
  const [input, setInput] = useState("")
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)

  const { currentUser } = useUserStore()
  const { changeChat } = useChatStore()

  const prevChatsRef = useRef([])
  const notificationSound = useRef(new Audio("/notification.mp3"))

 const handleSelect = async (chat) => {
  try {
    const userChats = chats.map(item => {
      const { user, ...rest } = item
      return { ...rest }
    })

    const chatIndex = userChats.findIndex(item => item.chatId === chat.chatId)

    if (chatIndex !== -1) {
      userChats[chatIndex].isSeen = true
      userChats[chatIndex].unreadCount = 0
      const userChatsRef = doc(db, "userchats", currentUser.id)
      await updateDoc(userChatsRef, { chats: userChats })
    }

    changeChat(chat.chatId, chat.user)
    localStorage.setItem("lastChat", JSON.stringify(chat)) 
     // ✅ Switch to chat view only on small screens
      if (window.innerWidth < 1280) {
        setActiveView("chat");
      }

  } catch (err) {
    console.log("Error selecting chat:", err)
  }
}

useEffect(() => {
  const lastChat = localStorage.getItem("lastChat")
  if (lastChat) {
    const parsed = JSON.parse(lastChat)
    changeChat(parsed.chatId, parsed.user)
  }
}, [changeChat])




const { chatId } = useChatStore()

useEffect(() => {
  const unsub = onSnapshot(doc(db, "userchats", currentUser.id), async (res) => {
    const items = res.data()?.chats || []
    if (items.length === 0) {
      setChats([])
      setLoading(false)
      return
    }

    const promises = items.map(async (item) => {
      const userDocRef = doc(db, "users", item.receiverId)
      const userDocSnap = await getDoc(userDocRef)
      const user = userDocSnap.data()

      if (user?.avatar) {
        await new Promise((resolve) => {
          const img = new Image()
          img.src = user.avatar
          img.onload = resolve
          img.onerror = resolve
        })
      }

      if (item.chatId === chatId) {
        return { ...item, user, unreadCount: 0, isSeen: true }
      }

      return { ...item, user }
    })

    const chatData = await Promise.all(promises)
    const sortedChats = chatData.sort((a, b) => b.updatedAt - a.updatedAt)

    setChats(sortedChats)
    prevChatsRef.current = sortedChats
    setLoading(false)
  })

  return () => unsub()
}, [currentUser.id, chatId])





  const filteredChats = chats.filter(c =>
    c.user.username.toLowerCase().includes(input.toLowerCase())
  )

  return (
    <div className='chatList bg-[#DDDAD0] h-full overflow-hidden flex flex-col justify-start items-center py-5 px-2 gap-5'>
      {/* Search + Add User */}
      <div className='w-full h-auto flex justify-between items-center gap-5'>
        <div className='UserInfoBg flex gap-2 h-auto w-full rounded-2xl px-2 py-2'>
          <img className='object-cover h-8 w-8' src='./search.png' />
          <input
            className='outline-0 text-black w-full'
            type='text'
            placeholder='Search'
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <button
          onClick={() => setAddMode(!addMode)}
          className='bg-[#9b9b9b] rounded-2xl h-12 w-14 px-2 py-2 cursor-pointer'
        >
          <img className='object-cover h-full w-full' src='./plus.png' alt='' />
        </button>
      </div>

      {/* Chats list */}
      <div className='w-full h-full overflow-y-auto overflow-x-hidden flex flex-col justify-start items-center gap-5 py-1'>
        {loading ? (
          // Skeleton loader
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className='w-full h-20 rounded-2xl bg-gray-400 overflow-hidden relative flex justify-start items-center px-2'>
                <div className='rounded-full w-15 h-15 bg-gray-300'></div>
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent w-[200%]"></div>
              </div>
            ))}
          </>
        ) : filteredChats.length === 0 ? (
          // ✅ Show "no users" if empty AFTER loading
          <div className="text-gray-600 mt-5">No users to chat</div>
        ) : (
          // ✅ Show chats
         filteredChats.map((chat) => {
          const isBlocked = chat.user.blocked.includes(currentUser.id);

          return (
            <div
              key={chat.chatId}
              onClick={() => handleSelect(chat)}
              className='w-full h-20 pb-3 border-b-2 border-gray-400 flex justify-start items-center gap-4 cursor-pointer'
            >
              {/* Avatar */}
              <div className='w-15 h-15 rounded-[50%]'>
                <img
                  className='object-cover rounded-[50%] h-full w-full'
                  src={isBlocked ? "./avatar.svg" : chat.user.avatar || "./avatar.svg"}
                  alt=''
                />
              </div>

              {/* Username + Last Message */}
              <div className='w-[70%] h-15 flex flex-col justify-center items-start gap-1'>
                <div className='w-full font-semibold'>
                  {isBlocked ? "User" : chat.user.username}
                </div>
                <div className='w-50 text-gray-600 truncate'>
                  {isBlocked ? "Message not available" : <TranslatedMessage text={chat.lastMessage} />}
                </div>
              </div>

              {/* Unread count */}
              {chat.unreadCount > 0 && !isBlocked && (
                <div className="bg-green-500 rounded-full h-auto w-auto px-2 py-1 flex items-center justify-center text-white text-sm">
                  {chat.unreadCount !== 999 ? chat.unreadCount : "999+"}
                </div>
              )}
            </div>
          );
        })

        )}
      </div>

      {addMode && <AddUser setAddMode={setAddMode} />}
    </div>
  )
}

export default ChatList
