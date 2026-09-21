# EAS Update for JS and assets

Mobile JS, styling, and bundled assets ship with EAS Update on the matching `runtimeVersion` (`appVersion` policy). Native changes still need a store / TestFlight binary: an OTA cannot add a native module, permission, or SDK bump. Channels follow the existing EAS Build profiles (`preview`, `production`). Existing binaries built before `expo-updates` was installed do not receive updates.
