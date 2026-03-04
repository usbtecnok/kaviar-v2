const IS_DRIVER = process.env.APP_VARIANT === 'driver';
const IS_PASSENGER = process.env.APP_VARIANT === 'passenger';

if (!IS_DRIVER && !IS_PASSENGER) {
  throw new Error('APP_VARIANT deve ser "driver" ou "passenger"');
}

export default {
  expo: {
    name: IS_DRIVER ? 'Kaviar Motorista' : 'Kaviar Passageiro',
    slug: IS_DRIVER ? 'kaviar-driver' : 'kaviar-passenger',
    version: '1.0.0',
    orientation: 'portrait',
    icon: IS_DRIVER ? './assets/icon-driver.png' : './assets/icon-passenger.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    scheme: IS_DRIVER ? 'kaviar-driver' : 'kaviar-passenger',
    splash: {
      image: IS_DRIVER ? './assets/splash-driver.png' : './assets/splash-passenger.png',
      resizeMode: 'contain',
      backgroundColor: IS_DRIVER ? '#1a1a1a' : '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DRIVER ? 'com.kaviar.driver' : 'com.kaviar.passenger',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: IS_DRIVER ? './assets/adaptive-icon-driver.png' : './assets/adaptive-icon-passenger.png',
        backgroundColor: IS_DRIVER ? '#1a1a1a' : '#ffffff',
      },
      package: IS_DRIVER ? 'com.kaviar.driver' : 'com.kaviar.passenger',
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-router'],
    extra: {
      eas: {
        projectId: IS_DRIVER
          ? process.env.EAS_PROJECT_ID_DRIVER
          : process.env.EAS_PROJECT_ID_PASSENGER,
      },
      appVariant: process.env.APP_VARIANT,
    },
  },
};
