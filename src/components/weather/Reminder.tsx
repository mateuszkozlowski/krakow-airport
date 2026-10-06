"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { calendar } from "@/lib/weather/calendar";
import { text } from "@/lib/weather/copy";
import type { Locale, Operation } from "@/lib/weather/model";
import { Icon } from "./Icon";
function publicKey(value: string) {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
function watchSaved(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("krk-notification-change", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("krk-notification-change", listener);
  };
}
function readSaved() {
  try {
    return localStorage.getItem("krk-notification");
  } catch {
    return null;
  }
}
function decodeSaved(raw: string | null): { id: string; token: string } | null {
  try {
    const value = raw ? JSON.parse(raw) : null;
    return typeof value?.id === "string" && typeof value?.token === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}
export function Reminder({
  at,
  operation,
  locale,
}: {
  at: string;
  operation: Operation;
  locale: Locale;
}) {
  const t = text[locale];
  const [config, setConfig] = useState<{
    enabled: boolean;
    publicKey?: string;
  }>({ enabled: false });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [localSaved, setSaved] = useState<{ id: string; token: string } | null>(
    null,
  );
  const savedRaw = useSyncExternalStore(watchSaved, readSaved, () => null);
  const saved = localSaved ?? decodeSaved(savedRaw);
  useEffect(() => {
    if (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    )
      void fetch("/api/notifications", { signal: AbortSignal.timeout(10000) })
        .then((r) => r.json())
        .then(setConfig)
        .catch(() => {});
  }, []);
  async function subscribe() {
    setBusy(true);
    setMessage("");
    try {
      if (
        Date.parse(at) <= Date.now() ||
        Date.parse(at) > Date.now() + 48 * 3600000
      ) {
        setMessage(t.noSlot);
        return;
      }
      // Ask in direct response to the user's click.
      if ((await Notification.requestPermission()) !== "granted")
        throw new Error();
      const registered = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription =
        (await registered.pushManager.getSubscription()) ??
        (await registered.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey(config.publicKey!),
        }));
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          at,
          operation,
          locale,
          replace: saved,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      setSaved(result);
      try {
        localStorage.setItem("krk-notification", JSON.stringify(result));
        window.dispatchEvent(new Event("krk-notification-change"));
      } catch {
        /* Deletion credentials remain in memory. */
      }
      setMessage(t.pushSaved);
    } catch {
      setMessage(t.pushError);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saved),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error();
      setSaved(null);
      try {
        localStorage.removeItem("krk-notification");
        window.dispatchEvent(new Event("krk-notification-change"));
      } catch {
        /* Optional storage. */
      }
      setMessage(
        locale === "pl" ? "Powiadomienie usunięte." : "Notification removed.",
      );
    } catch {
      setMessage(t.pushError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="reminder">
      <summary>
        <Icon name="calendar" />
        {t.remind}
      </summary>
      <button
        className="button secondary"
        onClick={() => {
          const blob = new Blob([calendar(at, operation, locale)], {
            type: "text/calendar;charset=utf-8",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "krk-flight-reminder.ics";
          a.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
      >
        <Icon name="calendar" />
        {t.calendar}
      </button>
      <p className="muted small">{t.calendarNote}</p>
      {config.enabled ? (
        <>
          <button
            className="button secondary"
            disabled={busy}
            onClick={subscribe}
          >
            {t.push}
          </button>
          <p className="muted small">{t.pushNote}</p>
        </>
      ) : (
        <p className="muted small">{t.pushUnavailable}</p>
      )}
      {saved && (
        <button className="button secondary" onClick={remove} disabled={busy}>
          {t.pushRemove}
        </button>
      )}
      <p role="status" className="status-message">
        {message}
      </p>
    </details>
  );
}
