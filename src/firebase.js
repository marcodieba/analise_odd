// src/firebase.js

// Importa as funções necessárias do SDK do Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging"; // Importa o messaging e isSupported

// A configuração do Firebase agora lê as variáveis de ambiente seguras
// do ficheiro .env.local que criámos.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços que vamos usar na nossa aplicação
export const auth = getAuth(app);
export const db = getFirestore(app);

let messaging = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app); // Inicializa o messaging apenas se suportado
  } else {
    console.warn("Firebase Messaging não suportado neste navegador.");
  }
});

export { messaging }; // Exporta o messaging