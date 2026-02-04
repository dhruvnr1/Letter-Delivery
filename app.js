// localStorage-based app
const StorageService = {
  USERS_KEY: 'letter_users',
  LETTERS_KEY: 'letter_letters',
  CURRENT_USER_KEY: 'letter_current_user',

  // Get all users
  getAllUsers() {
    return JSON.parse(localStorage.getItem(this.USERS_KEY) || '{}');
  },

  // Save all users
  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },

  // Get user by email
  getUserByEmail(email) {
    const users = this.getAllUsers();
    return users[email] || null;
  },

  // Get user by username
  getUserByUsername(username) {
    const users = this.getAllUsers();
    for (const email in users) {
      if (users[email].username === username) {
        return { email, ...users[email] };
      }
    }
    return null;
  },

  // Create user
  createUser(email, password, username) {
    const users = this.getAllUsers();
    if (users[email]) {
      throw new Error('User already exists');
    }
    users[email] = { email, password, username, createdAt: new Date().toISOString() };
    this.saveUsers(users);
  },

  // Verify user credentials
  verifyUser(email, password) {
    const user = this.getUserByEmail(email);
    if (!user || user.password !== password) {
      throw new Error('Invalid email or password');
    }
    return user;
  },

  // Get all letters
  getAllLetters() {
    return JSON.parse(localStorage.getItem(this.LETTERS_KEY) || '[]');
  },

  // Save all letters
  saveLetters(letters) {
    localStorage.setItem(this.LETTERS_KEY, JSON.stringify(letters));
  },

  // Get letters for recipient
  getLettersForRecipient(recipientEmail) {
    return this.getAllLetters().filter(letter => letter.recipientEmail === recipientEmail);
  },

  // Create letter
  createLetter(subject, body, fromUsername, toEmail) {
    const letters = this.getAllLetters();
    const letter = {
      id: Date.now().toString(),
      subject,
      body,
      from: fromUsername,
      recipientEmail: toEmail,
      createdAt: new Date().toLocaleString(),
      read: false
    };
    letters.push(letter);
    this.saveLetters(letters);
    return letter;
  },

  // Mark letter as read
  markLetterAsRead(letterId) {
    const letters = this.getAllLetters();
    const letter = letters.find(l => l.id === letterId);
    if (letter) {
      letter.read = true;
      this.saveLetters(letters);
    }
  },

  // Delete letter
  deleteLetter(letterId) {
    const letters = this.getAllLetters();
    const filtered = letters.filter(l => l.id !== letterId);
    this.saveLetters(filtered);
  },

  // Delete all letters for user
  deleteAllLettersForUser(email) {
    const letters = this.getAllLetters();
    const filtered = letters.filter(l => l.recipientEmail !== email);
    this.saveLetters(filtered);
  },

  // Set current user
  setCurrentUser(email) {
    localStorage.setItem(this.CURRENT_USER_KEY, email);
  },

  // Get current user
  getCurrentUser() {
    return localStorage.getItem(this.CURRENT_USER_KEY);
  },

  // Logout
  logout() {
    localStorage.removeItem(this.CURRENT_USER_KEY);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // ---=== AUTHENTICATION LOGIC ===---

  const welcomeMessage = document.getElementById("welcome-message");
  const logoutButton = document.getElementById("logout-button");
  const onAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html');
  const currentUserEmail = StorageService.getCurrentUser();

  // Check if user is logged in
  if (currentUserEmail) {
    if (onAuthPage) {
      window.location.href = "index.html";
    }
    if (welcomeMessage) {
      const user = StorageService.getUserByEmail(currentUserEmail);
      welcomeMessage.textContent = `Signed in as ${user.username}`;
    }
  } else {
    if (!onAuthPage) {
      window.location.href = "login.html";
    }
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      StorageService.logout();
      window.location.href = "login.html";
    });
  }


  // ---=== LOGIN PAGE ===---
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      try {
        StorageService.verifyUser(email, password);
        StorageService.setCurrentUser(email);
        window.location.href = "index.html";
      } catch (error) {
        alert(error.message);
      }
    });
  }

  // ---=== SIGNUP PAGE ===---
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.getElementById("username").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      // Basic validation
      if (!username || !email || !password) {
          alert("Please fill in all fields.");
          return;
      }

      try {
        StorageService.createUser(email, password, username);
        StorageService.setCurrentUser(email);
        window.location.href = "index.html";
      } catch (error) {
        alert(error.message);
      }
    });
  }

  // ---=== WRITE LETTER PAGE (index.html) ===---
  const letterForm = document.getElementById("letter-form");
  if (letterForm) {
    letterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const subject = document.getElementById("subject").value.trim();
      const recipientUsername = document.getElementById("recipient").value.trim();
      const body = document.getElementById("body").value.trim();
      const currentUserEmail = StorageService.getCurrentUser();

      if (!subject || !body || !recipientUsername) {
        alert("Please fill out all fields.");
        return;
      }
      
      if (!currentUserEmail) {
        alert("You must be logged in to send a letter.");
        return;
      }

      try {
        // Find the recipient by username
        const recipient = StorageService.getUserByUsername(recipientUsername);
        if (!recipient) {
          alert("Recipient not found!");
          return;
        }

        const currentUser = StorageService.getUserByEmail(currentUserEmail);
        const fromUsername = currentUser.username;

        // Create the letter
        StorageService.createLetter(subject, body, fromUsername, recipient.email);
        alert("Letter sent successfully!");
        letterForm.reset();
        window.location.href = "mailbox.html";

      } catch (error) {
        console.error("Error sending letter:", error);
        alert("Failed to send letter. Please try again.");
      }
    });
  }

  // ---=== MAILBOX PAGE ===---
  const mailboxEl = document.getElementById("mailbox");
  if (mailboxEl) {
    const currentUserEmail = StorageService.getCurrentUser();
    if (!currentUserEmail) return;

    const letters = StorageService.getLettersForRecipient(currentUserEmail);
    let currentlyOpenImage = null;

    if (letters.length === 0) {
      mailboxEl.innerHTML = "<p>Your mailbox is empty.</p>";
    } else {
      // Sort by date (newest first)
      letters.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      letters.forEach(letter => {
        const card = document.createElement("div");
        card.className = "envelope-card";
        card.dataset.letterId = letter.id;

        card.innerHTML = `
          <div class="envelope-image-wrapper">
            <img src="img/envelope.png" alt="Envelope" class="envelope-image ${letter.read ? '' : 'unread'}" />
          </div>
          <div class="card-meta">
            <div>${letter.subject}</div>
            <div style="font-size:0.75rem; opacity:0.8;">From: ${letter.from}</div>
            <div style="font-size:0.75rem; opacity:0.8;">${letter.createdAt}</div>
          </div>
        `;

        const imgEl = card.querySelector(".envelope-image");

        card.addEventListener("click", () => {
          // Reset previously opened envelope
          if (currentlyOpenImage && currentlyOpenImage !== imgEl) {
            currentlyOpenImage.src = "img/envelope.png";
          }

          // Set this one to open
          imgEl.src = "img/envelopeOpen.png";
          currentlyOpenImage = imgEl;

          // Mark as read
          StorageService.markLetterAsRead(letter.id);

          openModal(letter);
        });

        mailboxEl.appendChild(card);
      });
    }
  }

  // ---=== MODAL LOGIC (Mailbox) ===---
  const modal = document.getElementById("letter-modal");
  const closeBtn = document.getElementById("close-modal");
  const modalSubject = document.getElementById("modal-subject");
  const modalBody = document.getElementById("modal-body");

  function openModal(letter) {
    modalSubject.textContent = letter.subject;
    modalBody.textContent = letter.body;
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
    clearMailboxButton.addEventListener("click", () => {
      const currentUserEmail = StorageService.getCurrentUser();
      if (!currentUserEmail) return;
      
      if (!confirm("Are you sure you want to delete all letters in your mailbox? This cannot be undone.")) {
        return;
      }
      
      try {
        StorageService.deleteAllLettersForUser(currentUserEmail);
        alert("Mailbox cleared!");
        window.location.reload();
      } catch (error) {
        console.error("Error clearing mailbox:", error);
        alert("Could not clear mailbox. Please try again.");
      }
    });
  }

});