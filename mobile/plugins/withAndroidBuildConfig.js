const { withProjectBuildGradle } = require("expo/config-plugins");

const BUILD_CONFIG_MARKER = 'plugins.withId("com.android.library")';

const SUBPROJECTS_HOOK = [
  "// Enable BuildConfig for Android library subprojects (AGP 9.0+)",
  "subprojects { subproject ->",
  '    subproject.plugins.withId("com.android.library") {',
  '        subproject.extensions.configure("android") { androidExt ->',
  "            androidExt.buildFeatures.buildConfig = true",
  "        }",
  "    }",
  "}",
].join("\n");

/**
 * Expo config plugin that ensures AGP 9.0+ enables BuildConfig generation
 * for com.android.library modules (such as zego-express-engine-reactnative)
 * without using deprecated gradle.properties flags.
 */
function withAndroidBuildConfig(config) {
  return withProjectBuildGradle(config, (modConfig) => {
    const contents = modConfig.modResults.contents || "";
    if (contents.includes(BUILD_CONFIG_MARKER)) {
      return modConfig;
    }

    const rootPluginMatch = contents.match(/apply plugin:\s*["']expo-root-project["']/);
    if (rootPluginMatch) {
      modConfig.modResults.contents = contents.replace(
        rootPluginMatch[0],
        `${SUBPROJECTS_HOOK}\n\n${rootPluginMatch[0]}`
      );
    } else {
      modConfig.modResults.contents = `${contents.trimEnd()}\n\n${SUBPROJECTS_HOOK}\n`;
    }

    return modConfig;
  });
}

module.exports = withAndroidBuildConfig;
