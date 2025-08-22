import { useEffect, useState } from "react";
import Chat from "./Components/chat/Chat";
import Detail from "./Components/Detail/Detail";
import List from "./Components/List/List";
import Login from "./Components/Login/Login";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, storage } from "./Components/lib/firebase";
import { useUserStore } from "./Components/lib/userStore";
import { useChatStore } from "./Components/lib/chatStore";
import Nothing from "./Components/ui/Nothing";
import Loader from "./Components/ui/Loader";
import Settings from "./Components/Settings/Settings";
import { Routes, Route } from "react-router-dom";

const App = () => {
  const { currentUser, isLoading, fetchUserInfo } = useUserStore();
  const { chatId } = useChatStore();

  const [activeView, setActiveView] = useState("list"); 
  const [activeDetail, setActiveDetail] = useState(""); 

  const screen = activeDetail === "details" ? "detail" : activeView;

  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (user) => {
      fetchUserInfo(user?.uid);
    });
    return () => unSub();
  }, [fetchUserInfo]);

  if (isLoading) return <Loader />;

  return (
    <Routes>
      <Route
        path="/"
        element={
          currentUser ? (
            <div className="w-full h-[100dvh] flex overflow-hidden">
              {/* LIST */}
              <List
                setActiveView={setActiveView}
                className={`
                  transition-transform duration-300 ease-in-out xl:translate-x-0
                  ${screen === "list" ? "translate-x-0" : "-translate-x-full"}
                `}
              />

              {/* CHAT or NOTHING */}
              {chatId ? (
                <Chat
                  setActiveDetail={setActiveDetail}
                  setActiveView={setActiveView}
                  className={`
                    transition-transform duration-300 ease-in-out xl:translate-x-0
                    ${screen === "chat" ? "translate-x-0" : ""}
                    ${screen === "list" ? "translate-x-full" : ""}
                    ${screen === "detail" ? "-translate-x-full" : ""}
                  `}
                />
              ) : (
                <Nothing />
              )}

              {/* DETAIL */}
              {chatId && (
                <Detail
                  setActiveView={setActiveView}
                  setActiveDetail={setActiveDetail}
                  className={`
                    transition-transform duration-300 ease-in-out xl:translate-x-0
                    ${screen === "detail" ? "translate-x-0" : "translate-x-full"}
                  `}
                />
              )}
            </div>
          ) : (
            <Login />
          )
        }
      />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
};


export default App;
