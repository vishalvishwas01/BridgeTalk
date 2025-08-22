import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";

const upload = (file, onProgress) => {
  const date = new Date();
  const storageRef = ref(storage, `images/${date.getTime()}-${file.name}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(Math.floor(progress)); // 🔥 send % back to caller
      },
      (error) => {
        reject("Something went wrong: " + error.code);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};

export default upload;
