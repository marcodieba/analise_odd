// Importa as funções necessárias do SDK do Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Adicione a configuração do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDy6RDgvLihFH0tNtJsl0_H3n6nHPbYl_Q",
  authDomain: "analisador-de-odds-pro.firebaseapp.com",
  projectId: "analisador-de-odds-pro",
  storageBucket: "analisador-de-odds-pro.firebasestorage.app",
  messagingSenderId: "21878356127",
  appId: "1:21878356127:web:90b959e92c7b6c3e1c0aaa",
  measurementId: "G-1KSGQRLRVH"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços que vamos usar na nossa aplicação
export const auth = getAuth(app);
export const db = getFirestore(app);
