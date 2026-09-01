// js/auth.js
import { signInWithRedirect, getRedirectResult, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db, provider } from "./firebase-config.js"; // Make sure firebase-config exports 'db'

let currentUser = null;

// Index (Login) Page Elements
const loginBtn = document.getElementById('googleLoginBtn');
const loginStatus = document.getElementById('loginStatus');

// Profile Page Elements
const displayNameDisplay = document.getElementById('displayNameDisplay');
const genderSelect = document.getElementById('genderSelect');
const locationInput = document.getElementById('locationInput');
const dobInput = document.getElementById('dobInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');

// 1. Google Login Button Click
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        if(loginStatus) loginStatus.innerText = "Redirecting to Google...";
        signInWithRedirect(auth, provider);
    });
}

// 2. Handle Login Errors
getRedirectResult(auth).catch((error) => {
    if(loginStatus) loginStatus.innerText = "❌ Login Error: " + error.message;
});

// 3. Central Authentication Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        // Agar Profile page par hain, toh locked name show karein
        if (displayNameDisplay) {
            displayNameDisplay.innerText = user.displayName || "Racer";
        }

        if(loginStatus) loginStatus.innerText = "Checking User Database...";
        
        try {
            const userRef = doc(db, "Users", user.uid);
            const docSnap = await getDoc(userRef);

            // Agar user ka data aur numeric UID pehle se hai
            if (docSnap.exists() && docSnap.data().playerTag) {
                if(loginStatus) loginStatus.innerText = `Welcome back, ${docSnap.data().gameName}!`;
                // Infinite redirect loop rokne ke liye current URL check
                if (!window.location.href.includes("lobby.html") && window.location.href.includes("index.html")) {
                    setTimeout(() => { window.location.href = "lobby.html"; }, 1000);
                }
            } else {
                // Agar profile incomplete hai
                if (!window.location.href.includes("profile.html") && window.location.href.includes("index.html")) {
                    window.location.href = "profile.html";
                }
            }
        } catch (err) {
            if(loginStatus) loginStatus.innerText = "❌ Database Error: " + err.message;
        }
    } else {
        // User logged out hai, agar private page par hai toh bahar phek do
        if (window.location.href.includes("profile.html") || window.location.href.includes("lobby.html")) {
            window.location.href = "index.html";
        }
    }
});

// 4. Save Profile Form Submission
if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
        if (!currentUser) return;

        const gender = genderSelect ? genderSelect.value : null;
        const location = locationInput ? locationInput.value.trim() : null;
        const dob = dobInput ? dobInput.value : null;

        if (!gender || !location || !dob) {
            alert("Please fill in Gender, Location, and Date of Birth.");
            return;
        }

        // DOB se Exact Age Calculate karna
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        saveProfileBtn.innerText = "Locking Profile & Syncing...";
        saveProfileBtn.disabled = true;

        // 8-Digit Numeric UID Generator (playerTag)
        const numericUID = Math.floor(10000000 + Math.random() * 90000000).toString();

        try {
            const userRef = doc(db, "Users", currentUser.uid);
            
            await setDoc(userRef, {
                name: currentUser.displayName,
                email: currentUser.email,
                gameName: currentUser.displayName, 
                gender: gender,
                location: location,
                dob: dob,
                age: age,
                playerTag: numericUID,
                wallet_balance: 0,
                role: "player",
                joined: new Date().toISOString()
            }, { merge: true });
            
            window.location.href = "lobby.html";
        } catch (error) {
            alert("❌ Database Error! Security Blocked the request.");
            saveProfileBtn.innerText = "Lock Profile & Enter Lobby";
            saveProfileBtn.disabled = false;
        }
    });
}

