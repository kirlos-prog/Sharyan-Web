// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, getDoc, updateDoc, addDoc, increment } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// Init from Global or Window
const db = window.sharyan.db;

// ------ AUTH GUARD ------
document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('sharyan_user');
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(session);
    const allowedRoles = ['admin', 'staff', 'doctor', 'receptionist'];
    if (!allowedRoles.includes(user.role)) {
        alert("Access Denied: You do not have permission to view the Command Center.");
        window.location.href = 'index.html';
        return;
    }

    // Initialize Views
    initializeInventoryListener();
    initializeScanner();
    initializeCharts();
});

// ------ NAVIGATION ------
window.showView = (viewName) => {
    // Hide all sections
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); // Reset nav

    // Show target
    document.getElementById(`view-${viewName}`).classList.add('active');

    // Highlight nav
    // (Simple implementation, ideally match button ID)
};

window.logout = () => {
    localStorage.removeItem('sharyan_user');
    window.location.href = 'login.html';
};

// ------ INVENTORY CONTROL ------
function initializeInventoryListener() {
    const inventoryRef = collection(db, "inventory");
    onSnapshot(inventoryRef, (snapshot) => {
        const grid = document.getElementById('admin-inventory-grid');
        grid.innerHTML = ''; // Clear

        snapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = `stat-card ${data.status === 'critical' ? 'critical' : ''}`;
            card.innerHTML = `
                <h3>${data.type}</h3>
                <div class="value">${data.units} <span style="font-size: 14px; color: #94a3b8">Bags</span></div>
                <div class="trend" style="color: ${data.status === 'good' ? '#10b981' : '#dc2626'}">
                    ${data.status.toUpperCase()}
                </div>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button onclick="updateStock('${doc.id}', 1)" style="flex:1; background: #e2e8f0; border:none; padding: 5px; cursor: pointer; border-radius: 4px;">+</button>
                    <button onclick="updateStock('${doc.id}', -1)" style="flex:1; background: #e2e8f0; border:none; padding: 5px; cursor: pointer; border-radius: 4px;">-</button>
                </div>
            `;
            grid.appendChild(card);
        });
    });
}

window.updateStock = async (id, change) => {
    const ref = doc(db, "inventory", id);
    await updateDoc(ref, {
        units: increment(change),
        lastUpdated: new Date()
    });
};


// ------ SMART SCANNER ------
let html5QrcodeScanner;

function initializeScanner() {
    // Only init when tab is shown to save camera
    // For demo, we just create the object
}

// Function triggered when "Start Camera" is requested (or automatically)
function startScanner() {
    const onScanSuccess = async (decodedText, decodedResult) => {
        // Handle the scanned code
        console.log(`Scan result: ${decodedText}`);

        // Stop scanning
        // html5QrcodeScanner.clear();

        // Parse User ID from "Sharyan-User-12345"
        // For demo: we expect just the ID or the full string
        let userId = decodedText.replace('Sharyan-User-', '');

        // Fetch User Data from Firestore
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const user = userSnap.data();
            showScanResult(user, userId);
        } else {
            alert("User not found in database!");
        }
    };

    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader", { fps: 10, qrbox: 250 });
    html5QrcodeScanner.render(onScanSuccess);
}

function showScanResult(user, id) {
    document.getElementById('scan-result').style.display = 'block';

    document.getElementById('donor-name').textContent = user.name;
    document.getElementById('donor-id').textContent = `ID: ${user.civilId}`;
    document.getElementById('donor-blood').textContent = user.bloodType;

    // Eligibility Logic (Simulated 90 days)
    const lastDonate = user.lastDonation?.toDate() || null;
    let eligible = true;
    if (lastDonate) {
        document.getElementById('donor-last-date').textContent = lastDonate.toLocaleDateString();
        // Check days
        const diff = (new Date() - lastDonate) / (1000 * 60 * 60 * 24);
        if (diff < 90) eligible = false;
    } else {
        document.getElementById('donor-last-date').textContent = "Never";
    }

    const statusEl = document.getElementById('donor-status');
    if (eligible) {
        statusEl.textContent = "ELIGIBLE ✅";
        statusEl.className = "status-tag success";
        statusEl.style.background = "#dcfce7";
        statusEl.style.color = "#166534";
    } else {
        statusEl.textContent = "WAITING PERIOD ⏳";
        statusEl.className = "status-tag warning";
        statusEl.style.background = "#fef9c3";
        statusEl.style.color = "#854d0e";
    }
}

window.confirmDonation = async () => {
    const id = document.getElementById('donor-id').textContent.replace('ID: ', '');
    // In production, we'd have the ID stored in a variable
    alert(`Donation Confirmed for ID: ${id}. Inventory updating...`);

    // 1. Update Inventory
    // (Need to know blood type)
    // 2. Update User Last Donation

    document.getElementById('scan-result').style.display = 'none';
};


// ------ ANALYTICS ------
function initializeCharts() {
    const ctx1 = document.getElementById('donationChart').getContext('2d');
    new Chart(ctx1, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Donations',
                data: [12, 19, 3, 5, 2, 3, 12],
                borderColor: '#dc2626',
                tension: 0.4
            }]
        }
    });

    const ctx2 = document.getElementById('inventoryChart').getContext('2d');
    new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: ['A+', 'O+', 'B+', 'Others'],
            datasets: [{
                data: [30, 50, 20, 10],
                backgroundColor: ['#ef4444', '#f97316', '#3b82f6', '#94a3b8']
            }]
        }
    });
}

// ------ STAFF MANAGEMENT ------

window.handleAddStaff = async (e) => {
    e.preventDefault();
    const form = e.target;

    // Get form data
    const name = form.name.value;
    const civilId = form.id.value;
    const password = form.password.value;
    const role = form.role.value;

    try {
        const { setDoc, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");

        // Check if exists first
        const userRef = doc(db, "users", civilId);
        const exists = await getDoc(userRef);

        if (exists.exists()) {
            alert("This ID is already registered!");
            return;
        }

        // Create Staff User
        await setDoc(userRef, {
            name: name,
            civilId: civilId,
            password: password, // In production, use Firebase Auth email/pass!
            role: role,
            createdAt: new Date(),
            managedBy: "admin"
        });

        alert(`Success! ${name} has been added as ${role}.`);
        form.reset();
        loadStaffList(); // Refresh list

    } catch (error) {
        console.error("Error adding staff:", error);
        alert("Error saving staff to database.");
    }
};

async function loadStaffList() {
    const listContainer = document.getElementById('staff-list-container');
    if (!listContainer) return;

    try {
        const { collection, getDocs, query, where, deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");

        // Query for staff roles. Note: Requires Index in Firestore if combining == and in
        // Simplified query: get all users and filter client side for demo if index missing
        const q = query(collection(db, "users"), where("role", "in", ["admin", "staff", "doctor", "receptionist"]));

        let querySnapshot;
        try {
            querySnapshot = await getDocs(q);
        } catch (idxError) {
            console.warn("Index missing for role query. Fetching all users (inefficient but works for demo).");
            const all = await getDocs(collection(db, "users"));
            // Manually filter
            const filtered = [];
            all.forEach(d => {
                const data = d.data();
                if (['admin', 'staff', 'doctor', 'receptionist'].includes(data.role)) filtered.push(d);
            });
            // Mock snapshot behavior
            querySnapshot = { empty: filtered.length === 0, forEach: (cb) => filtered.forEach(cb) };
        }

        listContainer.innerHTML = ''; // Clear

        if (querySnapshot.empty) {
            listContainer.innerHTML = '<p>No staff found.</p>';
            return;
        }

        querySnapshot.forEach((userDoc) => {
            const data = userDoc.data();
            const el = document.createElement('div');
            el.style.borderBottom = "1px solid #eee";
            el.style.padding = "10px 0";
            el.style.display = "flex";
            el.style.justifyContent = "space-between";
            el.style.alignItems = "center";

            el.innerHTML = `
                <div>
                    <div style="font-weight:bold;">${data.name}</div>
                    <div style="font-size:12px; color:#64748b;">${data.role.toUpperCase()} • ID: ${data.civilId}</div>
                    <div style="font-size:10px; color:#cbd5e1;">Pass: ${data.password}</div>
                </div>
                <button onclick="deleteStaff('${userDoc.id}')" style="background:#fee2e2; color:#dc2626; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
            `;
            listContainer.appendChild(el);
        });

    } catch (error) {
        console.error("Error loading staff:", error);
        listContainer.innerHTML = '<p style="color:red">Error loading list.</p>';
    }
}

window.deleteStaff = async (id) => {
    if (confirm("Are you sure you want to remove this staff access?")) {
        const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
        await deleteDoc(doc(db, 'users', id));
        loadStaffList();
    }
};

// Hook into showView to load list when staff tab is opened
const originalShowView = window.showView;
window.showView = (viewName) => {
    originalShowView(viewName);
    if (viewName === 'staff') {
        loadStaffList();
    }
};
