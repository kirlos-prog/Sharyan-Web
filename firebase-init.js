import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBW3KvfjW3QnkfCa9LbtouiJl4_sqzi9Xg",
    authDomain: "sharyan-web.firebaseapp.com",
    projectId: "sharyan-web",
    storageBucket: "sharyan-web.firebasestorage.app",
    messagingSenderId: "385590049253",
    appId: "1:385590049253:web:d062f8dc5a01611610d70c",
    measurementId: "G-BHQ5QT4SY2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Make services available globally for development testing
window.sharyan = {
    app: app,
    auth: auth,
    db: db,
    analytics: analytics
};

console.log("🔥 Sharyan Firebase Connected Successfully!");
