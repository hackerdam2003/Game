// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 1. HFC Bank Config (Login & Wallet Balance)
// ==========================================
const hfcBankConfig = {
    apiKey: "AIzaSyDuFOfwTplev2IfpCKfiH1ZxCSKuZaftUk",
    authDomain: "hfc-bank-e2a34.firebaseapp.com",
    projectId: "hfc-bank-e2a34",
    storageBucket: "hfc-bank-e2a34.firebasestorage.app",
    messagingSenderId: "1029449998918",
    appId: "1:1029449998918:web:73babbd06999dbe2f16047"
};

// ==========================================
// 2. Racing Engine Config (Game Rooms & Chat)
// ==========================================
// NEECHE DI GAYI DETAILS KO APNE RACING ENGINE PROJECT SE REPLACE KAREIN
const racingEngineConfig = {
    apiKey: "YOUR_ENGINE_API_KEY",
    authDomain: "racing-universe-engine.firebaseapp.com",
    projectId: "racing-universe-engine",
    storageBucket: "racing-universe-engine.firebasestorage.app", // optional
    messagingSenderId: "YOUR_ENGINE_MESSAGING_ID",
    appId: "YOUR_ENGINE_APP_ID"
};

// Initialize HFC Bank (Primary App)
// (HFC Bank ko hum naam de rahe hain taaki dono mix na hon)
const hfcApp = initializeApp(hfcBankConfig, "HFCBankApp");
const auth = getAuth(hfcApp);
const bankDB = getFirestore(hfcApp);
const provider = new GoogleAuthProvider();

// Initialize Racing Engine (Secondary App)
const engineApp = initializeApp(racingEngineConfig, "RacingEngineApp");
const engineDB = getFirestore(engineApp);

// Dono DBs aur Auth ko export karein taaki game files inhe use kar sakein
export { auth, bankDB, engineDB, provider };
