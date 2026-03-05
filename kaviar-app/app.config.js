/**
 * KAVIAR - Dynamic app config (2 variants)
 * Variants:
 *  - driver     => com.kaviar.driver
 *  - passenger  => com.kaviar.passenger
 *
 * Required env:
 *  - APP_VARIANT=driver|passenger
 *
 * NOTE:
 *  - EAS projectId NÃO deve depender de .env no EAS Build.
 *    (O build remoto não lê seu .env local.)
 */

module.exports = () => {
  const variant = process.env.APP_VARIANT || "driver";

  const IS_DRIVER = variant === "driver";
  const IS_PASSENGER = variant === "passenger";

  if (!IS_DRIVER && !IS_PASSENGER) {
    throw new Error('APP_VARIANT deve ser "driver" ou "passenger"');
  }

  const DRIVER_PROJECT_ID = "01426c18-feb5-44f2-94f1-dab900d8bc85";
  const PASSENGER_PROJECT_ID = "23cab91b-82a5-4d92-9709-017279a2539d";

  return {
    name: IS_DRIVER ? "Kaviar Motorista" : "Kaviar Passageiro",
    slug: IS_DRIVER ? "kaviar-driver" : "kaviar-passenger",
    version: "1.0.0",
    orientation: "portrait",
    icon: IS_DRIVER ? "./assets/icon-driver.png" : "./assets/icon-passenger.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    scheme: IS_DRIVER ? "kaviar-driver" : "kaviar-passenger",
    
    splash: {
      image: IS_DRIVER ? "./assets/splash-driver.png" : "./assets/splash-passenger.png",
      resizeMode: "contain",
      backgroundColor: IS_DRIVER ? "#1a1a1a" : "#ffffff",
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DRIVER ? "com.kaviar.driver" : "com.kaviar.passenger",
    },

    android: {
      adaptiveIcon: {
        foregroundImage: IS_DRIVER
          ? "./assets/adaptive-icon-driver.png"
          : "./assets/adaptive-icon-passenger.png",
        backgroundColor: IS_DRIVER ? "#1a1a1a" : "#ffffff",
      },
      package: IS_DRIVER ? "com.kaviar.driver" : "com.kaviar.passenger",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },

    web: {
      favicon: "./assets/favicon.png",
    },

    plugins: ["expo-router"],

    extra: {
      eas: {
        projectId: IS_DRIVER ? DRIVER_PROJECT_ID : PASSENGER_PROJECT_ID,
      },
      appVariant: variant,
    },
  };
};
