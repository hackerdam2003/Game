import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const hfcBankConfig = {
    apiKey: "AIzaSyDuFOfwTplev2IfpCKfiH1ZxCSKuZaftUk",
    authDomain: "hfc-bank-e2a34.firebaseapp.com",
    projectId: "hfc-bank-e2a34",
    storageBucket: "hfc-bank-e2a34.firebasestorage.app",
    messagingSenderId: "1029449998918",
    appId: "1:1029449998918:web:73babbd06999dbe2f16047"
};

const racingEngineConfig = {
    apiKey: "AIzaSyCuYPugV4qIsu9ZT9E5l63bFLgIbte_S8I",
    authDomain: "racing-universe-engine.firebaseapp.com",
    projectId: "racing-universe-engine",
    storageBucket: "racing-universe-engine.firebasestorage.app",
    messagingSenderId: "572638328716",
    appId: "1:572638328716:web:830bd01db1fa5b45d948a9",
    measurementId: "G-4VYPKBPD4K"
};

const hfcApp = initializeApp(hfcBankConfig, "HFCBankApp");
const auth = getAuth(hfcApp);
const bankDB = getFirestore(hfcApp);
const provider = new GoogleAuthProvider();

const engineApp = initializeApp(racingEngineConfig, "RacingEngineApp");
const engineDB = getFirestore(engineApp);

export { auth, bankDB, engineDB, provider };
