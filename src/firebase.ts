// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore/lite";
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
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Requests

export type Leader = {
  id: string;
  player: string;
  level: string;
  time: number;
  date: string;
};

export async function getLeaderboard(level: string): Promise<Leader[]> {
  try {
    const colRef = collection(db, "leaderboard");
    const q = query(
      colRef,
      where("level", "==", level), // Add a where clause to filter by the 'level' field
      orderBy("time", "asc"), // Sorting by time in ascending order
      limit(10) // Limiting the results to 10
    );
    const docsRef = await getDocs(q);

    return (
      docsRef.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Leader)) || []
    );
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function addPayerToLeaderboard(
  player: string,
  time: number,
  level: string
) {
  try {
    const oneHour = 60 * 60 * 1000;
    if (!level || !player || !time || Number.isNaN(+time) || time >= oneHour) {
      throw new Error("Invalid request body");
    }
    const docRef = await addDoc(collection(db, "leaderboard"), {
      player,
      time,
      level,
      date: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.log(error);
  }
}

// Analytics

export function trackGameStart() {
  logEvent(analytics, "sapper_game_start");
}

export function trackFlagCell() {
  logEvent(analytics, "sapper_flag_cell");
}

export function trackGameWin(time: number, level: string) {
  logEvent(analytics, "sapper_game_win", {
    time,
    level,
  });
}

export function trackGameLoss(time: number, level: string) {
  logEvent(analytics, "sapper_game_loss", {
    time,
    level,
  });
}

export function trackSignGame(time: number, player: string, level: string) {
  logEvent(analytics, "sapper_sign_game", {
    time,
    player,
    level,
  });
}
