# 🔥 Firebase Architecture & Backend Logic

This document outlines the professional Firebase implementation for the LifeDrop Blood Donation Platform, leveraging Firestore, Authentication, and Cloud Functions.

## 1. 📂 Firestore Database Structure

### A. Users Collection (`users`)
**Document ID**: `uid` (from Firebase Auth)
Stores donor profile and gamification stats.

```json
{
  "uid": "user_12345",
  "full_name": "Ahmed Hassan",
  "blood_type": "A+",
  "phone_number": "+201234567890",
  "email": "ahmed@example.com",
  "role": "donor", // 'donor' or 'admin'
  "gamification": {
    "points": 150,
    "badge_level": "bronze", // bronze, silver, gold
    "lives_saved": 3
  },
  "medical_info": {
    "last_donation_date": Timestamp("2026-02-14"),
    "is_eligible": false, // Calculated by Cloud Function
    "next_eligible_date": Timestamp("2026-05-15")
  },
  "fcm_token": "token_xyz...", // For Push Notifications
  "created_at": Timestamp,
  "updated_at": Timestamp
}
```

### B. Blood Inventory Collection (`inventory`)
**Document ID**: `blood_type` (e.g., `A_POS`, `O_NEG`)
Real-time inventory tracking.

```json
{
  "type_id": "O+",
  "display_name": "O+",
  "current_units": 18,
  "capacity": 200,
  "critical_limit": 10, // Threshold for admin alert
  "status": "low", // 'good', 'low', 'critical'
  "last_updated": Timestamp
}
```

### C. Appointments Collection (`appointments`)
**Document ID**: Auto-generated
Tracks booking and donation status.

```json
{
  "appointment_id": "apt_9876",
  "donor_uid": "user_12345",
  "donor_name": "Ahmed Hassan",
  "blood_type": "A+",
  "scheduled_date": Timestamp("2026-02-20T10:00:00"),
  "location": "LifeDrop Central Branch",
  "status": "pending", // 'pending', 'confirmed', 'completed', 'cancelled'
  "qr_code_url": "https://storage.firebase...",
  "created_at": Timestamp
}
```

---

## 2. ⚡ Power-Ups & Automation (Cloud Functions)

### A. Automatic Eligibility Calculator 🧠
**Trigger**: When `last_donation_date` is updated.
**Logic**:
1. Checks if 90 days have passed since last donation.
2. Updates `is_eligible` to `true`.
3. Sends a Push Notification: *"You are a hero! You can donate again today."*

```javascript
exports.checkEligibility = functions.firestore
    .document('users/{userId}')
    .onUpdate((change, context) => {
        const newData = change.after.data();
        const lastDate = newData.medical_info.last_donation_date.toDate();
        const eligibleDate = new Date(lastDate);
        eligibleDate.setDate(eligibleDate.getDate() + 90);
        
        if (new Date() >= eligibleDate && !newData.medical_info.is_eligible) {
            return change.after.ref.update({
                'medical_info.is_eligible': true
            });
            // Triggers notification function
        }
    });
```

### B. Critical Inventory Alert 🚨
**Trigger**: When `inventory/{bloodType}` units change.
**Logic**: 
If `current_units` < `critical_limit`:
1. Send SMS/Notification to Admins.
2. Update Inventory UI status to "Critical" (triggers pulse effect on frontend).

```javascript
exports.monitorInventory = functions.firestore
    .document('inventory/{bloodType}')
    .onUpdate((change, context) => {
        const data = change.after.data();
        if (data.current_units < data.critical_limit) {
            // Send Alert to Admins
            sendAdminAlert(`Urgent: ${data.display_name} stock is critical!`);
        }
    });
```

### C. Real-time Frontend Updates 🔄
No refresh needed! The "Test Tube" animation fills up instantly when a donation is recorded.

**Frontend Listener Example**:
```javascript
db.collection("inventory").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
            const data = change.doc.data();
            updateLiquidFillAnimation(data.type_id, data.current_units);
        }
    });
});
```

---

## 3. 🛡️ Security Rules (Privacy First)

These rules ensure medical data privacy and secure the inventory.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // 👤 Users Collection
    // Donors can read/write ONLY their own profile
    // Admins can read all profiles
    match /users/{userId} {
      allow read: if isAuthenticated() && (isOwner(userId) || isAdmin());
      allow write: if isAuthenticated() && isOwner(userId); // Basic info update
      // Sensitive medical fields should be protected via Cloud Functions
    }

    // 🩸 Inventory Collection
    // Public read (everyone sees availability)
    // ONLY Admins can update stock levels
    match /inventory/{bloodType} {
      allow read: if true;
      allow write: if isAuthenticated() && isAdmin();
    }

    // 📅 Appointments Collection
    // Donors can create/read their own appointments
    // Admins can manage all
    match /appointments/{appointmentId} {
      allow read: if isAuthenticated() && (resource.data.donor_uid == request.auth.uid || isAdmin());
      allow create: if isAuthenticated() && request.resource.data.donor_uid == request.auth.uid;
      allow update: if isAuthenticated() && (resource.data.donor_uid == request.auth.uid || isAdmin());
    }
  }
}
```

## 4. 🔑 Authentication Strategy

**Phone Number Auth (OTP)** is strictly recommended for:
1. **Verification**: Ensures real, reachable donors.
2. **Communication**: Critical for SMS alerts in emergencies.
3. **Security**: Harder to fake than email accounts.

**Flow**:
1. User enters Phone Number.
2. Firebase sends 6-digit OTP.
3. User verifies -> Account Created/Logged In.

---

## 5. 🎭 Custom Claims & Role-Based Access

To professionally manage "Donors" vs. "Admins", we use **Firebase Custom Claims**. This is superior to just storing roles in Firestore because it works even within Security Rules and can be checked on the frontend instantly.

### Setting Claims (Cloud Function)
```javascript
exports.setRole = functions.https.onCall(async (data, context) => {
  // Only allow existing admins to make others admins
  if (context.auth.token.role !== 'admin') return;

  const { uid, role } = data;
  await admin.auth().setCustomUserClaims(uid, { role });
});
```

### Checking Auth Guard (Frontend)
Before loading sensitive pages (like `index.html`), check the token:
```javascript
firebase.auth().currentUser.getIdTokenResult()
  .then((idTokenResult) => {
     if (idTokenResult.claims.role === 'admin') {
        // Show Admin Dashboard link
     } else {
        // Show Donor features
     }
  });
```

### Auth Guard Implementation
*   **Redirect Logic**: If `auth.currentUser` is null, immediately redirect to `login.html`.
*   **Route Protection**: Prevent direct URL access to internal pages.

---

**Built for Scalability & Security** 🚀
