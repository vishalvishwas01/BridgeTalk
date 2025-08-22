import { CiEdit } from "react-icons/ci";
import { useUserStore } from '../lib/userStore';
import { storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoonLoader } from "react-spinners";

import { sendPasswordResetEmail } from "firebase/auth";
import { 
  reauthenticateWithCredential, 
  EmailAuthProvider, 
  reauthenticateWithPopup, 
  GoogleAuthProvider, 
} from "firebase/auth";

import { Link } from "react-router-dom";
import { deleteUser } from "firebase/auth";
import { deleteDoc } from "firebase/firestore";
import { deleteObject, listAll } from "firebase/storage";


const checkUserExists = async (field, value, currentUserId) => {
  if (!value) return false;
  const usersRef = collection(db, "users");
  const q = query(usersRef, where(field, "==", value));
  const snap = await getDocs(q);

  if (!snap.empty) {
    const conflict = snap.docs.find(doc => doc.id !== currentUserId);
    if (conflict) {
      return true;
    }
  }
  return false;
};

function Settings() {
  const { currentUser, updateCurrentUserField } = useUserStore();
  const navigate = useNavigate();
  const [avatarLoader, setAvatarLoader] = useState(false);
  const [resetLoader, setResetLoader] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [errorloading, setErrorLoading] = useState(false)
  const [toggle, setToggle] = useState(false)
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAvatarLoader(true);
    try {
      const storageRef = ref(storage, `avatars/${currentUser.id}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const userRef = doc(db, "users", currentUser.id);
      await updateDoc(userRef, { avatar: url });

      updateCurrentUserField("avatar", url);
    } catch (err) {
      console.error("Error uploading avatar:", err);
    } finally {
      setAvatarLoader(false);
    }
  };

  //  Description
  const [desc, setDesc] = useState(currentUser?.desc || "");
  const [tempDesc, setTempDesc] = useState(desc);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descLoader, setDescLoader] = useState(false);
  const descRef = useRef(null);

  //  Username
  const [username, setUsername] = useState(currentUser?.username || "");
  const [tempUsername, setTempUsername] = useState(username);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameLoader, setUsernameLoader] = useState(false);
  const usernameRef = useRef(null);

  //  Email
  const [email, setEmail] = useState(currentUser?.email || "");
  const [tempEmail, setTempEmail] = useState(email);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailLoader, setEmailLoader] = useState(false);
  const emailRef = useRef(null);

  const focusAndMoveCursorToEnd = (ref) => {
    setTimeout(() => {
      ref.current?.focus();
      ref.current.selectionStart = ref.current.value.length;
      ref.current.selectionEnd = ref.current.value.length;
    }, 0);
  };

  const handleEdit = (field) => {
    switch (field) {
      case "desc":
        setIsEditingDesc(true);
        setTempDesc(desc);
        focusAndMoveCursorToEnd(descRef);
        break;
      case "username":
        setIsEditingUsername(true);
        setTempUsername(username);
        focusAndMoveCursorToEnd(usernameRef);
        break;
      case "email":
        setIsEditingEmail(true);
        setTempEmail(email);
        focusAndMoveCursorToEnd(emailRef);
        break;
      default:
        break;
    }
  };

  const handleCancel = (field) => {
    switch (field) {
      case "desc":
        setIsEditingDesc(false);
        setTempDesc(desc);
        break;
      case "username":
        setIsEditingUsername(false);
        setTempUsername(username);
        setErrorLoading(false)
        break;
      case "email":
        setIsEditingEmail(false);
        setTempEmail(email);
        setErrorLoading(false)
        break;
      default:
        break;
    }
  };

  const handleSave = async (field) => {
    let value, setValue, setLoader, setEditing;
    switch (field) {
      case "desc":
        value = tempDesc; setValue = setDesc; setLoader = setDescLoader; setEditing = setIsEditingDesc;
        break;
      case "username":
        value = tempUsername; setValue = setUsername; setLoader = setUsernameLoader; setEditing = setIsEditingUsername;
        break;
      case "email":
        value = tempEmail; setValue = setEmail; setLoader = setEmailLoader; setEditing = setIsEditingEmail;
        break;
      default:
        return;
    }

    setLoader(true);
    try {
      //  Duplicate check for username/email
      if (field === "username" || field === "email") {
        const exists = await checkUserExists(field, value, currentUser.id);
        if (exists) {
          setErrorLoading(true)
          setLoader(false);
          return;
        }
      }
      

      const userRef = doc(db, "users", currentUser.id);
      await updateDoc(userRef, { [field]: value });

      setValue(value);
      setEditing(false);
      updateCurrentUserField(field, value);
    } catch (err) {
      console.error(`Error updating ${field}:`, err);
    } finally {
      setLoader(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!currentUser?.email) return;

    setResetLoader(true);
    setResetMessage("");
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      setResetMessage("Password reset email sent! (Check your Spam folder)");
    } catch (err) {
      console.error("Error sending password reset email:", err);
      setResetMessage("Failed to send reset email. Try again.");
    } finally {
      setResetLoader(false);
    }
  };


const handleAccountDelete = async () => {
  if (!currentUser) return;

  try {
    const authUser = auth.currentUser;
    if (!authUser) return;

    // 🔹 STEP 1: Re-authenticate
    if (authUser.providerData[0]?.providerId === "password") {
      const password = prompt("Please confirm your password to delete your account:");
      if (!password) return;
      const credential = EmailAuthProvider.credential(authUser.email, password);
      await reauthenticateWithCredential(authUser, credential);
    } else if (authUser.providerData[0]?.providerId === "google.com") {
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(authUser, provider);
    }

    const userId = currentUser.id;
    const userRef = doc(db, "users", userId);

    // 🔹 STEP 2: Delete avatar
    try {
      await deleteObject(ref(storage, `avatars/${userId}`));
    } catch {}

    // 🔹 STEP 3: Delete uploads
    try {
      const uploadsRef = ref(storage, `uploads/${userId}`);
      const list = await listAll(uploadsRef);
      for (const item of list.items) {
        await deleteObject(item);
      }
    } catch {}

    // 🔹 STEP 4: Delete chats where user is a member
    const chatsRef = collection(db, "chats");
    const chatSnap = await getDocs(chatsRef);

    for (const chatDoc of chatSnap.docs) {
      const chatData = chatDoc.data();
      if (chatData.members?.includes(userId)) {
        await deleteDoc(doc(db, "chats", chatDoc.id));
      }
    }

    const userChatsRef = collection(db, "userchats");
    const allUserChats = await getDocs(userChatsRef);

    for (const userChatDoc of allUserChats.docs) {
      const chats = userChatDoc.data()?.chats || [];
      const updatedChats = chats.filter(c => c.receiverId !== userId);

      if (updatedChats.length !== chats.length) {
        await updateDoc(userChatDoc.ref, { chats: updatedChats });
      }
    }

    await deleteDoc(userRef);

    await deleteUser(authUser);

    localStorage.clear();
    window.location.href = "/";
  } catch (err) {
    console.error("Error deleting account:", err);
    alert("Account deletion failed: " + err.message);
  }
};

const handleLogOut = ()=>{
  auth.signOut();
  window.location.reload();
  navigate("/");
}


  

  return (
    <>
    <div className='h-[100dvh] w-[100dvw] relative flex flex-col md:flex-row justify-start md:justify-center  sm:gap-5 items-center py-5 px-2 '>
      <div class="absolute top-0 z-[-2] h-screen w-screen bg-[#000000] bg-[radial-gradient(#ffffff33_1px,#00091d_1px)] bg-[size:20px_20px]"></div>
      {toggle && <div className="w-screen inset-0 h-full bg-black/50 absolute z-40 flex justify-center items-center">
        <div className="w-50 h-auto py-3 flex flex-col gap-5 justify-start items-center border-2 rounded-2xl border-gray-500 bg-gray-400">
          <div className="w-full text-center text-2xl font-semibold">Are you sure ?</div>
          <div className="flex justify-center items-center gap-5">
            <button onClick={()=>setToggle(false)} className="bg-green-400 cursor-pointer z-20 px-2 py-1 text-xl rounded-2xl">Cancel</button>
            <button onClick={handleAccountDelete} className="bg-red-400 cursor-pointer px-2 py-1 text-xl rounded-2xl">Delete</button>
          </div>
        </div>
      </div>}
      <div className='w-full gap-5 h-full flex flex-col justify-start items-center p-2'> 
        <div className="w-full flex justify-between items-center gap-2">
          <div className='rounded-full relative w-40 h-40 sm:w-50 sm:h-50'>
            <label
              htmlFor='pic'
              className='h-full w-full object-cover cursor-pointer relative flex justify-center items-center'
            >
              {avatarLoader ? (
                <div className="flex justify-center items-center h-full w-full bg-gray-200 rounded-full">
                  <MoonLoader size={30} />
                </div>
              ) : (
                <img
                className='h-full w-full rounded-full'
                src={currentUser.avatar || './avatar.svg'}
                alt="Avatar"
                  onError={(e) => { e.currentTarget.src = './avatar.svg' }}
                />
              )}
              <div className='absolute top-0 w-full h-full flex justify-center items-center opacity-0 hover:opacity-100 bg-black/30 text-white rounded-full transition-all'>
                <CiEdit size={30} />
              </div>
            </label>
            <input
              type='file'
              id='pic'
              className='hidden'
              accept="image/*"
              onChange={handleAvatarChange}
            />
          </div>
          <Link to="/" className="rounded-2xl px-2 py-1 bg-red-400 hover:bg-red-300 transition-all z-10">Back to home</Link>
        </div>  

        {/* Username */}
        {errorloading && <div className="text-red-500 w-full pl-2">Username/Email already exists</div>}
        <div className="w-full h-auto flex flex-col gap-2">
          <div className="w-full text-start text-md sm:text-xl font-semibold pl-2 text-white">Username</div>
          <div className="w-full h-auto flex justify-between items-center gap-2">
            <input
              ref={usernameRef}
              value={isEditingUsername ? tempUsername : username}
              className="bg-gray-400 w-full rounded-2xl text-white text-xl sm:text-2xl px-3 py-2 z-10"
              disabled={!isEditingUsername}
              onChange={(e) => setTempUsername(e.target.value)}
            />
            {!isEditingUsername ? (
              <button className="text-xl bg-yellow-300 hover:bg-yellow-500 px-2 py-1 rounded-2xl z-10" onClick={() => handleEdit("username")}>Edit</button>
            ) : (
              <>
                <button className="text-xl bg-yellow-300 hover:bg-yellow-500 px-2 py-1 rounded-2xl z-10" onClick={() => handleCancel("username")}>Cancel</button>
                <button className="text-xl bg-green-300 hover:bg-green-500 px-2 py-1 rounded-2xl flex justify-center items-center z-10" onClick={() => handleSave("username")}>
                  {usernameLoader ? <MoonLoader size={20}/> : "Save"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="w-full h-auto flex flex-col gap-2">
          <div className="w-full text-start text-md sm:text-xl font-semibold pl-2 text-white">Email</div>
          <div className="w-full h-auto flex justify-between items-center gap-2">
            <input
              ref={emailRef}
              value={isEditingEmail ? tempEmail : email}
              className="bg-gray-400 w-full text-white rounded-2xl text-xl sm:text-2xl px-3 py-2 z-10"
              disabled={!isEditingEmail}
              onChange={(e) => setTempEmail(e.target.value)}
              />
            {!isEditingEmail ? (
              <button className="text-xl bg-yellow-300 hover:bg-yellow-500 px-2 py-1 rounded-2xl z-10" onClick={() => handleEdit("email")}>Edit</button>
            ) : (
              <>
                <button className="text-xl bg-yellow-300 hover:bg-yellow-500 px-2 py-1 rounded-2xl z-10" onClick={() => handleCancel("email")}>Cancel</button>
                <button className="text-xl bg-green-300 hover:bg-green-500 px-2 py-1 rounded-2xl flex justify-center items-center z-10" onClick={() => handleSave("email")}>
                  {emailLoader ? <MoonLoader size={20}/> : "Save"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Reset Password */}
        <div className="w-full flex justify-start items-center gap-2">
          <div className="flex gap-2 text-white pl-2 justify-start items-center z-10">
          <div className="text-md sm:text-xl font-semibold">Forgot Password ?</div>
          <button
            className="cursor-pointer text-xl text-red-400 flex items-center gap-2"
            onClick={handlePasswordReset}
            disabled={resetLoader}
            >
            {resetLoader ? <MoonLoader size={20}/> : "Reset"}
          </button>
          </div>
        </div>
        {resetMessage && <div className="text-sm text-green-600 mt-1">{resetMessage}</div>}

        {/* delete account */}
        <div className="w-full flex justify-start items-center z-30 pl-2">
            <button onClick={()=>setToggle(true)} className="text-red-500 text-xl cursor-pointer">Delete your account.</button>
        </div>
      </div>


      {/* Description */}
      <div className='w-full gap-2 h-full flex flex-col justify-start items-center border-l-0 md:border-l-1 px-1 text-white pl-4'>
        <div className="w-full flex justify-start items-center text-2xl font-semibold">Description</div>
        <textarea
          placeholder="write your description"
          ref={descRef}
          className="w-full h-full overflow-auto break-all text-lg"
          value={isEditingDesc ? tempDesc : desc.length === 0 ? handleEdit("desc"): desc}
          disabled={!isEditingDesc}
          onChange={(e) => setTempDesc(e.target.value)}
          />
        <div className="w-full h-auto flex justify-end items-center gap-2 py-1">
          {!isEditingDesc ? (
            <button className="text-xl bg-yellow-300 hover:bg-yellow-500 px-2 py-1 rounded-2xl text-black" onClick={() => handleEdit("desc")}>Edit</button>
          ) : (
            <>
              <button className="text-xl bg-yellow-300 hover:bg-yellow-500 px-2 py-1 rounded-2xl text-black" onClick={() => handleCancel("desc")}>Cancel</button>
              <button className="text-xl bg-green-300 hover:bg-green-500 px-2 py-1 rounded-2xl flex justify-center items-center text-black" onClick={() => handleSave("desc")}>
                {descLoader ? <MoonLoader size={20}/> : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className=" text-black mt-4 pl-4 flex sm:hidden justify-start items-center w-full h-auto">
        <button onClick={()=>auth.signOut()} className="bg-gray-300 px-1 rounded-lg flex gap-1">
          Log Out
          <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" stroke-width="0.9120000000000001" stroke-linecap="round" stroke-linejoin="round"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path> <polyline points="16 17 21 12 16 7"></polyline> <line x1="21" y1="12" x2="9" y2="12"></line> </g></svg>
          </button>
      </div>
    </div>
          </>
  )
}

export default Settings;
