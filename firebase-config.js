// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";

// Your web app's Firebase configuration (from your index.html)
const firebaseConfig = {
    apiKey: "AIzaSyD7dXshlVazSu_7oC02TtiPW5ZOydraPkY",
    authDomain: "letter-delivery.firebaseapp.com",
    projectId: "letter-delivery",
    storageBucket: "letter-delivery.firebasestorage.app",
    messagingSenderId: "486787867144",
    appId: "1:486787867144:web:dde03ee9200165490be7bd",
    measurementId: "G-8Y4QDD5EGH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };