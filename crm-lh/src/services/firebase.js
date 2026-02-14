import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // 1. Importamos la función getAuth

// Mantené tu propia configuración aquí
const firebaseConfig = {
  apiKey: "AIzaSyDYswtdpqFifuy7jQzzXqv7y62BoR5oFjY",
  authDomain: "crm-lh-e27c4.firebaseapp.com",
  projectId: "crm-lh-e27c4",
  storageBucket: "crm-lh-e27c4.firebasestorage.app",
  messagingSenderId: "721434097399",
  appId: "1:721434097399:web:fb384da5cd7feae87bc5f2",
  measurementId: "G-HK0FX7VNCS"
};

// Inicializamos la aplicación de Firebase
const app = initializeApp(firebaseConfig);

// 2. Inicializamos los servicios que vamos a usar
const db = getFirestore(app);
const auth = getAuth(app); // Creamos la instancia de autenticación

// 3. Exportamos ambos servicios para que puedan ser usados en otros archivos
export { db, auth };