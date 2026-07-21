---
'@senseering/urbanos-bridge': minor
---

Complete the embed protocol v2 message set beyond the token/context core:

- **`ready`** (guest → host) — the app mounted and connected; `host.onReady()`.
- **`navigate`** (host → guest) — deep-link the embedded app; `host.navigate(path)`
  / `bridge.onNavigate()`.
- **`route.changed`** (guest → host) — mirror the app's route into the shell URL;
  `bridge.notifyRoute(path)` / `host.onRouteChanged()`.
- **`resize`** (guest → host) — request a content height; `bridge.requestResize(px)`
  / `host.onResize()`.
- **`ui.toast`** (guest → host) — show a toast in the shell chrome;
  `bridge.toast({title})` / `host.onToast()`.

All fire-and-forget events over the same envelope; the user session still never
crosses the bridge.
