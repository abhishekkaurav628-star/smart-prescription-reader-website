"use client";

/**
 * Firebase Cloud Messaging (web push) registration.
 * Requires NEXT_PUBLIC_FIREBASE_* variables — see .env.example.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.messagingSenderId && config.appId && vapidKey);

/** Asks for permission, registers the service worker and returns the FCM device token. */
export async function registerForPush(): Promise<string> {
  if (!firebaseConfigured) throw new Error("Firebase is not configured.");
  if (!("serviceWorker" in navigator) || typeof Notification === "undefined") {
    throw new Error("Push notifications are not supported in this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");

  const { initializeApp, getApps } = await import("firebase/app");
  const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
  if (!(await isSupported())) throw new Error("Push messaging is not supported in this browser.");

  const app = getApps()[0] ?? initializeApp(config);
  const params = new URLSearchParams(config);
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`);
  await navigator.serviceWorker.ready;

  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Could not get a device token from Firebase.");
  return token;
}
