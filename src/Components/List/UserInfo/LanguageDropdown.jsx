import { useState, useRef, useEffect } from "react";

const languages = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
];

export default function LanguageDropdown({ language, handleLanguageChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleSelect = (lang) => {
    handleLanguageChange({ target: { value: lang } }); // mimic select event
    setOpen(false);
  };

  // 🔹 Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative w-36">
      {/* Dropdown Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2 bg-white text-gray-800 font-medium rounded-xl border 
                   border-gray-300 shadow-sm flex justify-between items-center 
                   hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
      >
        {languages.find((l) => l.code === language)?.label || "Select language"}
        <span className="ml-2 text-gray-500">▾</span>
      </button>

      {/* Dropdown Options */}
      {open && (
        <ul className="absolute left-0 mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-200 z-20">
          {languages.map((lang) => (
            <li
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`px-4 py-2 cursor-pointer rounded-lg transition 
                          hover:bg-blue-100 hover:text-blue-700 
                          ${lang.code === language ? "bg-blue-50 font-semibold" : ""}`}
            >
              {lang.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
