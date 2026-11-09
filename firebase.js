// ============================================
// BARBERBOT - FIREBASE
// Barbearia Fio de Ouro
// ============================================


// 1. Importar Firebase
import { initializeApp } from
"https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";


// 2. Importar funções do Firestore
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp
} from
"https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";


// 3. Importar funções de autenticação
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from
"https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";


// 4. Configuração do projeto
const firebaseConfig = {
    apiKey: "AIzaSyBc_-WNf2zVOqEtLtEWDe0bVycXFN__H_8",
    authDomain: "barbearia-fio-de-ouro-bc4ab.firebaseapp.com",
    projectId: "barbearia-fio-de-ouro-bc4ab",
    storageBucket: "barbearia-fio-de-ouro-bc4ab.firebasestorage.app",
    messagingSenderId: "175658861713",
    appId: "1:175658861713:web:da58087f9bef789e7eeb30"
};


// 5. Inicializar Firebase
const app = initializeApp(firebaseConfig);


// 6. Inicializar banco de dados
export const db = getFirestore(app);


// 7. Inicializar autenticação
export const auth = getAuth(app);


// 8. Exportar funções do Firestore
export {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp
};


// 9. Exportar funções de autenticação
export {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
};


// 10. Teste de inicialização
console.log("BarberBot conectado ao Firebase!");
