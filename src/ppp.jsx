import { useEffect, useState } from "react";
import Chat from "./Components/chat/Chat";
import Detail from "./Components/Detail/Detail";
import List from "./Components/List/List";
import Login from './Components/Login/Login'
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, storage } from './Components/lib/firebase';
import { useUserStore } from "./Components/lib/userStore";
import { useChatStore } from "./Components/lib/chatStore";
import Nothing from "./Components/ui/Nothing";
import Loader from "./Components/ui/Loader"
import Settings from "./Components/Settings/Settings";
import { Routes, Route } from "react-router-dom";

const App = () => {
  const { currentUser, isLoading, fetchUserInfo } = useUserStore();
  const { chatId } = useChatStore();

  const [activeView, setActiveView] = useState("list"); // "list" | "chat"

  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (user) => {
      fetchUserInfo(user?.uid);
    });
    return () => {
      unSub();
    };
  }, [fetchUserInfo]);

  if (isLoading) return <div><Loader/></div>;

  return (
    <Routes>
      <Route
        path="/"
        element={
          currentUser ? (
            <div className="w-full h-[100dvh] flex">
              {/*  LIST visible only if no chatId OR activeView=list (below xl) */}
              <div className={`${activeView === "chat" ? "hidden" : "flex"} xl:flex`}>
                <List setActiveView={setActiveView} />
              </div>

              {/*  CHAT visible only if chatId exists */}
              {chatId && (
                <div className={`${activeView === "list" ? "hidden xl:flex" : "flex"} flex-1`}>
                  <Chat setActiveView={setActiveView} />
                </div>
              )}

              {/*  DETAIL stays same (you’ll hide it later yourself) */}
              {chatId && <Detail />}
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

export default App