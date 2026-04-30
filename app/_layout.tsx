import { useEffect } from "react";
import { Stack } from "expo-router";
import * as Sentry from "@sentry/react-native";
import * as Application from "expo-application";
import { startNetInfoListener, stopNetInfoListener } from "../src/services/net-info-listener";

const variant = process.env.EXPO_PUBLIC_APP_VARIANT || "unknown";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? "development" : "production",
  release: `${Application.nativeApplicationVersion ?? "0.0.0"}`,
  dist: `${Application.nativeBuildVersion ?? "1"}`,
  tracesSampleRate: 0,
  sendDefaultPii: false,
  enabled: !__DEV__,
  initialScope: { tags: { appVariant: variant } },
});

export default Sentry.wrap(function RootLayout() {
  useEffect(() => {
    startNetInfoListener();
    return () => stopNetInfoListener();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
});
