self.addEventListener("push", (event) => {
  try {
    const payload = event.data.json();
    event.waitUntil(
      self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: "/app-icon-192.png",
        tag: payload.tag,
        data: { url: payload.url },
      }),
    );
  } catch {
    /* Ignore malformed messages. */
  }
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const candidate = new URL(
    event.notification.data?.url || "/pl",
    self.location.origin,
  );
  const url =
    candidate.origin === self.location.origin
      ? candidate.href
      : self.location.origin + "/pl";
  event.waitUntil(self.clients.openWindow(url));
});
