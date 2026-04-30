import { useEffect } from "react";
import { Stack } from "expo-router";
import { startNetInfoListener, stopNetInfoListener } from "../src/services/net-info-listener";

export default function RootLayout() {
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
}
