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
One capillary (fingerstick) glucose observation in the Carnet, stored canonically as `valueMgDl`.
_Avoid_: Measurement, entry, value (alone), CGM point, scan

**Invite**:
A short-lived code that adds a second Member to a Carnet.
_Avoid_: Share link (as the domain object), invitation email
