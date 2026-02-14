import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// Your Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBW3KvfjW3QnkfCa9LbtouiJl4_sqzi9Xg",
    authDomain: "sharyan-web.firebaseapp.com",
    projectId: "sharyan-web",
    storageBucket: "sharyan-web.firebasestorage.app",
    messagingSenderId: "385590049253",
    appId: "1:385590049253:web:d062f8dc5a01611610d70c",
    measurementId: "G-BHQ5QT4SY2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initial Inventory Data
const inventoryData = [
    { type: 'A+', units: 145, capacity: 200, status: 'good' },
    { type: 'A-', units: 32, capacity: 100, status: 'low' },
    { type: 'B+', units: 118, capacity: 180, status: 'good' },
    { type: 'B-', units: 18, capacity: 80, status: 'critical' },
    { type: 'AB+', units: 67, capacity: 120, status: 'good' },
    { type: 'AB-', units: 12, capacity: 60, status: 'critical' },
    { type: 'O+', units: 178, capacity: 250, status: 'good' },
    { type: 'O-', units: 24, capacity: 100, status: 'low' }
];

async function seedDatabase() {
    console.log("🚀 Starting Database Seeding...");
    const batch = writeBatch(db);

    inventoryData.forEach((blood) => {
        // Create a document reference for each blood type
        // e.g. inventory/A_POS
        const docId = blood.type.replace('+', '_POS').replace('-', '_NEG');
        const docRef = doc(db, "inventory", docId);

        batch.set(docRef, {
            type: blood.type,
            units: blood.units,
            capacity: blood.capacity,
            status: blood.status,
            lastUpdated: new Date()
        });
    });

    try {
        await batch.commit();
        console.log("✅ Database successfully populated with Blood Types!");
        alert("Success! Database populated. You can now delete this file or button.");
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        alert("Error: " + error.message);
    }
}

// Make it available to call from console or button
window.seedDatabase = seedDatabase;
