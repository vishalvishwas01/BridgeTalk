import React, { useState, useEffect } from "react";
import { useUserStore } from "../../lib/userStore";
import { auth, db } from "../../lib/firebase";
import { Link } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";

const UserInfo = () => {
  const { currentUser, updateCurrentUserField } = useUserStore();
  const [language, setLanguage] = useState(currentUser?.language || "en");
  const [languages, setLanguages] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  // Fetch all available languages from your LibreTranslate server
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await fetch("https://libretranslate-ztry.onrender.com/languages");
        const data = await res.json();
        setLanguages(data);
      } catch (err) {
        console.error("Error fetching languages:", err);
      }
    };
    fetchLanguages();
  }, []);

  const handleLanguageChange = async (selectedLang) => {
    setLanguage(selectedLang);

    // Save preference in Firestore
    const userRef = doc(db, "users", currentUser.id);
    await updateDoc(userRef, { language: selectedLang });

    // Update in Zustand
    updateCurrentUserField({ ...currentUser, language: selectedLang });
    setOpen(false); // close dropdown
  };

  const filteredLanguages = languages.filter((lang) =>
    lang.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="UserInfo flex items-center justify-between py-5 px-2 UserInfoBg gap-10"
      style={{ boxShadow: "8px 8px 6px -4px rgba(0, 0, 0, 0.2)" }}
    >
      <Link
        to="/settings"
        className="user flex items-center justify-center gap-5 rounded-2xl p-1 hover:bg-gray-300 transition-all cursor-pointer"
      >
        <img
          className="w-12 h-12 rounded-[50%] object-cover"
          src={currentUser?.avatar || "./avatar.svg"}
          alt=""
          onError={(e) => {
            e.currentTarget.src = "./avatar.svg";
          }}
        />
        <h2 className="text-white">{currentUser.username}</h2>
      </Link>

      <div className="flex items-center gap-5 relative">
        {/* Searchable Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="rounded-lg px-3 py-1 bg-gray-700 text-white min-w-[150px] text-left"
          >
            {languages.find((l) => l.code === language)?.name || "Select language"}
          </button>

          {open && (
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg z-50">
              {/* Search Bar */}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search language..."
                className="w-full p-2 border-b border-gray-300 outline-none"
              />

              {/* Scrollable List */}
              <div className="max-h-48 overflow-y-auto">
                {filteredLanguages.map((lang) => (
                  <div
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-200 ${
                      lang.code === language ? "bg-gray-100 font-semibold" : ""
                    }`}
                  >
                    {lang.name}
                  </div>
                ))}

                {filteredLanguages.length === 0 && (
                  <div className="p-3 text-gray-400">No results</div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => auth.signOut()}
          className="text-gray-300 cursor-pointer hover:text-gray-200 transition-colors"
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default UserInfo;
