# 🗄️ Blood Donation Platform - Database Schema

## Overview
This document outlines the complete database structure for the Blood Donation Hospital platform. The schema supports user management, donor tracking, blood inventory, appointments, and emergency requests.

---

## Table Structures

### 1. Users Table (المستخدمين)
**Purpose**: Core user authentication and basic information

| Field Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| user_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| full_name | VARCHAR(100) | NOT NULL | Full name (الاسم الكامل) |
| email | VARCHAR(100) | UNIQUE, NOT NULL | Email address |
| password_hash | VARCHAR(255) | NOT NULL | Hashed password |
| national_id | VARCHAR(50) | UNIQUE, NOT NULL | National ID (الرقم القومي) |
| phone_number | VARCHAR(20) | NOT NULL | Mobile number (رقم الموبايل) |
| address | TEXT | NULL | Full address (العنوان) |
| date_of_birth | DATE | NOT NULL | Birth date |
| gender | ENUM('M', 'F') | NOT NULL | Gender |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Registration date |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update |
| is_active | BOOLEAN | DEFAULT TRUE | Account status |
| role | ENUM('donor', 'admin', 'staff') | DEFAULT 'donor' | User role |

**Indexes**:
- PRIMARY: user_id
- UNIQUE: email, national_id
- INDEX: phone_number

---

### 2. Donors Table (المتبرعين)
**Purpose**: Donor-specific medical and donation history

| Field Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| donor_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique donor ID |
| user_id | INT | FOREIGN KEY (users.user_id), UNIQUE | Reference to user |
| blood_type | ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') | NOT NULL | Blood group (فصيلة الدم) |
| weight_kg | DECIMAL(5,2) | NOT NULL | Weight in kg |
| last_donation_date | DATE | NULL | Last donation date (تاريخ آخر تبرع) |
| next_eligible_date | DATE | NULL | Next eligible date (calculated) |
| total_donations | INT | DEFAULT 0 | Total donation count |
| lives_saved | INT | DEFAULT 0 | Estimated lives saved (× 3) |
| chronic_diseases | TEXT | NULL | List of conditions (الأمراض المزمنة) |
| is_eligible | BOOLEAN | DEFAULT TRUE | Current eligibility status |
| donor_badge | ENUM('bronze', 'silver', 'gold', 'diamond') | NULL | Achievement level |
| qr_code | VARCHAR(255) | UNIQUE | QR code for check-in |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

**Indexes**:
- PRIMARY: donor_id
- FOREIGN KEY: user_id
- INDEX: blood_type, next_eligible_date

---

### 3. Blood_Inventory Table (المخزون)
**Purpose**: Real-time blood bank inventory management

| Field Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| inventory_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique record ID |
| blood_type | ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') | NOT NULL | Blood type (نوع الفصيلة) |
| bag_id | VARCHAR(50) | UNIQUE, NOT NULL | Unique bag identifier |
| units_ml | INT | DEFAULT 450 | Volume in ml |
| collection_date | DATE | NOT NULL | Collection date |
| expiry_date | DATE | NOT NULL | Expiration date (تاريخ الصلاحية) |
| storage_location | VARCHAR(100) | NOT NULL | Fridge code (كود الثلاجة)|
| temperature_celsius | DECIMAL(4,2) | NULL | Storage temp (2-6°C) |
| status | ENUM('available', 'reserved', 'used', 'expired') | DEFAULT 'available' | Current status |
| donor_id | INT | FOREIGN KEY (donors.donor_id) | Source donor |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

**Indexes**:
- PRIMARY: inventory_id
- UNIQUE: bag_id
- INDEX: blood_type, status, expiry_date
- FOREIGN KEY: donor_id

**Business Rules**:
- Auto-update status to 'expired' when expiry_date < CURRENT_DATE
- Alert when blood type inventory < 25% capacity

---

### 4. Appointments Table (المواعيد)
**Purpose**: Donation appointment scheduling

| Field Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| appointment_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique appointment ID |
| donor_id | INT | FOREIGN KEY (donors.donor_id), NOT NULL | Donor reference (رقم المتبرع) |
| appointment_date | DATE | NOT NULL | Scheduled date (التاريخ) |
| appointment_time | TIME | NOT NULL | Scheduled time (الساعة) |
| location | VARCHAR(200) | NOT NULL | Hospital/Center name |
| status | ENUM('pending', 'confirmed', 'completed', 'cancelled', 'no_show') | DEFAULT 'pending' | Status (حالة الموعد) |
| confirmation_code | VARCHAR(10) | UNIQUE | 6-digit code |
| notes | TEXT | NULL | Special instructions |
| reminder_sent | BOOLEAN | DEFAULT FALSE | SMS/Email reminder flag |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |
| completed_at | TIMESTAMP | NULL | Actual donation time |

**Indexes**:
- PRIMARY: appointment_id
- INDEX: donor_id, appointment_date, status
- FOREIGN KEY: donor_id

**Business Rules**:
- Auto-send reminder 24 hours before appointment
- Update donor.last_donation_date when status = 'completed'
- Calculate donor.next_eligible_date as last_donation_date + 90 days

---

### 5. Emergency_Requests Table (الاستغاثات / طلبات الدم الطارئة)
**Purpose**: Critical blood shortage requests

| Field Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| request_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique request ID |
| requester_name | VARCHAR(200) | NOT NULL | Hospital/Patient name |
| contact_number | VARCHAR(20) | NOT NULL | Emergency contact |
| blood_type_needed | ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') | NOT NULL | Required blood type (الفصيلة المطلوبة) |
| units_needed | INT | NOT NULL | Number of units required |
| urgency_level | ENUM('critical', 'urgent', 'moderate') | NOT NULL | Priority level (درجة الخطورة) |
| location | TEXT | NOT NULL | Hospital address (اسم المستشفى) |
| additional_info | TEXT | NULL | Extra details |
| request_status | ENUM('open', 'in_progress', 'fulfilled', 'cancelled') | DEFAULT 'open' | Current status (الحالة) |
| donors_notified | INT | DEFAULT 0 | Count of notified donors |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| fulfilled_at | TIMESTAMP | NULL | Resolution time |
| created_by_user_id | INT | FOREIGN KEY (users.user_id) | Submitter |

**Indexes**:
- PRIMARY: request_id
- INDEX: blood_type_needed, urgency_level, request_status
- FOREIGN KEY: created_by_user_id

**Business Rules**:
- Auto-notify matching blood type donors within 10km radius
- Critical requests: notify ALL matching donors immediately
- Auto-update request_status to 'fulfilled' when units are allocated

---

### 6. Donation_History Table (تاريخ التبرعات)
**Purpose**: Complete donation records log

| Field Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| history_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique record ID |
| donor_id | INT | FOREIGN KEY (donors.donor_id), NOT NULL | Donor reference |
| donation_date | DATE | NOT NULL | Donation date (التاريخ) |
| location | VARCHAR(200) | NOT NULL | Center name (مكان التبرع) |
| blood_type | ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') | NOT NULL | Blood type |
| amount_ml | INT | DEFAULT 450 | Donated volume (كمية الدم) |
| hemoglobin_level | DECIMAL(4,2) | NULL | Pre-donation Hb level |
| blood_pressure | VARCHAR(20) | NULL | BP reading (e.g., "120/80") |
| staff_id | INT | FOREIGN KEY (users.user_id) | Processing staff |
| bag_id | VARCHAR(50) | FOREIGN KEY (blood_inventory.bag_id) | Generated bag |
| notes | TEXT | NULL | Medical notes |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Indexes**:
- PRIMARY: history_id
- INDEX: donor_id, donation_date
- FOREIGN KEY: donor_id, staff_id, bag_id

---

### 7. Notifications Table (الإشعارات)
**Purpose**: SMS/Email notification log

| Field Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| notification_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique notification ID |
| user_id | INT | FOREIGN KEY (users.user_id), NOT NULL | Recipient |
| notification_type | ENUM('sms', 'email', 'push') | NOT NULL | Delivery method |
| subject | VARCHAR(200) | NULL | Email subject |
| message | TEXT | NOT NULL | Notification content |
| purpose | ENUM('appointment_reminder', 'emergency_request', 'eligibility_alert', 'thank_you') | NOT NULL | Reason |
| status | ENUM('pending', 'sent', 'failed') | DEFAULT 'pending' | Delivery status |
| sent_at | TIMESTAMP | NULL | Send time |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Indexes**:
- PRIMARY: notification_id
- INDEX: user_id, status, purpose
- FOREIGN KEY: user_id

---

## Relationships Diagram

```
users (1) ────────── (1) donors
  │                      │
  │                      │
  │                      ├── (1:N) ─── appointments
  │                      │
  │                      ├── (1:N) ─── donation_history
  │                      │
  │                      └── (1:N) ─── blood_inventory
  │
  ├── (1:N) ─── emergency_requests
  │
  └── (1:N) ─── notifications


donation_history (N) ─── (1) blood_inventory
```

---

## Sample Queries

### 1. Get donor dashboard data
```sql
SELECT 
    d.blood_type,
    d.total_donations,
    d.lives_saved,
    d.next_eligible_date,
    d.donor_badge,
    DATEDIFF(d.next_eligible_date, CURDATE()) AS days_until_eligible
FROM donors d
WHERE d.user_id = ?;
```

### 2. Get blood inventory summary
```sql
SELECT 
    blood_type,
    COUNT(*) AS total_units,
    SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available_units,
    SUM(CASE WHEN expiry_date < DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS expiring_soon
FROM blood_inventory
GROUP BY blood_type;
```

### 3. Find eligible donors for emergency request
```sql
SELECT 
    u.full_name,
    u.phone_number,
    u.email,
    d.blood_type,
    d.last_donation_date
FROM donors d
JOIN users u ON d.user_id = u.user_id
WHERE d.blood_type = ?
  AND d.is_eligible = TRUE
  AND (d.next_eligible_date IS NULL OR d.next_eligible_date <= CURDATE())
  AND u.is_active = TRUE;
```

### 4. Calculate donor badge level
```sql
UPDATE donors
SET donor_badge = CASE
    WHEN total_donations >= 50 THEN 'diamond'
    WHEN total_donations >= 25 THEN 'gold'
    WHEN total_donations >= 10 THEN 'silver'
    WHEN total_donations >= 3 THEN 'bronze'
    ELSE NULL
END
WHERE donor_id = ?;
```

---

## Automated Triggers

### 1. Auto-update lives saved after donation
```sql
CREATE TRIGGER update_lives_saved
AFTER INSERT ON donation_history
FOR EACH ROW
BEGIN
    UPDATE donors 
    SET total_donations = total_donations + 1,
        lives_saved = (total_donations + 1) * 3,
        last_donation_date = NEW.donation_date,
        next_eligible_date = DATE_ADD(NEW.donation_date, INTERVAL 90 DAY)
    WHERE donor_id = NEW.donor_id;
END;
```

### 2. Auto-expire old blood bags
```sql
CREATE EVENT expire_old_blood
ON SCHEDULE EVERY 1 DAY
DO
    UPDATE blood_inventory
    SET status = 'expired'
    WHERE expiry_date < CURDATE() AND status = 'available';
```

### 3. Send eligibility notifications
```sql
CREATE EVENT notify_eligible_donors
ON SCHEDULE EVERY 1 DAY
DO
    INSERT INTO notifications (user_id, notification_type, message, purpose)
    SELECT 
        u.user_id,
        'email',
        CONCAT('You are now eligible to donate blood again! Last donation: ', d.last_donation_date),
        'eligibility_alert'
    FROM donors d
    JOIN users u ON d.user_id = u.user_id
    WHERE d.next_eligible_date = CURDATE();
```

---

## Security & Privacy

### Data Protection
- All passwords stored as bcrypt hashes (user_id)
- National IDs encrypted at rest
- GDPR-compliant data retention (7 years for medical records)
- Role-based access control (RBAC)

### Access Levels
- **Donor**: View own data, book appointments
- **Staff**: Process donations, view inventory
- **Admin**: Full access, emergency requests, reports

---

## Capacity Planning

### Storage Estimates (per 10,000 users)
- Users: ~2 MB
- Donors: ~1.5 MB
- Appointments: ~5 MB/year
- Donation History: ~3 MB/year
- Blood Inventory: ~10 MB

**Total**: ~22 MB/year for 10,000 active donors

---

## Backup Strategy
- **Daily**: Incremental backups at 2:00 AM
- **Weekly**: Full database backup (Sunday 00:00)
- **Retention**: 30 days rolling
- **Disaster Recovery**: 4-hour RPO, 1-hour RTO

---

*Last Updated: February 14, 2026*
*Version: 1.0*
