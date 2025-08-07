// Import and configure the Firebase SDK
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// Sua configuração do Firebase que já tem no seu projeto
const firebaseConfig = {
  apiKey: "AIzaSyDy6RDgvLihFH0tNtJsl0_H3n6nHPbYl_Q",
  authDomain: "analisador-de-odds-pro.firebaseapp.com",
  projectId: "analisador-de-odds-pro",
  storageBucket: "analisador-de-odds-pro.firebasestorage.app",
  messagingSenderId: "21878356127",
  appId: "1:21878356127:web:90b959e92c7b6c3e1c0aaa",
  measurementId: "G-1KSGQRLRVH"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg' // Ou o ícone da sua aplicação
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});