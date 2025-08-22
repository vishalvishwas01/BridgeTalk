import { CiEdit } from "react-icons/ci";
import { useUserStore } from '../lib/userStore';
import { storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'; // 🔹 added query + getDocs
import { useRef, useState } from "react";
import { MoonLoader } from "react-spinners";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link } from "react-router-dom";

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
  const [avatarLoader, setAvatarLoader] = useState(false);
  const [resetLoader, setResetLoader] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [errorloading, setErrorLoading] = useState(false)

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

  return (
    <div className='h-[100dvh] bg-[#EEDEB3] w-[100dvw] flex flex-col md:flex-row justify-start md:justify-center gap-5 items-center py-5 px-2'>
      <div className='w-full gap-5 h-full flex flex-col justify-start items-center p-2'> 
        <div className="w-full flex justify-between items-center gap-2">
          <div className='rounded-full relative w-50 h-50'>
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
          <Link to="/" className="rounded-2xl px-2 py-1 bg-red-400 hover:bg-red-300 transition-all">Back to home</Link>
        </div>  

        {/* Username */}
        {errorloading && <div className="text-red-500 w-full pl-2">Username/Email already exists</div>}
        <div className="w-full h-auto flex flex-col gap-2">
          <div className="w-full text-start text-xl font-semibold pl-2">Username</div>
          <div className="w-full h-auto flex justify-between items-center gap-2">
            <input
              ref={usernameRef}
              value={isEditingUsername ? tempUsername : username}
              className="bg-gray-400 w-full rounded-2xl text-white text-2xl px-3 py-2"
              disabled={!isEditingUsername}
              onChange={(e) => setTempUsername(e.target.value)}
            />
            {!isEditingUsername ? (
              <button className="text-xl bg-yellow-300 hover:bg-yellow-500 px-2 py-1 rounded-2xl" onClick={() => handleEdit("username")}>Edit</button>
            ) : (
              <>
                <button className="text-xl bg-yellow-300 hover:bg-yellow-500 px-2 py-1 rounded-2xl" onClick={() => handleCancel("username")}>Cancel</button>
                <button className="text-xl bg-green-300 hover:bg-green-500 px-2 py-1 rounded-2xl flex justify-center items-center" onClick={() => handleSave("username")}>
                  {usernameLoader ? <MoonLoader size={20}/> : "Save"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="w-full h-auto flex flex-col gap-2">
          <div className="w-full text-start text-xl font-semibold pl-2">Email</div>
          <div className="w-full h-auto flex justify-between items-center gap-2">
            <input
              ref={emailRef}
              value={isEditingEmail ? tempEmail : email}
              className="bg-gray-400 w-full text-white rounded-2xl text-2xl px-3 py-2"
              disabled={!isEditingEmail}
              onChange={(e) => setTempEmail(e.target.value)}
            />
            {!isEditingEmail ? (
              <button className="text-xl bg-yellow-300 hover:bg-yellow-500 px-2 py-1 rounded-2xl" onClick={() => handleEdit("email")}>Edit</button>
            ) : (
              <>
                <button className="text-xl bg-yellow-300 hover:bg-yellow-500 px-2 py-1 rounded-2xl" onClick={() => handleCancel("email")}>Cancel</button>
                <button className="text-xl bg-green-300 hover:bg-green-500 px-2 py-1 rounded-2xl flex justify-center items-center" onClick={() => handleSave("email")}>
                  {emailLoader ? <MoonLoader size={20}/> : "Save"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Reset Password */}
        <div className="w-full flex justify-start items-center gap-2">
          <div className="text-xl font-semibold">Forgot Password ?</div>
          <button
            className="cursor-pointer text-xl text-red-400 flex items-center gap-2"
            onClick={handlePasswordReset}
            disabled={resetLoader}
          >
            {resetLoader ? <MoonLoader size={20}/> : "Reset"}
          </button>
        </div>
        {resetMessage && <div className="text-sm text-green-600 mt-1">{resetMessage}</div>}
      </div>

      {/* Description */}
      <div className='w-full gap-2 h-full flex flex-col justify-start items-center border-l-0 md:border-l-1 px-1'>
        <div className="w-full flex justify-start items-center text-2xl font-semibold">Description</div>
        <textarea
          ref={descRef}
          className="w-full h-full overflow-auto break-all text-lg"
          value={isEditingDesc ? tempDesc : desc}
          disabled={!isEditingDesc}
          onChange={(e) => setTempDesc(e.target.value)}
        />
        <div className="w-full h-auto flex justify-end items-center gap-2 py-1">
          {!isEditingDesc ? (
            <button className="text-xl bg-yellow-300 hover:bg-yellow-500 px-2 py-1 rounded-2xl" onClick={() => handleEdit("desc")}>Edit</button>
          ) : (
            <>
              <button className="text-xl bg-yellow-300 hover:bg-yellow-500 px-2 py-1 rounded-2xl" onClick={() => handleCancel("desc")}>Cancel</button>
              <button className="text-xl bg-green-300 hover:bg-green-500 px-2 py-1 rounded-2xl flex justify-center items-center" onClick={() => handleSave("desc")}>
                {descLoader ? <MoonLoader size={20}/> : "Save"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings;
