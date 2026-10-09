

// firebase.tsx or firebase.js
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";



const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};
const app = initializeApp(firebaseConfig);

// const app = initializeApp(firebaseConfig);

export const messaging = getMessaging(app);

export const generateToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Permission not granted");
    }

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    // console.log("Service Worker registered:", registration);
    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (token) {
      // console.log("FCM Token:", token);
      sessionStorage.setItem("fcmToken", token);
    } else {
      console.warn("No token received. Ensure notifications are allowed.");
    }
    // console.log("Token:", token);
    return token;
  } catch (err) {
    // console.error("Error requesting notification permission:", err);
  }
};


export const onForegroundMessage = () => {
  onMessage(messaging, (payload: any) => {
    // console.log("Message received in foreground:", payload);
    // Handle notification display or other logic here
    alert(`New Notification: ${payload.notification?.title}`);
  });
};

