
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, doc, onSnapshot, updateDoc, setDoc, Firestore } from "firebase/firestore";

// ملاحظة للمشرف: استبدل هذه القيم ببيانات مشروعك الحقيقية من Firebase Console (https://console.firebase.google.com/)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// التحقق مما إذا كانت الإعدادات لا تزال افتراضية
const isFirebasePlaceholder = firebaseConfig.projectId === "YOUR_PROJECT_ID" || firebaseConfig.apiKey === "YOUR_API_KEY";

let app;
let db: Firestore | null = null;

if (!isFirebasePlaceholder) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export const syncAnnouncement = (callback: (text: string) => void) => {
  if (!db) {
    console.warn("Firebase working in Offline Mode (Placeholder keys detected).");
    return () => {}; // No-op unsubscribe
  }

  const docRef = doc(db, "settings", "announcement");
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().text);
    } else {
      // محاولة إنشاء الوثيقة إذا كانت الصلاحيات تسمح
      setDoc(docRef, { text: "🔥 العب الآن وجرب حظك في توقع البحث السعودي!" }).catch(() => {});
    }
  }, (error) => {
    // التعامل مع خطأ Permission Denied بهدوء
    if (error.code === 'permission-denied') {
      console.warn("Firestore access denied. Check your Security Rules.");
    } else {
      console.error("Firestore sync error:", error);
    }
  });
};

export const updateAnnouncementInCloud = async (newText: string) => {
  if (!db) {
    console.error("Cannot update: Firebase is not configured.");
    return false;
  }

  const docRef = doc(db, "settings", "announcement");
  try {
    await updateDoc(docRef, { text: newText });
    return true;
  } catch (error: any) {
    if (error.code === 'not-found' || error.name === 'FirebaseError') {
      try {
        await setDoc(docRef, { text: newText });
        return true;
      } catch (e) {
        console.error("Cloud update failed even after setDoc attempt:", e);
        return false;
      }
    }
    return false;
  }
};

export { db };
