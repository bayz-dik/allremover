// AllRemover — Firebase Auth + Firestore Pro gate.
// Loaded lazily (only when the user opens the Pro modal) so the free, offline
// tool never pays the cost of the Firebase SDK. The config below is public by
// design; real security lives in Firestore Rules (client can read only its own
// user doc, and can never write Pro status — only our server may).
//
// We load Firebase from Google's official gstatic CDN (not esm.sh): it's the
// supported way to use the modular SDK straight in the browser and is far more
// reliable for a package as large as Firebase.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDdOUB7nhZtj8vgXKO0tKslVv61jocTwOU",
  authDomain: "allremover.firebaseapp.com",
  projectId: "allremover",
  storageBucket: "allremover.firebasestorage.app",
  messagingSenderId: "80802162662",
  appId: "1:80802162662:web:1a8c53ef36e482304b9827"
};

const V = "10.12.2";
const CDN = `https://www.gstatic.com/firebasejs/${V}`;
let _fb = null;

// One-time SDK load + init. Returns the handles we need.
async function ensureFirebase() {
  if (_fb) return _fb;
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(FIREBASE_CONFIG);
  _fb = {
    auth: authMod.getAuth(app),
    db: fsMod.getFirestore(app),
    authMod, fsMod,
  };
  return _fb;
}

// Subscribe to auth state. `cb` is called with the Firebase user (or null)
// every time it changes, including once on load.
export async function watchAuth(cb) {
  const { auth, authMod } = await ensureFirebase();
  authMod.onAuthStateChanged(auth, cb);
}

export async function loginWithGoogle() {
  const { auth, authMod } = await ensureFirebase();
  const provider = new authMod.GoogleAuthProvider();
  // Popups are unreliable on mobile browsers (often silently blocked), so try
  // popup first and fall back to a full-page redirect when it fails.
  try {
    const { user } = await authMod.signInWithPopup(auth, provider);
    return user;
  } catch (e) {
    const code = e && e.code;
    if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" || code === "auth/operation-not-supported-in-this-environment") {
      await authMod.signInWithRedirect(auth, provider); // returns via getRedirectResult on reload
      return null;
    }
    throw e;
  }
}

// Call once on load: completes a redirect-based sign-in if one is pending.
export async function completeRedirectLogin() {
  const { auth, authMod } = await ensureFirebase();
  try {
    const res = await authMod.getRedirectResult(auth);
    return res && res.user ? res.user : null;
  } catch (e) {
    console.warn("redirect login result error", e);
    return null;
  }
}

export async function logout() {
  const { auth, authMod } = await ensureFirebase();
  await authMod.signOut(auth);
}

// Read the user's subscription doc and return the Pro expiry as a JS Date,
// or null if there's no active subscription. Firestore stores `proUntil` as a
// millisecond timestamp (set by our server after a confirmed payment).
export async function getProUntil(uid) {
  const { db, fsMod } = await ensureFirebase();
  const snap = await fsMod.getDoc(fsMod.doc(db, "users", uid));
  if (!snap.exists()) return null;
  const ms = snap.data().proUntil;
  if (typeof ms !== "number") return null;
  const until = new Date(ms);
  return until.getTime() > Date.now() ? until : null;
}
