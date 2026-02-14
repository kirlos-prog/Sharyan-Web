// AUTH GUARD: Redirect to Login if not authenticated
document.addEventListener('DOMContentLoaded', () => {
    const userSession = localStorage.getItem('sharyan_user');

    // Check if we are on the main dashboard (index.html) and not logged in
    if (!userSession) {
        // Redirect to login page immediately
        window.location.href = 'login.html';
        return; // Stop execution
    }

    // If logged in, initialize app
    const user = JSON.parse(userSession);
    console.log('Welcome back:', user.name);

    // Check for Digital ID View Request (from Signup)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') === 'digital-id') {
        showDigitalIdModal(user);
    }

    // Initialize standard features
    initializeRealTimeInventory(); // 🔥 REAL FIREBASE
    animateCounters();
    initializeSmoothScroll();
    initializeMobileMenu();
    initializeFormHandling();
    updateNavbarOnScroll();
    initializeRequestForm();
    loadDonationHistory(user.uid); // 📅 Load user history
});

// Digital ID Logic
function showDigitalIdModal(user) {
    const modal = document.getElementById('digitalIdModal');

    // Populate Data
    if (user.name) document.getElementById('idName').textContent = user.name;
    if (user.civilId) document.getElementById('idCivil').textContent = 'ID: ' + user.civilId;
    if (user.bloodType) document.getElementById('idBlood').textContent = user.bloodType;

    // 🟢 Generate Real QR Code for Scanner
    const qrImg = modal.querySelector('img');
    if (qrImg && user.civilId) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=Sharyan-User-${user.civilId}`;
    }

    modal.style.display = 'flex';
}

function closeDigitalId() {
    const modal = document.getElementById('digitalIdModal');
    modal.style.display = 'none';

    // Remove query param to prevent reopening on reload
    const url = new URL(window.location);
    url.searchParams.delete('view');
    window.history.replaceState({}, '', url);
}

function downloadIdCard() {
    // In a real app, this would use html2canvas or similar
    alert('ID Card image saved to your gallery! (Simulation)');
}

// 🔓 LOGOUT LOGIC
window.handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
        try {
            const { signOut } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js");
            const auth = window.sharyan.auth;
            await signOut(auth);
            localStorage.removeItem('sharyan_user');
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Logout Error:", error);
            localStorage.removeItem('sharyan_user');
            window.location.href = 'login.html';
        }
    }
};


// 🔥 REAL-TIME FIREBASE INVENTORY
async function initializeRealTimeInventory() {
    const { collection, onSnapshot } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
    const db = window.sharyan.db;

    if (!db) {
        console.error("Database connection missing! Check firebase-init.js");
        return;
    }

    const inventoryRef = collection(db, "inventory");

    // Listen for real-time updates
    onSnapshot(inventoryRef, (snapshot) => {
        const bloodMap = {}; // Map status by type for easier rendering

        snapshot.forEach((doc) => {
            const data = doc.data();
            // Store data mapped by type (e.g., "A+" -> { units: 145, capacity: 200... })
            bloodMap[data.type] = data;
        });

        // If database is empty, show empty state or run seeder
        if (Object.keys(bloodMap).length === 0) {
            console.warn("Database is empty! Run seedDatabase() in console.");
            return;
        }

        renderRealTimeInventory(bloodMap);
    }, (error) => {
        console.error("Error getting inventory updates: ", error);
        alert("Firestore Permission Error: Check if you deployed the Security Rules!");
    });
}

// Render blood inventory cards with pulse effect for critical levels
function renderRealTimeInventory(bloodDataMap) {
    const container = document.getElementById('inventoryGrid');
    if (!container) return;

    container.innerHTML = ''; // Clear existing

    // Define order to display cards
    const order = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    order.forEach(type => {
        const blood = bloodDataMap[type] || { type: type, units: 0, capacity: 100, status: 'low' }; // Fallback

        const percentage = Math.min((blood.units / blood.capacity) * 100, 100);
        let status = 'good';
        let criticalClass = '';

        // Calculate status dynamically (or use DB status)
        if (percentage < 25) {
            status = 'critical';
            criticalClass = ' critical'; // Add pulse effect
        } else if (percentage < 50) {
            status = 'low';
        }

        const card = document.createElement('div');
        card.className = 'blood-type-card' + criticalClass;

        // Add click handler to update (Admin simulation)
        // card.onclick = () => updateInventory(type, 1); 

        card.innerHTML = `
            <div class="blood-type-label">${blood.type}</div>
            <div class="blood-level-container">
                <div class="blood-level-bar">
                    <div class="blood-level-fill" style="height: ${percentage}%"></div>
                </div>
            </div>
            <div class="blood-units">${blood.units} Units</div>
            <div class="blood-status status-${status}">
                ${status === 'critical' ? '🚨 Critical' : status === 'low' ? '⚠️ Low' : '✓ Available'}
            </div>
        `;

        container.appendChild(card);
    });
}

// Animate counters in hero stats
function animateCounters() {
    const stats = document.querySelectorAll('.stat-number');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.target);
                animateValue(entry.target, 0, target, 2000);
                observer.unobserve(entry.target);
            }
        });
    });

    stats.forEach(stat => observer.observe(stat));
}

function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    let current = start;

    const timer = setInterval(() => {
        current += increment * Math.ceil(range / 100);
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = current.toLocaleString();
    }, stepTime);
}

// Smooth scroll functionality
function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Mobile menu toggle
function initializeMobileMenu() {
    const toggle = document.getElementById('mobileToggle');
    const menu = document.getElementById('navMenu');

    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            menu.classList.toggle('active');
            toggle.classList.toggle('active');
        });

        // Close menu when clicking nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                menu.classList.remove('active');
                toggle.classList.remove('active');
            });
        });
    }
}

// Navbar scroll effect
function updateNavbarOnScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Active nav link on scroll
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + sectionId) {
                    link.classList.add('active');
                }
            });
        }
    });
});

// Form handling
function initializeFormHandling() {
    const form = document.getElementById('donationForm');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Collect form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // 🔥 REAL FIREBASE SAVE (Appointments Collection)
            try {
                const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
                const db = window.sharyan.db;

                // Get current user for linking
                const userSession = localStorage.getItem('sharyan_user');
                const user = userSession ? JSON.parse(userSession) : {};

                await addDoc(collection(db, "appointments"), {
                    donorName: data.name || user.name || "Anonymous",
                    donor_uid: user.uid || null,
                    bloodType: data.bloodType || user.bloodType || "Unknown",
                    date: data.date,
                    timeSlot: data.timeSlot || "Morning",
                    location: data.location || "Sharyan Central Hospital",
                    status: "pending",
                    createdAt: new Date()
                });

                // Show success message
                showSuccessModal('Donation Scheduled', 'Your appointment has been saved to the database successfully!');
                form.reset();

            } catch (error) {
                console.error("Error adding document: ", error);
                showSuccessModal('Error', 'Could not save appointment. Check network or permissions.');
            }
        });
    }
}

// Initialize Request Form
function initializeRequestForm() {
    const requestForm = document.getElementById('requestForm');

    if (requestForm) {
        requestForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(requestForm);
            const data = Object.fromEntries(formData.entries());

            // 🔥 REAL FIREBASE SAVE (Emergency Requests)
            try {
                const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
                const db = window.sharyan.db;

                await addDoc(collection(db, "emergency_requests"), {
                    requesterName: data.name || "Hospital Staff",
                    bloodType: data.bloodType,
                    unitsNeeded: parseInt(data.units) || 1,
                    urgency: data.urgency,
                    status: "open",
                    createdAt: new Date()
                });

                showSuccessModal('Request Broadcasted', 'Emergency request saved to DB. Donors will be notified soon.');
                requestForm.reset();

            } catch (error) {
                console.error("Error creating request: ", error);
                showSuccessModal('Error', 'Failed to broadcast request.');
            }
        });
    }
}

function showSuccessModal(title, message) {
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;

    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1a1a2e 0%, #252538 100%);
            padding: 48px;
            border-radius: 24px;
            max-width: 500px;
            text-align: center;
            border: 1px solid rgba(220, 38, 38, 0.3);
            box-shadow: 0 0 40px rgba(220, 38, 38, 0.3);
            animation: slideUp 0.3s ease;
        ">
            <div style="font-size: 64px; margin-bottom: 24px;">🎉</div>
            <h2 style="font-size: 32px; margin-bottom: 16px; color: white;">${title}</h2>
            <p style="color: #a0a0b8; margin-bottom: 24px; line-height: 1.6;">
                ${message}
            </p>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: linear-gradient(135deg, #dc2626 0%, #f97316 100%);
                color: white;
                border: none;
                padding: 14px 32px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                font-family: 'Inter', sans-serif;
            ">Got it!</button>
        </div>
    `;

    document.body.appendChild(modal);

    // Auto-close after 5 seconds
    setTimeout(() => {
        if (modal.parentElement) {
            modal.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => modal.remove(), 300);
        }
    }, 5000);
}

// Emergency notification system (Client-side check)
function checkEmergencyStatus() {
    // This logic moves to Cloud Functions in production
    // Client-side just renders UI
}

// CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeOut {
        from {opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes slideUp {
        from {
            transform: translateY(30px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
// 📅 LOAD REAL DONATION HISTORY & STATS
async function loadDonationHistory(uid) {
    const tableBody = document.getElementById('historyTableBody');
    if (!tableBody) return;

    try {
        const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
        const db = window.sharyan.db;

        const q = query(collection(db, "appointments"), where("donor_uid", "==", uid));
        const querySnapshot = await getDocs(q);

        const records = [];
        querySnapshot.forEach(doc => records.push(doc.data()));

        // Sort by date descending
        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 1. Update Table
        tableBody.innerHTML = '';
        if (records.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b; padding:20px;">No records found. Start your journey today!</td></tr>`;
        } else {
            records.forEach(data => {
                const row = document.createElement('tr');
                const statusClass = data.status === 'completed' ? 'success' : 'pending';
                row.innerHTML = `
                    <td>${data.date}</td>
                    <td>${data.location || 'Sharyan Central'}</td>
                    <td>450 ml</td>
                    <td><span class="status-badge ${statusClass}">${data.status.toUpperCase()}</span></td>
                `;
                tableBody.appendChild(row);
            });
        }

        // 2. Update Impact Stats
        const totalDonations = records.filter(r => r.status === 'completed').length;
        document.getElementById('stats-total-donations').textContent = totalDonations;
        document.getElementById('stats-lives-saved').textContent = totalDonations * 3;

        const userSession = JSON.parse(localStorage.getItem('sharyan_user') || '{}');
        document.getElementById('stats-blood-type').textContent = userSession.bloodType || '--';

        // 3. Update Eligibility (90-day rule)
        const lastDonation = records.find(r => r.status === 'completed');
        const eligibilityMsg = document.getElementById('stats-eligibility-msg');
        const daysLeftEl = document.getElementById('stats-days-left');
        const hoursLeftEl = document.getElementById('stats-hours-left');
        const progressFill = document.getElementById('stats-progress-fill');

        if (!lastDonation) {
            eligibilityMsg.innerHTML = '<span style="color:#10b981; font-weight:bold;">✅ You are eligible to donate today!</span>';
            daysLeftEl.textContent = '0';
            hoursLeftEl.textContent = '0';
            progressFill.style.width = '100%';
        } else {
            const lastDate = new Date(lastDonation.date);
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + 90);

            const now = new Date();
            const diffTime = nextDate - now;

            if (diffTime <= 0) {
                eligibilityMsg.innerHTML = '<span style="color:#10b981; font-weight:bold;">✅ You are eligible to donate now!</span>';
                daysLeftEl.textContent = '00';
                hoursLeftEl.textContent = '00';
                progressFill.style.width = '100%';
            } else {
                const totalHours = Math.floor(diffTime / (1000 * 60 * 60));
                const days = Math.floor(totalHours / 24);
                const hours = totalHours % 24;

                daysLeftEl.textContent = days.toString().padStart(2, '0');
                hoursLeftEl.textContent = hours.toString().padStart(2, '0');

                eligibilityMsg.innerHTML = `Recovery in progress. Next eligible: <strong>${nextDate.toLocaleDateString()}</strong>`;

                const progress = Math.min(100, Math.max(0, ((90 - (diffTime / (1000 * 86400))) / 90) * 100));
                progressFill.style.width = `${progress}%`;
            }
        }

    } catch (error) {
        console.error("Error loading history & stats:", error);
    }
}
