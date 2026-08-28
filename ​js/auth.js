// js/auth.js
import { signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db, provider } from "./firebase-config.js";

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
    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            gpsStatus.innerText = `📍 GPS Locked!`;
            gpsStatus.style.color = "#4ade80"; // Green
            saveProfileBtn.disabled = false;
        },
        (error) => {
            gpsStatus.innerText = "❌ Location required to play!";
            gpsStatus.style.color = "#ff4757"; // Red
        }
    );
}

// 🔐 Google Login Click Handler
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        loginStatus.innerText = "Connecting to HFC Secure Gateway...";
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login Error:", error);
            loginStatus.innerText = "❌ Login Failed. Try again.";
        }
    });
}

// 🔄 Auto-Check: Naya User ya Purana HFC User?
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(userRef);

        // Check if user exists AND has completed game profile
        if (docSnap.exists() && docSnap.data().gameName) {
            loginStatus.innerText = `Welcome back! Wallet: ${docSnap.data().wallet_balance || 0} 🪙`;
            // Redirect to Lobby
            setTimeout(() => { window.location.href = "lobby.html"; }, 1000);
        } else {
            // Naya player hai, ya HFC user hai par Game profile nahi banayi
            loginSection.style.display = 'none';
            profileForm.style.display = 'block';
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
            const userRef = doc(db, "Users", currentUser.uid);
            
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
                // Sirf tabhi 0 karega jab balance pehle se nahi hoga
            }, { merge: true });
            
            // Profile lock hone ke baad HFC wallet initialize (agar naya hai)
            const updatedSnap = await getDoc(userRef);
            if (updatedSnap.data().wallet_balance === undefined) {
                await setDoc(userRef, { wallet_balance: 0, joined: new Date().toISOString() }, { merge: true });
            }

            window.location.href = "lobby.html";
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("❌ Database Error!");
            saveProfileBtn.innerText = "Lock Profile & Enter Lobby";
            saveProfileBtn.disabled = false;
        }
    });
}
