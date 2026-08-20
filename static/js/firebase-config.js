import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDqpiZaK6Ik5V_u_xECktaLAl-DTqyOqR8",
  authDomain: "libmanager-c5ba4.firebaseapp.com",
  databaseURL: "https://libmanager-c5ba4-default-rtdb.firebaseio.com",
  projectId: "libmanager-c5ba4",
  storageBucket: "libmanager-c5ba4.firebasestorage.app",
  messagingSenderId: "1024963085825",
  appId: "1:1024963085825:web:18c59c6d0ee946970d2200",
  measurementId: "G-TJTFVLE7ES",
};

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

window.firebaseApp = firebaseApp;
window.firebaseDatabase = database;

isSupported()
  .then((supported) => {
    if (supported) {
      window.firebaseAnalytics = getAnalytics(firebaseApp);
    }
  })
  .catch(() => {});

export { firebaseApp, database };
