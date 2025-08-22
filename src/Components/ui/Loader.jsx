import { useEffect, useState } from "react";

const Loader = ({ progress }) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Smooth animation when progress updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedProgress((prev) => {
        if (prev < progress) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 10); // speed of animation
    return () => clearInterval(interval);
  }, [progress]);

  return (
    <div className="flex flex-col items-center justify-start w-screen h-screen bg-gray-500 text-white gap-5">

      <div className="flex h-auto w-100"><img className="w-full h-full object-cover" src="./BridgeTalk.png"/></div>
      {/* Spinner */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 border-4 border-gray-600 rounded-full"></div>
        <div
          className="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"
          style={{ animationDuration: "1s" }}
        ></div>
      </div>

      <div className="text-sm text-gray-300">Loading your chats...</div>
    </div>
  );
};

export default Loader;
