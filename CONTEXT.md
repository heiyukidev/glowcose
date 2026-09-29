# Gluciel

Personal glucose log (carnet de glycémie). French-first. Not a medical device.

## Language

**Carnet**:
The shared glucose log of exactly one person's glycemia. A Member can consult and record it with no network.
_Avoid_: Profile, household, org, account

**Subject**:
The person whose glucose the Carnet records. A Carnet has one Subject.
_Avoid_: Patient, user, profile

**Member**:
A signed-in person who can operate a Carnet (add, edit, archive).
_Avoid_: User, collaborator, role

**Author**:
The Member who recorded a given Reading.
_Avoid_: Owner, creator, user

**Reading**:
One capillary (fingerstick) glucose observation in the Carnet, stored canonically as `valueMgDl`, from the moment the Member saves it. Taken before or after a breakfast, lunch, or dinner Meal, or on an Other Meal. The Member does not create a Meal directly: they add a Reading and choose before/after a meal, or Autre.
_Avoid_: Measurement, entry, value (alone), CGM point, scan, draft

**Invite**:
A short-lived code that adds a second Member to a Carnet.
_Avoid_: Share link (as the domain object), invitation email

**Correspondence**:
The Member-chosen pairing of one CSV column to one Reading field for an import.
_Avoid_: Mapping, schema, matching, binding

**Meal**:
What a Reading sits on: breakfast, lunch, dinner, or Other. Photos and the Note belong to the Meal, not the fingerstick. Breakfast, lunch, and dinner: at most one per Carnet per local day per slot; each Phase sits on it, and an after may attach across midnight within 12 hours.
_Avoid_: Occasion, event, context (as the meal itself)

**Phase**:
Where a Reading sits on a breakfast, lunch, or dinner: before, after, 1h, or 2h. At most one live Reading per Phase on that Meal.
_Avoid_: Slot, context, side

**Other**:
A Meal that is not breakfast, lunch, or dinner. Many per day, one Reading each; Photos and Note are not shared with another Other.
_Avoid_: Snack (as a first-class slot), miscellaneous, uncategorized

**Note**:
Optional text about what was eaten, attached to a Meal. A Note not kept at catch-up is remembered on the archived Reading when a Reading was archived, otherwise on the Meal, and can be applied as the Meal’s Note.
_Avoid_: Comment, remark, description

**Photo**:
A meal picture attached to a Meal. A Meal may have several Photos.
_Avoid_: Image, picture, attachment, file, preview

**Catch-up**:
The moment Readings, Notes, and Photos a Member saved with no network become visible on the Carnet’s other devices, including the other Member’s. It happens when that Member is using the Carnet and the network is back. A Reading stays on the Meal and Phase that Member saw.
_Avoid_: Sync, merge, upload, draft

**Clash**:
Two claims on the same Phase of the same Meal when a device catches up, either two live Readings or two values of one Reading. The Member catching up keeps one; the other is archived at that same time and Phase, authored by the Member who wrote it. Until that choice, their device still shows their own Reading on the Meal, and the other Member still sees only what was already on the shared Carnet.
_Avoid_: Conflict, duplicate, sync error

**Archive**:
A Reading that stays in the Carnet and no longer occupies its Phase. A Member’s own Archive cannot be restored. A Reading set aside by a Clash can be restored until that card is closed, and only when its Phase is free; an occupied Phase is a Clash.
_Avoid_: Delete, remove

**Rappel**:
A Member-scheduled local ping on their phone to come back and add the missing after Reading on a breakfast, lunch, or dinner Meal. At most one active Rappel per Meal for that Member; a new schedule replaces the previous. Only the Member who scheduled it is reminded. Fired about two hours after they tap; the notification names the Meal. Not used for Other Meals. Scheduling UI lives in the mobile app only.
_Avoid_: Notification, alert, alarm, push (as the domain object), reminder (in FR UI copy)

## Mobile shipping

JS, styling, and bundled assets on mobile ship with **EAS Update** on the matching `runtimeVersion` (`appVersion` policy: `0.2.0` today). Native changes (new native module, SDK bump, permissions, splash) need a new store / TestFlight binary. An OTA cannot add native capabilities (see ADR 0002 file picker, ADR 0004).

**EAS env for Gluciel OTAs:** always `--environment preview`, even on the `production` channel. The Expo account `production` environment also carries account-wide Kristine vars (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CONVEX_URL`) that win over the project ones and point the app at `clerk.kristineapp.com` / `convex.kristineapp.com`. `preview` has only Gluciel’s Clerk (`adapted-squid-4107`) and Convex (`artful-puffin-486`).
