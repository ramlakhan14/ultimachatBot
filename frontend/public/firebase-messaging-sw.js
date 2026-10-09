
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');


firebase.initializeApp({
  apiKey: "AIzaSyB346aJHplItPlWoEWmPgm1WfOq9pWVf_Q",
  authDomain: "ultimabotai.firebaseapp.com",
  projectId: "ultimabotai",
  storageBucket: "ultimabotai.firebasestorage.app",
  messagingSenderId: "910952770546",
  appId: "1:910952770546:web:4c3199b1b00b24b5b6d96b",
  measurementId: "G-9EHJK6F88W",
});

// REACT_APP_FIREBASE_API_KEY=AIzaSyB346aJHplItPlWoEWmPgm1WfOq9pWVf_Q
// REACT_APP_FIREBASE_AUTH_DOMAIN=ultimabotai.firebaseapp.com
// REACT_APP_FIREBASE_PROJECT_ID=ultimabotai
// REACT_APP_FIREBASE_STORAGE_BUCKET=ultimabotai.firebasestorage.app
// REACT_APP_FIREBASE_MESSAGING_SENDER_ID=910952770546
// REACT_APP_FIREBASE_APP_ID=1:910952770546:web:4c3199b1b00b24b5b6d96b
// REACT_APP_FIREBASE_MEASUREMENT_ID=G-9EHJK6F88W
// REACT_APP_FIREBASE_VAPID_KEY=BIoeqW3gQpWtHy7KoXuFDg_GuKw_1uv1734MeNueQRsmh86GKq7Ij65FBYgleFJxTIrX_XkT_PmhgWwsOGg-ku8


// firebase.initializeApp(firebaseConfig);

// Retrieve firebase messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function (payload) {
  // console.log('Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png', // Update with your app's icon
    data: payload.data // Include any custom data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();

  // This looks to see if the current is already open and focuses if it is
  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(clientList => {
      // If a client already exists, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          return;
        }
      }
      // If no client exists, open a new one
      if (clients.openWindow) {
        return clients.openWindow('/notifications');
      }
    })
  );
});
