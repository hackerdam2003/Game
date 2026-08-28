// js/auth.js
import { signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// Yahan dhyan dein: Humne sirf 'bankDB' import kiya hai, kyunki paisa aur profile wahi rahega
import { auth, bankDB, provider } from "./firebase-config.js";

let userLocation = null;
let currentUser = null;

// UI Elements
const loginBtn = document.getElementById('googleLoginBtn');
const loginSection = document.getElementById('loginSection');
const profileForm = document.getElementById('profileForm');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const gpsStatus = document.getElementById('gpsStatus');
const loginStatus = document.getElementById('loginStatus');

// 📍 Fetch Location Logic
function fetchLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                if(gpsStatus) {
                    gpsStatus.innerText = `📍 GPS Locked!`;
                    gpsStatus.style.color = "#4ade80"; // Green
                }
                if(saveProfileBtn) saveProfileBtn.disabled = false;
            },
            (error) => {
                if(gpsStatus) {
                    gpsStatus.innerText = "❌ Location required to play!";
                    gpsStatus.style.color = "#ff4757"; // Red
                }
            }
        );
    } else {
        if(gpsStatus) gpsStatus.innerText = "❌ GPS not supported on this device!";
    }
}

// 🔐 Google Login Click Handler
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        if(loginStatus) loginStatus.innerText = "Connecting to HFC Secure Gateway...";
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login Error:", error);
            if(loginStatus) loginStatus.innerText = "❌ Login Failed. Try again.";
        }
    });
}

// 🔄 Auto-Check: Naya User ya Purana HFC User?
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        // User profile hamesha HFC Bank me check hogi
        const userRef = doc(bankDB, "Users", user.uid);
        const docSnap = await getDoc(userRef);

        // Check if user exists AND has completed game profile
        if (docSnap.exists() && docSnap.data().gameName) {
            if(loginStatus) loginStatus.innerText = `Welcome back! Wallet: 🪙 ${docSnap.data().wallet_balance || 0}`;
            // Redirect to Lobby
            setTimeout(() => { window.location.href = "lobby.html"; }, 1000);
        } else {
            // Naya player hai, ya HFC user hai par Game profile nahi banayi
            if(loginSection) loginSection.style.display = 'none';
            if(profileForm) profileForm.style.display = 'block';
            fetchLocation();
        }
    }
});

// 💾 Save Permanent Game Profile (Merge with HFC Wallet)
if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
        const gameName = document.getElementById('gameName').value;
        const gender = document.getElementById('genderSelect').value;
        const age = document.getElementById('ageInput').value;

        if (!gameName || !age || !userLocation) {
            alert("Please fill all details and allow GPS!");
            return;
        }

        saveProfileBtn.innerText = "Locking Profile & Syncing HFC...";
        saveProfileBtn.disabled = true;

        try {
            // HFC Bank me data save karenge
            const userRef = doc(bankDB, "Users", currentUser.uid);
            
            // { merge: true } lagaya hai taaki agar purana HFC store ka paisa ho, toh wo delete na ho jaye!
            await setDoc(userRef, {
                name: currentUser.displayName,
                email: currentUser.email,
                gameName: gameName,
                gender: gender,
                age: parseInt(age),
                location: userLocation,
                vehicle: "Padal", // Default vehicle
                role: "customer", // Default role
            }, { merge: true });
            
            // Profile lock hone ke baad HFC wallet initialize (agar naya user hai jiska balance exist nahi karta)
            const updatedSnap = await getDoc(userRef);
            if (updatedSnap.data().wallet_balance === undefined) {
                // Strict rules bypass nahi honge kyunki balance 0 se initiate ho raha hai
                await setDoc(userRef, { wallet_balance: 0, joined: new Date().toISOString() }, { merge: true });
            }

            window.location.href = "lobby.html";
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("❌ Database Error! HFC Security Blocked the request.");
            saveProfileBtn.innerText = "Lock Profile & Enter Lobby";
            saveProfileBtn.disabled = false;
        }
    });
}
