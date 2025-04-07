// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCLhGPmOq0HZfywgl8KmRE2tfD0ZOALO6s",
  authDomain: "codeit-cb0ee.firebaseapp.com",
  projectId: "codeit-cb0ee",
  storageBucket: "codeit-cb0ee.firebasestorage.app",
  messagingSenderId: "334979637556",
  appId: "1:334979637556:web:4090c537d042b726ba4561",
  measurementId: "G-ZBZGNJ0HKX"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// Get references to services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const functions = firebase.functions && firebase.functions();

// Add this for debugging
console.log("Auth service available:", !!auth);
console.log("Firestore service available:", !!db);

// Check if user is admin
function isUserAdmin() {
  return new Promise((resolve, reject) => {
    const user = auth.currentUser;
    if (!user) {
      resolve(false);
      return;
    }
    
    // Check if we have user document with admin flag
    db.collection('users').doc(user.uid).get()
      .then((doc) => {
        if (doc.exists && doc.data().isAdmin === true) {
          resolve(true);
        } else {
          // Get user's custom claims (admin status) as fallback
          user.getIdTokenResult()
            .then((idTokenResult) => {
              resolve(idTokenResult.claims.admin === true);
            })
            .catch((error) => {
              console.error("Error checking admin status:", error);
              resolve(false);
            });
        }
      })
      .catch((error) => {
        console.error("Error checking admin status in Firestore:", error);
        // Fallback to token claims
        user.getIdTokenResult()
          .then((idTokenResult) => {
            resolve(idTokenResult.claims.admin === true);
          })
          .catch((error) => {
            console.error("Error checking admin status:", error);
            resolve(false);
          });
      });
  });
}

// Function to update user admin status in Firebase (would normally be done server-side)
function setUserAdminStatus(email, isAdmin) {
  return new Promise((resolve, reject) => {
    // For demo purposes only - in a real app, this would be handled by a Cloud Function
    // to ensure security
    db.collection('users').where('email', '==', email).get()
      .then((querySnapshot) => {
        if (querySnapshot.empty) {
          reject(new Error('User not found'));
          return;
        }
        
        const batch = db.batch();
        querySnapshot.forEach((doc) => {
          batch.update(doc.ref, { 
            isAdmin: isAdmin,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        
        return batch.commit();
      })
      .then(() => {
        resolve();
      })
      .catch((error) => {
        reject(error);
      });
  });
}

// Add user activity logging helper function
function logUserActivity(type, data = {}) {
    const user = auth.currentUser;
    
    if (!user) return Promise.reject(new Error('No authenticated user'));
    
    const activityData = {
        userId: user.uid,
        userName: user.displayName || user.email.split('@')[0],
        userEmail: user.email,
        type: type,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ...data
    };
    
    return db.collection('activity').add(activityData);
}

// Update user's last active timestamp
function updateUserActivity() {
    const user = auth.currentUser;
    
    if (!user) return;
    
    db.collection('users').doc(user.uid).update({
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => {
        console.error("Error updating user activity:", error);
    });
}

// Set up listener to update user activity
auth.onAuthStateChanged(user => {
    if (user) {
        updateUserActivity();
        
        // Set up interval to update activity while user is on the site
        const activityInterval = setInterval(() => {
            updateUserActivity();
        }, 5 * 60 * 1000); // Update every 5 minutes
        
        // Clear interval when user logs out
        window.addEventListener('beforeunload', () => {
            clearInterval(activityInterval);
        });
    }
});