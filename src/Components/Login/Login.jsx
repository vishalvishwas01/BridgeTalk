import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";
import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import upload from '../lib/upload';
import { ToastContainer, toast } from 'react-toastify';
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { cn } from "../lib/utils";
import { ClipLoader } from 'react-spinners';
import { useNavigate } from "react-router-dom";
import { useUserStore } from '../lib/userStore';

//  Helper function to check for existing username or email
const checkUserExists = async (username, email) => {
  const usersRef = collection(db, "users");

  // check username
  const usernameQuery = query(usersRef, where("username", "==", username));
  const usernameSnap = await getDocs(usernameQuery);
  if (!usernameSnap.empty) {
    return { exists: true, field: "username" };
  }

  // check email
  const emailQuery = query(usersRef, where("email", "==", email));
  const emailSnap = await getDocs(emailQuery);
  if (!emailSnap.empty) {
    return { exists: true, field: "email" };
  }

  return { exists: false };
};

export function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { currentUser, fetchUserInfo } = useUserStore();
  const [registerActive, setRegisterActive] = useState(false);
  const [avatar, setAvatar] = useState({ file: null, url: "" });
  const [googleUsername, setGoogleUsername] = useState("");
  const [googleUser, setGoogleUser] = useState(null);

  const handleAvatar = (e) => {
    if (e.target.files[0]) {
      setAvatar({
        file: e.target.files[0],
        url: URL.createObjectURL(e.target.files[0]),
      });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const { email, password } = Object.fromEntries(formData);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Logged in successfully");
    } catch (err) {
      console.log(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const { username, email, password } = Object.fromEntries(formData);
    setLoading(true);

    try {
      //  Check if username/email already exist
      const { exists, field } = await checkUserExists(username, email);
      if (exists) {
        toast.error(`${field} already exists`);
        setLoading(false);
        return;
      }

      const res = await createUserWithEmailAndPassword(auth, email, password);
      const imgUrl = avatar.file ? await upload(avatar.file) : "./avatar.svg";

      await setDoc(doc(db, "users", res.user.uid), {
        username,
        email,
        avatar: imgUrl,
        id: res.user.uid,
        blocked: [],
      });

      await setDoc(doc(db, "userchats", res.user.uid), { chats: [] });

      toast.success("Account created");
    } catch (err) {
      console.log(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  //  Google Sign In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await fetchUserInfo(user.uid);

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        toast.success("Logged in with Google");
      } else {
        // new user — ask for username
        setGoogleUser(user);
        toast.info("Please set a username to complete signup");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  //  Complete Google Signup with username
  const handleGoogleRegister = async (e) => {
    e.preventDefault();
    if (!googleUser) return;

    setLoading(true);
    try {
      //  Check if username/email already exist
      const { exists, field } = await checkUserExists(googleUsername, googleUser.email);
      if (exists) {
        toast.error(`${field} already exists`);
        setLoading(false);
        return;
      }

      await setDoc(doc(db, "users", googleUser.uid), {
        username: googleUsername,
        email: googleUser.email,
        avatar: "./avatar.svg",
        id: googleUser.uid,
        blocked: [],
      });

      await setDoc(doc(db, "userchats", googleUser.uid), { chats: [] });

      toast.success("Google account linked & registered");
      setGoogleUser(null);
      setGoogleUsername("");
      window.location.reload();
    } catch (err) {
      console.log(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Redirect to home when user logs in
  useEffect(() => {
    if (currentUser) {
      navigate("/");
    }
  }, [currentUser, navigate]);

  return (
    <>
      <div className="absolute top-0 z-[-2] h-screen w-screen bg-[#000000] bg-[radial-gradient(#ffffff33_1px,#00091d_1px)] bg-[size:20px_20px]"></div>
      <div className="w-screen h-screen flex flex-col justify-center items-center gap-10">
        <div className="shadow-input mx-auto w-full max-w-md rounded-none bg-white p-4 md:rounded-2xl md:p-8 dark:bg-black">
          <AnimatePresence>
            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
              {registerActive ? "Register Now" : "Log In"}
            </h2>

            {!registerActive ? (
              <motion.form
                onSubmit={handleLogin}
                key="login"
                className="my-8"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <LabelInputContainer className="mb-4">
                  <Label className="text-[16px]">Email Address</Label>
                  <Input id="email" name="email" type="email" className="text-[16px]" placeholder="email@gmail.com" required  />
                </LabelInputContainer>

                <LabelInputContainer>
                  <Label className="text-[16px]">Password</Label>
                  <Input id="password" name="password" type="password" placeholder="Enter your password" className="text-[16px]" />
                </LabelInputContainer>

                <button
                  disabled={loading}
                  className="relative mt-6 block h-10 w-full rounded-md bg-black text-white"
                  type="submit"
                >
                  {loading ? <ClipLoader color="#fff" size={20} /> : "Log In"}
                </button>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="relative mt-3 block h-10 w-full rounded-md bg-red-500 text-white"
                >
                  {loading ? <ClipLoader color="#fff" size={20} /> : "Sign in with Google"}
                </button>
              </motion.form>
            ) : (
              <motion.form
                onSubmit={handleRegister}
                key="register"
                className="my-8"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-full pb-5">
                  <div className="w-40 h-40 p-1 rounded-full border-2 border-white flex justify-center items-center">
                    <label htmlFor="file" className="cursor-pointer h-full w-full">
                      <input
                        className="hidden"
                        type="file"
                        id="file"
                        onChange={handleAvatar}
                      />
                      <img
                        className="object-cover w-full h-full rounded-full"
                        src={avatar.url || "./avatar.svg"}
                        alt=""
                      />
                    </label>
                  </div>
                </div>

                <LabelInputContainer className="mb-4">
                  <Label className="text-[16px]">Username</Label>
                  <Input name="username" type="text" className="text-[16px]" placeholder="username" required />
                </LabelInputContainer>

                <LabelInputContainer className="mb-4">
                  <Label className="text-[16px]">Email Address</Label>
                  <Input name="email" type="email" className="text-[16px]" placeholder="email@gmail.com" required />
                </LabelInputContainer>

                <LabelInputContainer>
                  <Label className="text-[16px]">Password</Label>
                  <Input name="password" type="password" className="text-[16px]" placeholder="Enter your password" />
                </LabelInputContainer>

                <button
                  disabled={loading}
                  className="relative mt-6 block h-10 w-full rounded-md bg-black text-white"
                  type="submit"
                >
                  {loading ? <ClipLoader color="#fff" size={20} /> : "Register"}
                </button>
              </motion.form>
            )}

            {/* Username prompt for Google new users */}
            {googleUser && (
              <motion.form
                onSubmit={handleGoogleRegister}
                className="my-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <LabelInputContainer>
                  <Label className="text-[16px]">Set a Username</Label>
                  <Input
                    value={googleUsername}
                    onChange={(e) => setGoogleUsername(e.target.value)}
                    placeholder="Choose a username"
                    required
                    className="text-[16px]"
                  />
                </LabelInputContainer>

                <button
                  type="submit"
                  disabled={loading || !googleUsername}
                  className="relative mt-3 block h-10 w-full rounded-md bg-green-600 text-white"
                >
                  {loading ? <ClipLoader color="#fff" size={20} /> : "Finish Google Signup"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="w-full text-white mt-4">
            {registerActive ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setRegisterActive(!registerActive)} className="text-blue-400">
              {registerActive ? "Login" : "Register Now"}
            </button>
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}

const LabelInputContainer = ({ children, className }) => {
  return <div className={cn("flex w-full flex-col space-y-2", className)}>{children}</div>;
};

export default Login;
