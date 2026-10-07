import type { ExpoConfig, ConfigContext } from "expo/config";

declare const process: { env: Record<string, string | undefined> };

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export default ({ config }: ConfigContext): ExpoConfig => {
  if (
    process.env.EAS_BUILD_PROFILE &&
    (!iosClientId || !webClientId)
  ) {
    throw new Error(
      "EAS builds require EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.",
    );
  }

  const plugins = [...(config.plugins ?? [])];

  if (iosClientId) {
    const clientIdSuffix = ".apps.googleusercontent.com";
    if (!iosClientId.endsWith(clientIdSuffix)) {
      throw new Error("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is not a valid Google OAuth client ID.");
    }
    const iosClientIdPrefix = iosClientId.slice(0, -clientIdSuffix.length);
    if (!iosClientIdPrefix) {
      throw new Error("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is not a valid Google OAuth client ID.");
    }
    plugins.push([
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme: `com.googleusercontent.apps.${iosClientIdPrefix}`,
      },
    ]);
  }

  return {
    ...config,
    name: config.name ?? "Cedar & Loom",
    slug: config.slug ?? "cedar-and-loom",
    plugins,
  };
};
