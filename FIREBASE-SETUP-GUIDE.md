# 🚀 Firebase Setup Checklist (What needed from you)

دليل الخطوات اللي محتاج تنفذها على **Firebase Console** عشان تشغل الـ Backend بتاع الموقع.

---

## 1️⃣ إنشاء المشروع (Create Project)
1. ادخل على [console.firebase.google.com](https://console.firebase.google.com).
2. اضغط **Add project**.
3. سمي المشروع: `Sharyan-Hospital` (أو أي اسم تحبه).
4. عطل الـ Google Analytics (مش محتاجينه دلوقتي) واضغط **Create project**.

---

## 2️⃣ تفعيل قاعدة البيانات (Firestore Database)
1. من القائمة الجانبية، اختر **Build** > **Firestore Database**.
2. اضغط **Create database**.
3. اختر الموقع (Location): `eur3 (europe-west)` أو أي سيرفر قريب من دولتك لسرعة الاستجابة.
4. اختر **Start in production mode** واضغط **Enable**.

### إنشاء المجموعات (Collections):
بعد ما الداتابيز تفتح، أنشئ الـ Collections الأساسية دي (مجرد أسماء فاضية في البداية):
*   `users`
*   `inventory`
*   `appointments`
*   `emergency_requests`

---

## 3️⃣ تفعيل تسجيل الدخول (Authentication)
1. من القائمة الجانبية، اختر **Build** > **Authentication**.
2. اضغط **Get started**.
3. من لسان التبويب **Sign-in method**، اختر **Phone**.
4. فعل الزر (Enable) واضغط **Save**.
   *   *ملحوظة:* ممكن تضيف "أرقام اختبار" (Phone numbers for testing) عشان تجرب السيستم من غير ما يبعت رسائل SMS حقيقية وتضيع رصيدك. مثلاً رقم `+201234567890` وكود `123456`.

---

## 4️⃣ نسخ قواعد الأمان (Security Rules)
1. ارجع لصفحة **Firestore Database**.
2. اختر لسان التبويب **Rules**.
3. امسح الكود القديم والصق الكود ده (نفس اللي في `FIREBASE-ARCHITECTURE.md`):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() { return request.auth != null; }
    function isOwner(userId) { return request.auth.uid == userId; }
    function isAdmin() { return request.auth.token.role == 'admin'; }

    // 👤 المستخدمين: كل واحد يشوف بياناته بس
    match /users/{userId} {
      allow read: if isAuthenticated() && (isOwner(userId) || isAdmin());
      allow write: if isAuthenticated() && isOwner(userId);
    }

    // 🩸 المخزون: الكل يشوف، بس الآدمين يعدل
    match /inventory/{bloodType} {
      allow read: if true;
      allow write: if isAuthenticated() && isAdmin();
    }

    // 📅 المواعيد: المتبرع يشوف مواعيده، والآدمين يشوف الكل
    match /appointments/{appointmentId} {
      allow read, write: if isAuthenticated() && (resource.data.donor_uid == request.auth.uid || isAdmin());
    }
  }
}
```
4. اضغط **Publish**.

---

## 5️⃣ ربط الكود بالمشروع (Get Config)
1. اضغط على علامة "الترس" ⚙️ جنب Project Overview واختر **Project settings**.
2. انزل تحت خالص عند **Your apps**.
3. اضغط على أيقونة الويب `</>`.
4. سمي التطبيق `Sharyan-Web` واضغط **Register app**.
5. هيظهر لك كود فيه `const firebaseConfig = { ... }`.
6. انسخ الـ Keys دي وحطها في ملف `firebase-config.js` في الفولدر بتاعنا.

---

## ⚠️ خطوة متقدمة (Cloud Functions)
دي محتاجة تنزل **Node.js** على جهازك وتستخدم الـ Terminal. لو مش مبرمج، ممكن تأجل الخطوة دي، بس هي المسؤولة عن:
1. إرسال الإشعارات.
2. حساب الـ 90 يوم أوتوماتيك.

لو عايز المبرمجين هم اللي يعملوها، ابعت لهم ملف `FIREBASE-ARCHITECTURE.md` وهم هيفهموا المطلوب.

---

**مبروك! 🎉** كده الـ Backend جاهز ومستني يستقبل أول متبرع.
