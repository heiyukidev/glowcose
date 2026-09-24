const { withEntitlementsPlist } = require("expo/config-plugins");

/**
 * Rappel uses local notifications only. expo-notifications injects
 * aps-environment; that requires Push on the App Store profile.
 * Register this plugin *before* expo-notifications so this entitlements
 * mod runs after theirs (LIFO) and clears the key.
 */
function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults["aps-environment"];
    return cfg;
  });
}

module.exports = withLocalNotificationsOnly;
