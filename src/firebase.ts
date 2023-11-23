// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: "sapper-1880c.firebaseapp.com",
  projectId: "sapper-1880c",
  storageBucket: "sapper-1880c.appspot.com",
  messagingSenderId: "337069807738",
  appId: "1:337069807738:web:99b334d7e277bf71f483c3",
  measurementId: "G-WPWT1H4DJB",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Analytics

export function trackGameStart() {
  logEvent(analytics, "sapper_game_start");
}

export function trackFlagCell() {
  logEvent(analytics, "sapper_flag_cell");
}

export function trackGameWin(time: number) {
  logEvent(analytics, "sapper_game_win", {
    time,
  });
}

export function trackGameLoss(time: number) {
  logEvent(analytics, "sapper_game_loss", {
    time,
  });
}

export function trackSignGame(time: number, player: string) {
  logEvent(analytics, "sapper_sign_game", {
    time,
    player,
  });
}
