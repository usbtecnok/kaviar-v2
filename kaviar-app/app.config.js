import 'dotenv/config';

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
    projectId: process.env.EAS_PROJECT_ID_DRIVER || '01426c18-feb5-44f2-94f1-dab900d8bc85'
  },
  passenger: {
    name: 'Kaviar Passageiro',
    slug: 'kaviar-passenger',
    package: 'com.kaviar.passenger',
    icon: './assets/icon-passenger.png',
    splash: './assets/splash-passenger.png',
    adaptiveIcon: './assets/adaptive-icon-passenger.png',
    scheme: 'kaviar-passenger',
    projectId: process.env.EAS_PROJECT_ID_PASSENGER || '23cab91b-82a5-4d92-9709-017279a2539d'
  }
};

const variantConfig = config[variant];

export default {
  expo: {
    name: variantConfig.name,
    slug: variantConfig.slug,
    version: '1.0.0',
    orientation: 'portrait',
    icon: variantConfig.icon,
    userInterfaceStyle: 'light',
    newArchEnabled: true,
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
      package: variantConfig.package
    },
    plugins: [],
    extra: {
      eas: {
        projectId: variantConfig.projectId
      }
    }
  }
};
