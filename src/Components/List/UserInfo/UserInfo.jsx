import React, { useState, useEffect } from "react";
import { useUserStore } from "../../lib/userStore";
import { auth, db } from "../../lib/firebase";
import { Link } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import LanguageDropdown from "./LanguageDropdown";

const UserInfo = () => {
  const { currentUser } = useUserStore();
  const [language, setLanguage] = useState(currentUser?.language || "en");


  useEffect(() => {
    setLanguage(currentUser?.language || "en");
  }, [currentUser]);

   const handleLanguageChange = async (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);

    try {
      await updateDoc(doc(db, "users", currentUser.id), {
        language: newLang,
      });
      window.location.reload();
    } catch (err) {
      console.error("Error updating language:", err);
    }
  };


  return (
    <div
      className="UserInfo w-[100vw] xl:w-auto flex flex-wrap sm:flex-nowrap xl:flex-wrap items-center justify-between py-5 px-2 UserInfoBg gap-5"
      style={{ boxShadow: "8px 8px 6px -4px rgba(0, 0, 0, 0.2)" }}
    >
      <Link
        to="/settings"
        className="user  flex items-center justify-center gap-5 rounded-2xl p-1 hover:bg-gray-300 transition-all cursor-pointer"
      >
        <div className="w-16  xl:w-16 h-16 xl:h-16 flex">

        <img
          className="w-full  h-full rounded-[50%] object-cover"
          src={currentUser?.avatar || "./avatar.svg"}
          alt=""
          onError={(e) => {
            e.currentTarget.src = "./avatar.svg";
          }}
          />
          </div>
        <h2 className="text-white ">{currentUser.username}</h2>
      </Link>

      <div className="flex items-center justify-between gap-5 relative w-auto sm:w-full xl:w-auto">
        <LanguageDropdown language={language} handleLanguageChange={handleLanguageChange}/>
        <button
          onClick={() => auth.signOut()}
          className="text-gray-300 cursor-pointer hover:text-gray-200 transition-colors hidden sm:flex"
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default UserInfo;
