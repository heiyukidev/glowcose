const { withEntitlementsPlist } = require("expo/config-plugins");

/**
 * Rappel uses local notifications only. expo-notifications still injects
 * aps-environment, which requires Push on the provisioning profile.
 * Strip it so store builds don't need the Push Notifications capability.
 */
function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults["aps-environment"];
    return cfg;
  });
}

module.exports = withLocalNotificationsOnly;
