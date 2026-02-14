// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, getDoc, updateDoc, addDoc, increment } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// Init from Global or Window
const db = window.sharyan.db;

// ------ AUTH GUARD ------
document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('sharyan_user');
    if (!session) {
        window.location.href = 'staff-portal.html';
        return;
    }
    const user = JSON.parse(session);
    const allowedRoles = ['admin', 'staff', 'doctor', 'receptionist'];

    if (!allowedRoles.includes(user.role)) {
        alert("Access Denied: You do not have permission to view the Command Center.");
        window.location.href = 'index.html';
        return;
    }

    // --- FINAL: Role Permissions Matrix ---
    const ROLE_PERMISSIONS = {
        'receptionist': ['appointments', 'scanner'], // QR Scan & Check-in Only
        'doctor': ['scanner', 'inventory', 'medical-lab'], // Lab Tech: Clinical actions (Can scan but not check-in)
        'staff': ['scanner', 'inventory', 'medical-lab'], // Same as Lab Tech
        'admin': ['dashboard', 'scanner', 'inventory', 'broadcast', 'medical-lab', 'staff', 'appointments', 'donors', 'activity-log'] // Full Control
    };

    // Store permissions globally for showView access
    window.userPerms = ROLE_PERMISSIONS[user.role] || [];

    // --- UI Role Customization ---
    document.getElementById('user-display-name').textContent = user.name || 'Staff';
    document.getElementById('user-display-role').textContent = user.role.toUpperCase();

    // Dynamically Hide Sidebar Items based on permissions
    document.querySelectorAll('.nav-item').forEach(item => {
        const onClickAttr = item.getAttribute('onclick');
        if (onClickAttr) {
            const match = onClickAttr.match(/'([^']+)'/);
            if (match && match[1]) {
                const view = match[1];
                if (!window.userPerms.includes(view)) {
                    item.style.display = 'none';
                }
            }
        }
    });

    // Initial View Selection based on role
    if (user.role === 'receptionist') window.showView('appointments');
    else if (user.role === 'doctor' || user.role === 'staff') window.showView('medical-lab');
    else window.showView('dashboard');

    // Initialize Views
    initializeInventoryListener();
    loadDailyAppointments();
    initializeScanner();
    initializeCharts();

    // Log login session
    logActivity("LOGIN", "Staff member accessed the system");
});

// ------ ACTIVITY LOGGING ------
async function logActivity(action, details) {
    try {
        const { addDoc, collection } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
        const session = localStorage.getItem('sharyan_user');
        const user = session ? JSON.parse(session) : { name: "System", role: "unknown" };

        await addDoc(collection(db, "activity_log"), {
            timestamp: new Date(),
            staffName: user.name,
            staffRole: user.role,
            action: action,
            details: details
        });
    } catch (e) {
        console.error("Logging failed:", e);
    }
}

async function loadActivityLog() {
    const logBody = document.getElementById('activity-log-body');
    if (!logBody) return;

    try {
        const { query, collection, orderBy, limit, onSnapshot } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
        const q = query(collection(db, "activity_log"), orderBy("timestamp", "desc"), limit(50));

        onSnapshot(q, (snapshot) => {
            logBody.innerHTML = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const time = data.timestamp?.toDate().toLocaleTimeString() || "---";
                const row = document.createElement('tr');
                row.style.borderBottom = "1px solid #f8fafc";
                row.innerHTML = `
                    <td style="padding:12px; font-size:12px; color:#64748b;">${time}</td>
                    <td style="font-weight:600; font-size:13px;">${data.staffName} <span style="font-size:10px; color:#94a3b8;">(${data.staffRole})</span></td>
                    <td><span style="background:#f1f5f9; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:bold;">${data.action}</span></td>
                    <td style="font-size:12px; color:#475569;">${data.details}</td>
                `;
                logBody.appendChild(row);
            });
        });
    } catch (e) { console.error(e); }
}

// ------ NAVIGATION (With Permission Guard) ------
window.showView = (viewName) => {
    // Permission Check
    if (window.userPerms && !window.userPerms.includes(viewName)) {
        console.warn("Unauthorized view access:", viewName);
        return;
    }

    if (viewName === 'staff') loadStaffList();
    if (viewName === 'activity-log') loadActivityLog();

    // Hide all sections
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    // Show target
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
        target.classList.add('active');

        // Match sidebar highlighting
        document.querySelectorAll('.nav-item').forEach(btn => {
            if (btn.getAttribute('onclick').includes(`'${viewName}'`)) {
                btn.classList.add('active');
            }
        });
    }
};

window.logout = async () => {
    if (confirm("Logout from Command Center?")) {
        try {
            const { signOut } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js");
            const auth = window.sharyan.auth;
            if (auth) await signOut(auth);
            localStorage.removeItem('sharyan_user');
            window.location.href = 'staff-portal.html';
        } catch (error) {
            localStorage.removeItem('sharyan_user');
            window.location.href = 'staff-portal.html';
        }
    }
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
    logActivity('DONATION_CONFIRMED', `Linked to ID: ${id}`);
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
    const email = form.email.value;
    const civilId = form.id.value;
    const password = form.password.value;
    const role = form.role.value;

    try {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js");
        const { getAuth, createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js");
        const { setDoc, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");

        // 1. Check if ID exists in Firestore
        // (Optional: You might want to check email too, but Auth handles that)
        // We use civilId as key? Or UID? 
        // Best practice with Auth is to use UID as key.
        // But for "legacy" staff check, we can just proceed.
        // Actually, let's just create user.

        // 2. Create Auth User (using Secondary App to avoid logout)
        const secondaryApp = initializeApp(window.sharyan.app.options, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);

        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const uid = userCredential.user.uid;

        // Cleanup secondary app
        // secondaryApp.delete(); 

        // 3. Create Staff Profile in Firestore
        await setDoc(doc(db, "users", uid), {
            name: name,
            email: email,
            civilId: civilId,
            role: role,
            uid: uid,
            status: "active", // Default status
            createdAt: new Date(),
            managedBy: "admin"
        });

        logActivity("STAFF_CREATED", `Added new ${role}: ${name}`);
        alert(`Success! Staff created.\nLogin: ${email}\nPass: ${password}`);
        form.reset();
        loadStaffList(); // Refresh list

    } catch (error) {
        console.error("Error adding staff:", error);
        alert("Error: " + error.message);
    }
};

async function loadStaffList() {
    const listContainer = document.getElementById('staff-list-container');
    if (!listContainer) return;

    try {
        const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
        const q = query(collection(db, "users"), where("role", "in", ["admin", "staff", "doctor", "receptionist"]));

        const querySnapshot = await getDocs(q);
        listContainer.innerHTML = '';

        if (querySnapshot.empty) {
            listContainer.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;">No staff registered yet.</p>';
            return;
        }

        querySnapshot.forEach((userDoc) => {
            const data = userDoc.data();
            const isActive = data.status === "active";
            const el = document.createElement('div');
            el.className = 'staff-list-item';
            el.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom:1px solid #f1f5f9; background:" + (isActive ? "white" : "#f8fafc");

            el.innerHTML = `
                <div>
                    <div style="font-weight:700; color:#1e293b;">${data.name}</div>
                    <div style="font-size:12px; color:#64748b;">${data.role.toUpperCase()} • ${data.email}</div>
                    <span style="font-size:10px; padding:2px 6px; border-radius:10px; background:${isActive ? "#dcfce7" : "#fee2e2"}; color:${isActive ? "#166534" : "#991b1b"};">
                        ${isActive ? "ACTIVE" : "DISABLED"}
                    </span>
                </div>
                <div style="display:flex; gap:10px;">
                    <button onclick="toggleStaffStatus('${userDoc.id}', '${data.status}')" style="background:${isActive ? "#f1f5f9" : "#2563eb"}; color:${isActive ? "#475569" : "white"}; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:11px;">
                        ${isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button onclick="deleteStaff('${userDoc.id}')" style="background:none; border:none; color:#f87171; cursor:pointer; font-size:16px;">🗑️</button>
                </div>
            `;
            listContainer.appendChild(el);
        });

    } catch (error) {
        console.error("Error loading staff:", error);
        listContainer.innerHTML = '<p style="color:red">Error loading list.</p>';
    }
}

window.toggleStaffStatus = async (uid, currentStatus) => {
    const newStatus = currentStatus === "active" ? "disabled" : "active";
    const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
    try {
        await updateDoc(doc(db, "users", uid), { status: newStatus });
        logActivity("STAFF_STATUS_CHANGE", `Staff ID ${uid} changed to ${newStatus}`);
        loadStaffList();
    } catch (e) { alert(e.message); }
};

window.deleteStaff = async (id) => {
    if (confirm("Permanently delete this staff member? This will remove their login access.")) {
        const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
        await deleteDoc(doc(db, 'users', id));
        logActivity("STAFF_DELETED", `Removed staff member ${id}`);
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

// ------ RECEPTIONIST LOGIC ------

async function loadDailyAppointments() {
    const tableBody = document.getElementById('daily-appointments-body');
    if (!tableBody) return;

    try {
        const { query, collection, where, onSnapshot } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");

        // Listen for today's pending appointments
        const q = query(collection(db, "appointments"), where("status", "==", "pending"));

        onSnapshot(q, (snapshot) => {
            tableBody.innerHTML = '';
            snapshot.forEach(doc => {
                const statusClass = data.status === 'pending' ? 'tag-pending' : 'tag-arrived';
                const row = document.createElement('tr');
                row.style.borderBottom = "1px solid #f1f5f9";
                row.innerHTML = `
                    <td style="padding: 15px;">
                        <div style="font-weight:700;">${data.donorName}</div>
                        <div style="font-size:11px; color:#64748b;">Slot: Today, Morning</div>
                    </td>
                    <td><span class="blood-badge-small" style="background:#fee2e2; color:#dc2626; padding:4px 10px; border-radius:6px; font-weight:800;">${data.bloodType}</span></td>
                    <td>
                        <span style="padding:4px 8px; border-radius:6px; font-size:11px; font-weight:bold; background:#f1f5f9; color:#475569;">
                            ${data.status.toUpperCase()}
                        </span>
                    </td>
                    <td>
                        <button onclick="checkInDonor('${doc.id}')" style="background:#10b981; color:white; border:none; padding:8px 16px; border-radius:8px; cursor:pointer; font-weight:600; transition:0.2s;">
                            Check In ✅
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            if (snapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#94a3b8;">No pending appointments.</td></tr>';
            }
        });
    } catch (e) { console.error(e); }
}

window.checkInDonor = async (appointmentId) => {
    try {
        const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
        await updateDoc(doc(db, "appointments", appointmentId), {
            status: "arrived",
            arrivedAt: new Date()
        });
        await logActivity("CHECK_IN", `Donor with appointment ${appointmentId} checked in`);
        alert("Donor checked in! Proceed to Medical Evaluation.");
    } catch (e) { alert("Error: " + e.message); }
};


// ------ MEDICAL / LAB LOGIC ------

window.handleMedicalSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const bagId = document.getElementById('med-bag-id').value;
    const uid = document.getElementById('med-donor-uid').value;
    const bloodType = document.getElementById('med-blood-type').value;

    if (!uid) { return alert("Please scan a donor first!"); }

    try {
        const { addDoc, collection, updateDoc, doc, increment } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");

        // 1. Save Medical Record
        await addDoc(collection(db, "donation_records"), {
            bagId: bagId,
            donorUid: uid,
            bloodType: bloodType,
            weight: document.getElementById('med-weight').value,
            hemoglobin: document.getElementById('med-hb').value,
            volume: document.getElementById('med-volume').value,
            notes: document.getElementById('med-notes').value,
            timestamp: new Date(),
            verified: false
        });

        // 2. Update Inventory
        const invId = bloodType.replace('+', '_POS').replace('-', '_NEG');
        await updateDoc(doc(db, "inventory", invId), {
            units: increment(1),
            lastUpdated: new Date()
        });

        await logActivity("BLOOD_COLLECTED", `Bag ${bagId} for ${bloodType} added to stock`);
        alert("Success! Blood Bag Registered & Inventory Updated.");
        form.reset();
        document.getElementById('med-donor-name').value = '';
        document.getElementById('med-donor-uid').value = '';

    } catch (error) {
        alert("Error saving record: " + error.message);
    }
};

// --- Updated Scanner Integration ---
window.fillMedicalForm = (name, uid, btype) => {
    document.getElementById('med-donor-name').value = name;
    document.getElementById('med-donor-uid').value = uid;
    document.getElementById('med-blood-type').value = btype;
    window.showView('medical-lab');
};
