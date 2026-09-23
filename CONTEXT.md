# Gluciel

Personal glucose log (carnet de glycémie). French-first. Not a medical device.

## Language

**Carnet**:
The shared glucose log of exactly one person's glycemia.
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
One capillary (fingerstick) glucose observation in the Carnet, stored canonically as `valueMgDl`. Taken before or after a breakfast, lunch, or dinner Meal, or on an Other Meal. The Member does not create a Meal directly: they add a Reading and choose before/after a meal, or Autre.
_Avoid_: Measurement, entry, value (alone), CGM point, scan

**Invite**:
A short-lived code that adds a second Member to a Carnet.
_Avoid_: Share link (as the domain object), invitation email

**Correspondence**:
The Member-chosen pairing of one CSV column to one Reading field for an import.
_Avoid_: Mapping, schema, matching, binding

**Meal**:
What a Reading sits on: breakfast, lunch, dinner, or Other. Photos and the Note belong to the Meal, not the fingerstick. Breakfast, lunch, and dinner: at most one per Carnet per local day per slot; before, after, 1h, and 2h sit on it, and an after may attach across midnight within 12 hours.
_Avoid_: Occasion, event, context (as the meal itself)

**Other**:
A Meal that is not breakfast, lunch, or dinner. Many per day, one Reading each; Photos and Note are not shared with another Other.
_Avoid_: Snack (as a first-class slot), miscellaneous, uncategorized

**Note**:
Optional text about what was eaten, attached to a Meal.
_Avoid_: Comment, remark, description

**Photo**:
A meal picture attached to a Meal. A Meal may have several Photos.
_Avoid_: Image, picture, attachment, file, preview

## Mobile shipping

JS, styling, and bundled assets on mobile ship with **EAS Update** on the matching `runtimeVersion` (`appVersion` policy: `0.2.0` today). Native changes (new native module, SDK bump, permissions, splash) need a new store / TestFlight binary. An OTA cannot add native capabilities (see ADR 0002 file picker, ADR 0004).

**EAS env for Gluciel OTAs:** always `--environment preview`, even on the `production` channel. The Expo account `production` environment also carries account-wide Kristine vars (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CONVEX_URL`) that win over the project ones and point the app at `clerk.kristineapp.com` / `convex.kristineapp.com`. `preview` has only Gluciel’s Clerk (`adapted-squid-4107`) and Convex (`artful-puffin-486`).
