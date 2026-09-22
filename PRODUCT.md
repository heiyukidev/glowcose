# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is the Subject: a person in France logging their own capillary glucose, day to day, around meals. Gestational diabetes, type 1, type 2, and other are all real paths. Gestational is only the starting preset.

A second Member, a proche, may join the same Carnet and add Readings. That person is optional. The Carnet still records one Subject.

## Product Purpose

Gluciel is a personal capillary glucose journal. The Subject adds a fingerstick in a few seconds and sees whether it sits in their personal target, grouped by Meal.

Success is that daily log and that reading of the target. Gluciel does not advise, and it does not replace a clinician.

## Positioning

A French Carnet of capillary Readings, each sitting on a Meal, colored against the Subject’s own targets, with room for one other Member. A neighboring app that is a CGM stream, a clinic chart, or a medical device cannot claim this.

## Operating Context

Used around breakfast, lunch, dinner, or an Other Meal, on the website or the iPhone app. Both surfaces are the product and keep one Gluciel language. The iPhone app matches the website; design work treats the platform as web.

Without Clerk and Convex keys, the journal stays on the device. With those keys, the same Carnet syncs, and an Invite can add the second Member.

The Member chooses the display unit (g/L, mg/dL, or mmol/L). Every Reading is stored as mg/dL. The gestational preset starts from CNGOF/SFD bands. Type 1, type 2, and other start from adult indicative bands. The Subject can adjust the bands later.

A CSV of capillary readings can be imported after the Member pairs columns to Reading fields. Joining a Carnet does not merge the joiner’s current readings into it.

## Capabilities and Constraints

A Carnet is the shared glucose log of exactly one Subject. A Member is a signed-in person who can add, edit, and archive Readings. The Author is the Member who recorded a given Reading. A Reading is one capillary observation, taken before or after a breakfast, lunch, or dinner Meal, or on an Other Meal. The Member does not create a Meal directly. A Note and any Photos belong to the Meal. An Invite is a short-lived code that adds the second Member. A Correspondence is the Member-chosen pairing of one CSV column to one Reading field.

Confirmed behavior:

- Today, history, and a 7-day or 30-day graph.
- Add, edit, and archive a Reading, with an optional Note and up to four Photos on the Meal.
- Display units and personal threshold bands in settings.
- Share via an Invite: six characters, expires in seven days, single use, at most two Members on a Carnet.
- Capillary CSV import. Continuous-glucose rows are rejected.
- French is the only locale. French copy is the reference for product wording.

Binding limits: a Reading is between 20 and 600 mg/dL; threshold bands are integers from 40 to 400 mg/dL and must stay ordered hypo, then green, then orange; a Note is at most 500 characters.

Gluciel is not a medical device and does not replace medical advice. Targets are personal and indicative.

The iPhone app’s JavaScript, styling, and bundled assets ship with EAS Update on the matching runtime version. A new native module, SDK bump, permission, or splash needs a new store binary.

## Brand Commitments

The product name is Gluciel. The voice is French, personal, and second person: a carnet, not a clinic. The binding disclaimer is: “Gluciel n’est pas un dispositif médical et ne remplace pas un avis médical.”

Domain words to keep: Carnet, Subject, Member, Author, Reading, Invite, Correspondence, Meal, Other, Note, Photo. Avoid patient, user, profile, household, measurement, CGM point, and share link as the name of the Invite.

## Evidence on Hand

Product wording lives in `packages/core/src/i18n.ts`. Domain vocabulary lives in `CONTEXT.md`.

There are no testimonials, case studies, press mentions, or clinical proof assets in the repo. Future work must not invent them.

## Product Principles

1. The Subject logs their own fingersticks. A second Member may help; they do not become the product’s center.
2. A Reading belongs to a Meal. The day is read by meal, not as a raw stream.
3. Success is logging and seeing the personal target. Gluciel does not advise and does not replace a clinician.
4. One Carnet, one Subject, capillary only. French is the source language.
5. The website and the iPhone app are one product. The iPhone app matches the website’s language.
