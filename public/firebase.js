// firebase.js — Firebase integration for Bytes for Better Lives.
//
// This is a vanilla static site (no bundler), so Firebase is loaded as an ES module
// from the official CDN. This file is SAFE to commit and SAFE to leave in place before
// setup: until you paste a real config below, it does nothing and the site keeps using
// the local data.js content.
//
// ──────────────────────────────────────────────────────────────────────────────
// SETUP (Firebase console → Project settings → Your apps → SDK setup → "Config"):
//   1. Replace the firebaseConfig placeholder values below with your Web app's config.
//      (These values are NOT secrets — access is controlled by the security rules in
//       firestore.rules / storage.rules, not by hiding the apiKey.)
//   2. Add your admin email(s) to ADMIN_EMAILS below AND in firestore.rules/storage.rules.
//   3. In the console enable: Firestore, Authentication (Email/Password), Storage,
//      and (optional) Analytics.
// ──────────────────────────────────────────────────────────────────────────────

const firebaseConfig = {
    apiKey: "AIzaSyCv8h25Y8wboiInz7XBAt4lUY_sSlpf8eI",
    authDomain: "project-686d62b7-14f5-43c7-acc.firebaseapp.com",
    projectId: "project-686d62b7-14f5-43c7-acc",
    storageBucket: "project-686d62b7-14f5-43c7-acc.firebasestorage.app",
    messagingSenderId: "1042821662840",
    appId: "1:1042821662840:web:fd0a60fcfb2ccbf2efc58d"
    // measurementId: "G-XXXXXXX"   // optional — only needed if you enabled Analytics
};

// Accounts allowed to edit content from the admin page.
// Keep this in sync with the email list in firestore.rules and storage.rules.
export const ADMIN_EMAILS = [
    "bytesforbetterlives@gmail.com",
    "petr1264k@gmail.com",
    "lakeqiao3805@gmail.com",
    "js1154539@gmail.com"
];

const CDN = "https://www.gstatic.com/firebasejs/10.12.0";

// "Configured" = the placeholder apiKey has been replaced with a real one.
const isConfigured = typeof firebaseConfig.apiKey === "string" && !firebaseConfig.apiKey.startsWith("PASTE");

// Live module bindings — populated below once Firebase is configured.
export let app = null;
export let db = null;
export let auth = null;
export let storage = null;
export const firebaseReady = isConfigured;

if (isConfigured) {
    // Only fetch the SDK from the CDN when there's a real config to use.
    const [{ initializeApp }, { getFirestore }, { getAuth }, { getStorage }] = await Promise.all([
        import(`${CDN}/firebase-app.js`),
        import(`${CDN}/firebase-firestore.js`),
        import(`${CDN}/firebase-auth.js`),
        import(`${CDN}/firebase-storage.js`)
    ]);

    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);

    if (firebaseConfig.measurementId) {
        try {
            const { getAnalytics } = await import(`${CDN}/firebase-analytics.js`);
            getAnalytics(app);
        } catch (err) {
            console.warn("[BFBL] Analytics init skipped:", err);
        }
    }

    console.info("[BFBL] Firebase connected:", firebaseConfig.projectId);
} else {
    console.info(
        "[BFBL] Firebase not configured yet — the site is using local data.js. " +
        "Paste your firebaseConfig into firebase.js to enable Firestore/Auth/Storage."
    );
}

// Expose to classic (non-module) scripts like script.js.
window.BFBL_FIREBASE = { ready: firebaseReady, app, db, auth, storage, adminEmails: ADMIN_EMAILS };
