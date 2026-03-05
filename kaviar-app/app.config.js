const variant = process.env.APP_VARIANT || 'driver';

if (!process.env[`EAS_PROJECT_ID_${variant.toUpperCase()}`]) {
  throw new Error(`EAS_PROJECT_ID_${variant.toUpperCase()} não definido. Configure no eas.json`);
}

const config = {
  driver: {
    name: 'Kaviar Motorista',
    slug: 'kaviar-driver',
    package: 'com.kaviar.driver',
    icon: './assets/icon-driver.png',
    splash: './assets/splash-driver.png',
    adaptiveIcon: './assets/adaptive-icon-driver.png',
    scheme: 'kaviar-driver',
    projectId: process.env.EAS_PROJECT_ID_DRIVER
  },
  passenger: {
    name: 'Kaviar Passageiro',
    slug: 'kaviar-passenger',
    package: 'com.kaviar.passenger',
    icon: './assets/icon-passenger.png',
    splash: './assets/splash-passenger.png',
    adaptiveIcon: './assets/adaptive-icon-passenger.png',
    scheme: 'kaviar-passenger',
    projectId: process.env.EAS_PROJECT_ID_PASSENGER
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
