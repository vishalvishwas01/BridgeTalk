import { arrayUnion, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useState } from "react";
import { useUserStore } from "../../../lib/userStore";
import {MoonLoader} from "react-spinners"

const AddUser = ({ setAddMode }) => {
  const [user, setUser] = useState(null);
  const [alreadyExists, setAlreadyExists] = useState(false); //  track if chat exists
  const { currentUser } = useUserStore();
  const [loading, setLoading] = useState(false)
  const [addLoading, setAddLoading]= useState(false)

const handleSearch = async (e) => {
  e.preventDefault();
  setLoading(true); //  start loading

  const formData = new FormData(e.target);
  const username = formData.get("username");

  try {
    const userRef = collection(db, "users");
    const q = query(userRef, where("username", "==", username));
    const querySnapShot = await getDocs(q);

    if (!querySnapShot.empty) {
      const foundUser = querySnapShot.docs[0].data();

      //  Prevent searching yourself
      if (foundUser.id === currentUser.id) {
        setUser(null);
        setAlreadyExists(false);
        setLoading(false); //  stop loading
        return;
      }

      setUser(foundUser);

      //  Check if chat already exists
      const userChatRef = doc(db, "userchats", currentUser.id);
      const userChatsDoc = await getDoc(userChatRef);

      if (userChatsDoc.exists()) {
        const chats = userChatsDoc.data().chats || [];
        const exists = chats.some((c) => c.receiverId === foundUser.id);
        setAlreadyExists(exists);
      } else {
        setAlreadyExists(false);
      }
    } else {
      setUser(null);
      setAlreadyExists(false);
    }
  } catch (err) {
    console.log(err);
  } finally {
    setLoading(false); //  always stop loading (success or error)
  }
};



const handleAdd = async () => {
  if (!user || alreadyExists) return;

  setAddLoading(true); //  start loading

  const chatRef = collection(db, "chats");
  const userChatRef = collection(db, "userchats");

  try {
    const newChatRef = doc(chatRef);

    await setDoc(newChatRef, {
      createdAt: serverTimestamp(),
      messages: [],
    });

    // For searched user
    await setDoc(
      doc(userChatRef, user.id),
      {
        chats: arrayUnion({
          chatId: newChatRef.id,
          lastMessage: "",
          receiverId: currentUser.id,
          updatedAt: Date.now(),
          isSeen: false,
          unreadCount: 0,
        }),
      },
      { merge: true }
    );

    // For current user
    await setDoc(
      doc(userChatRef, currentUser.id),
      {
        chats: arrayUnion({
          chatId: newChatRef.id,
          lastMessage: "",
          receiverId: user.id,
          updatedAt: Date.now(),
          isSeen: false,
          unreadCount: 0,
        }),
      },
      { merge: true }
    );

    setAlreadyExists(true);
  } catch (err) {
    console.log(err);
  } finally {
    setAddLoading(false);
  }
  };


  return (
    <div className=" h-[100dvh] absolute bg-black/70 top-0 bottom-0 left-0 right-0 p-2 flex flex-col justify-center items-center">
      <div className="rounded-2xl border-2 gap-5 p-2 max-w-[95%] sm:max-w-95 flex flex-col justify-center items-center border-gray-400 bg-[#DDDAD0]">
        <div className="w-full flex justify-end items-center"><button onClick={() => setAddMode(false)}  className=" cursor-pointer rounded-2xl bg-blue-300 px-2 py-1 mr-2 sm:mr-0  hover:bg-blue-400 transition-colors">Back</button></div>
        <form
          onSubmit={handleSearch}
          className="p-2 gap-5 w-auto h-auto flex justify-start items-center"
        >
          <input
            name="username"
            className="p-2 rounded-2xl bg-neutral-100 w-full sm:w-70 text-black"
            placeholder="search here"
          />
          <button className="p-2 rounded-2xl flex justify-center items-center cursor-pointer bg-blue-300">
            {loading ? <MoonLoader size={20}/> : "Search" }
          </button>
        </form>

        {user && (
          <div className="w-full">
            <div className="w-full h-auto sm:p-0 p-2 flex justify-between items-center gap-5 border-b-2 border-gray-400">
              <div className="flex justify-start items-center gap-3">
                <div className="h-12 w-12 flex justify-center items-center">
                  <img
                    className="h-full w-full object-cover rounded-full"
                    src={user.avatar || "./avatar.svg"}
                    alt=""
                  />
                </div>
                <div className="p-2 max-w-50 truncate">{user.username}</div>
              </div>
              <button
                onClick={handleAdd}
                disabled={alreadyExists}
                className={`rounded-2xl p-2 ${
                  alreadyExists
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-300 cursor-pointer flex justify-center items-center"
                }`}
              >
                {alreadyExists ? "Added" : addLoading ? <MoonLoader size={20}/> : "Add User"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddUser;
