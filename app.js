import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js";
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    setDoc,
    updateDoc,
    orderBy,
    deleteDoc,
    Timestamp,
    getDoc
} from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";


document.addEventListener('DOMContentLoaded', () => {
    // ---=== AUTHENTICATION LOGIC ===---

    const welcomeMessage = document.getElementById("welcome-message");
    const logoutButton = document.getElementById("logout-button");
    const onAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html');
    const mailboxEl = document.getElementById("mailbox");

    onAuthStateChanged(auth, async user => {
        if (user) {
            if (onAuthPage) {
                window.location.href = "index.html";
            }
            if (welcomeMessage) {
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    welcomeMessage.textContent = `Signed in as ${userDoc.data().username}`;
                } else {
                    welcomeMessage.textContent = `Signed in as ${user.email}`;
                }
            }
            // If we are on a page with a mailbox, initialize it.
            if (mailboxEl) {
                initializeMailbox(user);
            }
        } else {
            if (!onAuthPage) {
                window.location.href = "login.html";
            }
        }
    });

    if (logoutButton) {
        logoutButton.addEventListener("click", (e) => {
            e.preventDefault();
            signOut(auth).then(() => {
                window.location.href = "login.html";
            });
        });
    }

    // ---=== LOGIN PAGE ===---
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();

            signInWithEmailAndPassword(auth, email, password)
                .then(() => {
                    window.location.href = "index.html";
                })
                .catch(error => {
                    alert(error.message);
                });
        });
    }

    // ---=== SIGNUP PAGE ===---
    const signupForm = document.getElementById("signup-form");
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("username").value.trim();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();

            if (!username || !email || !password) {
                alert("Please fill in all fields.");
                return;
            }

            try {
                console.log("Signup process started for username:", username);

                const lowercaseUsername = username.toLowerCase();
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("username_lowercase", "==", lowercaseUsername));

                console.log("Checking for existing username...");
                const querySnapshot = await getDocs(q);
                console.log("Username check complete. Snapshot is empty:", querySnapshot.empty);


                if (!querySnapshot.empty) {
                    console.log("Username already exists. Stopping process.");
                    alert("Username already exists. Please choose another one.");
                    return;
                }

                console.log("Creating user in Firebase Authentication...");
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                console.log("Firebase Auth user created successfully. UID:", user.uid);

                console.log("Attempting to write user document to Firestore...");
                await setDoc(doc(db, "users", user.uid), {
                    username: username,
                    username_lowercase: lowercaseUsername,
                    email: email,
                });
                console.log("Firestore document written successfully!");

                console.log("Redirecting to index.html...");
                window.location.href = "index.html";

            } catch (error) {
                console.error("An error occurred during signup:", error);
                alert("An error occurred: " + error.message);
            }
        });
    }


    // ---=== WRITE LETTER PAGE (index.html) ===---
    const letterForm = document.getElementById("letter-form");
    if (letterForm) {
        letterForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const subject = document.getElementById("subject").value.trim();
            const recipientUsername = document.getElementById("recipient").value.trim();
            const body = document.getElementById("body").value.trim();
            const currentUser = auth.currentUser;

            if (!subject || !body || !recipientUsername) {
                alert("Please fill out all fields.");
                return;
            }

            if (!currentUser) {
                alert("You must be logged in to send a letter.");
                return;
            }

            try {
                // 1. Find the recipient by username in Firestore (case-insensitive)
                const lowercaseRecipient = recipientUsername.toLowerCase();
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("username_lowercase", "==", lowercaseRecipient));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    alert("Recipient not found!");
                    return;
                }

                const recipient = querySnapshot.docs[0].data();
                const recipientEmail = recipient.email;

                // 2. Get the sender's username
                const senderDoc = await getDoc(doc(db, "users", currentUser.uid));
                const fromUsername = senderDoc.exists() ? senderDoc.data().username : currentUser.email;

                // 3. Create the letter in Firestore
                await addDoc(collection(db, "letters"), {
                    subject: subject,
                    body: body,
                    fromUsername: fromUsername,
                    recipientEmail: recipientEmail,
                    createdAt: Timestamp.fromDate(new Date()),
                    read: false
                });

                alert("Letter sent successfully!");
                letterForm.reset();
                window.location.href = "mailbox.html";

            } catch (error) {
                console.error("Error sending letter:", error);
                alert("Failed to send letter. Please try again.");
            }
        });
    }

    // ---=== MAILBOX PAGE INITIALIZATION ===---
    async function initializeMailbox(currentUser) {
        if (!currentUser) return;
        const mailboxEl = document.getElementById("mailbox");
        if (!mailboxEl) return;

        try {
            let currentlyOpenImage = null;
            const lettersRef = collection(db, "letters");
            const q = query(lettersRef, where("recipientEmail", "==", currentUser.email), orderBy("createdAt", "desc"));
            console.log("Mailbox query:", q);

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                mailboxEl.innerHTML = "<p>Your mailbox is empty.</p>";
            } else {
                mailboxEl.innerHTML = ''; // Clear the mailbox before adding new letters
                querySnapshot.forEach(docSnapshot => {
                    const letter = docSnapshot.data();
                    const letterId = docSnapshot.id;
                    const card = document.createElement("div");
                    card.className = "envelope-card";
                    card.dataset.letterId = letterId;

                    card.innerHTML = `
                        <div class="envelope-image-wrapper">
                            <img src="img/envelope.png" alt="Envelope" class="envelope-image ${letter.read ? '' : 'unread'}" />
                        </div>
                        <div class="card-meta">
                            <div>${letter.subject}</div>
                            <div style="font-size:0.75rem; opacity:0.8;">From: ${letter.fromUsername}</div>
                            <div style="font-size:0.75rem; opacity:0.8;">${letter.createdAt.toDate().toLocaleString()}</div>
                        </div>
                    `;

                    const imgEl = card.querySelector(".envelope-image");

                    card.addEventListener("click", async () => {
                        console.log("Card clicked!", letterId);
                        // Reset previously opened envelope
                        if (currentlyOpenImage && currentlyOpenImage !== imgEl) {
                            currentlyOpenImage.src = "img/envelope.png";
                        }

                        // Set this one to open
                        imgEl.src = "img/envelopeOpen.png";
                        currentlyOpenImage = imgEl;

                        // Mark as read in Firestore
                        const letterDocRef = doc(db, "letters", letterId);
                        await updateDoc(letterDocRef, { read: true });

                        // Open modal with letter content
                        openModal(letter);
                    });

                    mailboxEl.appendChild(card);
                });
            }
        } catch (error) {
            console.error("Error fetching mailbox:", error);
            mailboxEl.innerHTML = "<p style='color: red;'>Could not fetch mailbox. Please check the developer console for errors.</p>";
        }
    }


    // ---=== MODAL LOGIC (Mailbox) ===---
    const modal = document.getElementById("letter-modal");
    const note = document.querySelector(".note");
    const closeBtn = document.getElementById("close-modal");
    const modalSubject = document.getElementById("modal-subject");
    const modalBody = document.getElementById("modal-body");

    function openModal(letter) {
        modalSubject.textContent = letter.subject;
        modalBody.textContent = letter.body;
        // This logic for card images needs to be re-evaluated if storing images in Firebase Storage
        if (letter.cardImage) {
            note.style.backgroundImage = `url(${letter.cardImage})`;
            note.style.backgroundSize = "cover";
            note.style.backgroundPosition = "center";
        } else {
            note.style.backgroundImage = "url('img/letter.png')";
            note.style.backgroundSize = "100% 100%";
        }
        modal.classList.remove("hidden");
    }

    function closeModal() {
        modal.classList.add("hidden");
        const openCard = document.querySelector('.envelope-image[src="img/envelopeOpen.png"]');
        if (openCard) {
            openCard.src = 'img/envelope.png';
        }
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", closeModal);
    }

    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }


    // ---=== CLEAR MAILBOX ===---
    const clearMailboxButton = document.getElementById("clear-mailbox-button");
    if (clearMailboxButton) {
        clearMailboxButton.addEventListener("click", async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            if (!confirm("Are you sure you want to delete all letters in your mailbox? This cannot be undone.")) {
                return;
            }

            try {
                const lettersRef = collection(db, "letters");
                const q = query(lettersRef, where("recipientEmail", "==", currentUser.email));
                const querySnapshot = await getDocs(q);

                const deletePromises = [];
                querySnapshot.forEach((doc) => {
                    deletePromises.push(deleteDoc(doc.ref));
                });
                await Promise.all(deletePromises);

                alert("Mailbox cleared!");
                window.location.reload();
            } catch (error) {
                console.error("Error clearing mailbox:", error);
                alert("Could not clear mailbox. Please try again.");
            }
        });
    } else {
      console.log("Button not found");
    }

});