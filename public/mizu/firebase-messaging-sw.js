// This file is required only if you use Firebase push notifications. Otherwise it is not loaded.
// In order to receive the Push Notifications, your app must define the Firebase messaging service worker in firebase-messaging-sw.js
// !!! IMPORTANT: If you use Push notifications, then this file must be located in the root directory of your web page where you are hosting the webphone (NOT in the root directory of the webphone). Example: https://www.domain.com/firebase-messaging-sw.js !!!
importScripts(
  "http://localhost:63342/webphone_idea/js/firebasejs/firebase-app.js",
);
importScripts(
  "http://localhost:63342/webphone_idea/js/firebasejs/firebase-messaging.js",
);

// FCM/Firebase Push Notifications configuration
var fcm_config = {
  // also defined in firebase-messaging-sw.js
  apiKey: "***",
  authDomain: "xxx.firebaseapp.com",
  databaseURL: "https://xxx.firebaseio.com",
  projectId: "xxx",
  storageBucket: "xxx.appspot.com",
  messagingSenderId: "11111",
};

firebase.initializeApp(fcm_config);

var messaging = firebase.messaging();
messaging.setBackgroundMessageHandler(function (payload) {
  console.log(
    "[firebase-messaging-sw.js] EVENT, FCM Received background message ",
    payload,
  );
  // Customize notification here
  var notificationTitle = "Webphone";
  var notificationBody = "Incoming call";
  if (typeof payload && payload !== null) {
    if (typeof payload.title !== "undefined" && payload.title !== null) {
      notificationTitle = payload.title;
    }
    if (typeof payload.body !== "undefined" && payload.body !== null) {
      notificationBody = payload.body;
    }
  }
  var notificationOptions = {
    body: notificationBody,
    icon: "", // icon image path, ex: 'images/notification-icon.png'
  };

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions,
  );
});
