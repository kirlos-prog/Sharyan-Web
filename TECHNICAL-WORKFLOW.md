# ⚙️ Technical Workflow & Implementation Guide

This document details the specific business logic, validation rules, and "offline-first" strategies for the LifeDrop platform.

## 1. 🛑 Registration & Eligibility Validation (The Gatekeeper)

**Objective**: Prevent ineligible donors from booking appointments while ensuring legitimate donors can register easily.

### Workflow Logic
1.  **User Input**: Donor submits Registration Form (Name, Civil ID, Age, Blood Type, Chronic Diseases).
2.  **Database Query**: System queries `users` collection by `national_id` (Civil ID).
3.  **Conditional Check**:
    *   **Case A: New User**
        *   Action: Create new User record.
        *   Action: Create Appointment with status `pending`.
    *   **Case B: Existing User**
        *   Fetch `last_donation_date`.
        *   Calculate `days_elapsed = TODAY - last_donation_date`.
        *   **Validation Rule**:
            ```javascript
            const MIN_DAYS = 90;
            if (days_elapsed < MIN_DAYS) {
                const remaining = MIN_DAYS - days_elapsed;
                return Error(`عذراً، لم تمر المدة القانونية. يمكنك التبرع بعد ${remaining} يوم.`);
            }
            ```
        *   If Valid: Create Appointment with status `pending`.

### ⚠️ Chronic Disease Flag
*   **Logic**: If the `chronic_diseases` field in the form is **NOT** empty or null:
    *   **Backend**: Set a `medical_review_required: true` flag on the Appointment document.
    *   **Admin UI**: Display a 🔴 **RED WARNING** card when this user's QR is scanned: *"Check Medical Notes before proceeding."*

---

## 2. 🆔 Digital ID & QR Code System

**Objective**: Secure, offline-accessible identification for hospital check-in.

### QR Code Generation
*   **Content**: The QR code **MUST NOT** contain raw personal data (Privacy First).
*   **Payload Structure**:
    ```json
    {
      "u": "encrypted_user_uid_hash",
      "t": 1740000000 // Timestamp to prevent replay attacks
    }
    ```
*   **Visual Card**:
    *   **Top**: Name, Blood Type (Large), Civil ID (Masked: `******1234`).
    *   **Center**: The High-Res QR Code.
    *   **Bottom**: "Scan at Reception".

### 📶 Offline Support (PWA Strategy)
*   **Requirement**: The Digital ID page must work without internet.
*   **Solution**:
    1.  Implement a **Service Worker** to cache the `dashboard/id` route.
    2.  Store the user's encoded QR payload in `localStorage` or `IndexedDB` upon first successful login.
    3.  If offline: Render the QR from local storage.

---

## 3. 🏥 Hospital Activation (The Handshake)

**Objective**: The physical act of donation triggering digital updates.

### Admin/Nurse Workflow
1.  **Scan**: Admin scans donor's QR code using the Hospital App (Admin Mode of the site).
2.  **Lookup**: App decodes the UID and fetches real-time data from Firestore.
3.  **Medical Review**:
    *   App checks `medical_review_required` flag.
    *   If true: Shows the specific chronic notes entered by the donor.
4.  **Confirm Donation**: Admin physical verification passed -> Clicks **"Confirm Donation"** button.

### ⚡ Real-Time System Reaction (Transactional)

All the following must happen in a **Firestore Transaction** to ensure data integrity:

1.  **Update Inventory**:
    ```javascript
    const inventoryRef = db.collection('inventory').doc(donor.blood_type);
    transaction.update(inventoryRef, {
        current_units: firebase.firestore.FieldValue.increment(1),
        last_updated: firebase.firestore.FieldValue.serverTimestamp()
    });
    ```

2.  **Update Donor Profile**:
    ```javascript
    const donorRef = db.collection('users').doc(donor.uid);
    transaction.update(donorRef, {
        "medical_info.last_donation_date": firebase.firestore.FieldValue.serverTimestamp(),
        "medical_info.is_eligible": false, // Lock eligibility immediately
        "gamification.points": firebase.firestore.FieldValue.increment(10),
        "gamification.total_donations": firebase.firestore.FieldValue.increment(1)
    });
    ```

3.  **Update Appointment**:
    *   Set status to `completed`.

---

## 4. 🔒 Privacy & Security

*   **QR Privacy**: Scanning the QR with a standard camera app should show a meaningless hash, not the user's medical info. Only the authorized Admin App can resolve the hash.
*   **Inventory Access**: Write access to `BloodInventory` is strictly limited to users with `role: admin` or `role: staff` via Security Rules.

---

*This workflow ensures a seamless bridge between the physical donation process and the digital inventory system.*
