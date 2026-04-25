import { registerCampusServiceWorker } from "./offline-access";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function supportsBrowserPush() {
  return typeof window !== "undefined"
    && "Notification" in window
    && "serviceWorker" in navigator
    && "PushManager" in window;
}

export async function subscribeBrowserToPush(publicKey: string) {
  if (!supportsBrowserPush()) {
    throw new Error("Este navegador no soporta web push.");
  }

  if (!publicKey) {
    throw new Error("No hay VAPID public key configurada.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Necesitas permitir notificaciones del navegador para activar web push.");
  }

  const registration = await registerCampusServiceWorker();
  if (!registration) {
    throw new Error("No pudimos registrar el service worker del campus.");
  }
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return existing;
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });
}
