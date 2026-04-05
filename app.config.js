const variant = process.env.APP_VARIANT || 'driver';

const config = {
  driver: {
    name: 'Kaviar Motorista',
    slug: 'kaviar-driver',
    package: 'com.kaviar.driver',
    icon: './assets/icon-driver.png',
    splash: './assets/splash-driver.png',
    adaptiveIcon: './assets/adaptive-icon-driver.png',
    scheme: 'kaviar-driver',
    projectId: '01426c18-feb5-44f2-94f1-dab900d8bc85'
  },
  passenger: {
    name: 'Kaviar Passageiro',
    slug: 'kaviar-passenger',
    package: 'com.kaviar.passenger',
    icon: './assets/icon-passenger.png',
    splash: './assets/splash-passenger.png',
    adaptiveIcon: './assets/adaptive-icon-passenger.png',
    scheme: 'kaviar-passenger',
    projectId: '23cab91b-82a5-4d92-9709-017279a2539d'
  }
};

const variantConfig = config[variant];

export default {
  expo: {
    owner: 'usbtecnok',
    name: variantConfig.name,
    slug: variantConfig.slug,
    version: '1.0.0',
    orientation: 'portrait',
    icon: variantConfig.icon,
    userInterfaceStyle: 'light',
    newArchEnabled: false,
    scheme: variantConfig.scheme,
    splash: {
      image: variantConfig.splash,
      resizeMode: 'contain',
      backgroundColor: '#1a1a1a'
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: variantConfig.package
    },
    android: {
      adaptiveIcon: {
        foregroundImage: variantConfig.adaptiveIcon,
        backgroundColor: '#1a1a1a'
      },
      package: variantConfig.package,
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyA50GYLlH7L5Iq5HpJ1MAALYOXN4PYlswc'
        }
      }
    },
    plugins: [],
    extra: {
      eas: {
        projectId: variantConfig.projectId
      },
      EXPO_PUBLIC_API_URL: 'https://api.kaviar.com.br',
      EXPO_PUBLIC_PLACES_KEY: process.env.EXPO_PUBLIC_PLACES_KEY || '',
      APP_VARIANT: variant
    }
  }
};
