# The shared Carnet works offline

The fingerstick is often logged with no signal, and the signed-in Carnet is the log two Members share. A Member can consult and record it with no network on web and mobile after that device has opened it online. Catch-up runs when that Member is using the Carnet and the network is back, not while the app is closed. They resolve a Clash; the value they do not keep is archived. The unsigned device journal is not part of the Carnet.

## Considered options

- Leave the signed-in Carnet online-only. The device journal already works offline and never becomes the shared Carnet.
- Last write wins. A fingerstick would be replaced with no choice.
- Catch up in the background when the network returns. That needs a new store binary, and the Reading is already on the device.

## Consequences

Signing out finishes catch-up first. A revoked session cannot write the Carnet. A Reading that never caught up exists only on that device.
