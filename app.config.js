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

// Permissões base (ambos os apps)
const basePermissions = [
  'ACCESS_COARSE_LOCATION',
  'ACCESS_FINE_LOCATION',
  'INTERNET',
  'VIBRATE',
];

// Motorista: precisa de background location para tracking durante corrida
const driverPermissions = [
  ...basePermissions,
  'ACCESS_BACKGROUND_LOCATION',
  'FOREGROUND_SERVICE',
  'FOREGROUND_SERVICE_LOCATION',
  'POST_NOTIFICATIONS',
];

const passengerPermissions = [...basePermissions];

export default {
  expo: {
    owner: 'usbtecnok',
    name: variantConfig.name,
    slug: variantConfig.slug,
    version: '1.11.9',
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
      bundleIdentifier: variantConfig.package,
      infoPlist: {
        NSLocationAlwaysAndWhenInUseUsageDescription: variant === 'driver'
          ? 'O Kaviar Motorista usa sua localização em segundo plano para enviar sua posição ao passageiro durante a corrida.'
          : undefined,
        NSLocationWhenInUseUsageDescription: variant === 'driver'
          ? 'O Kaviar Motorista usa sua localização para encontrar corridas próximas e navegar até o passageiro.'
          : 'O Kaviar usa sua localização para encontrar motoristas próximos e acompanhar sua corrida.',
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: variantConfig.adaptiveIcon,
        backgroundColor: '#1a1a1a'
      },
      package: variantConfig.package,
      googleServicesFile: variant === 'driver' ? './google-services.json' : undefined,
      permissions: variant === 'driver' ? driverPermissions : passengerPermissions,
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_PLACES_KEY || ''
        }
      }
    },
    plugins: [
      ['expo-notifications', { sounds: ['./assets/sounds/kaviar_ride.wav'] }],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: variant === 'driver'
            ? 'O Kaviar Motorista usa sua localização em segundo plano para enviar sua posição ao passageiro durante a corrida.'
            : undefined,
          locationWhenInUsePermission: variant === 'driver'
            ? 'O Kaviar Motorista usa sua localização para encontrar corridas próximas.'
            : 'O Kaviar usa sua localização para encontrar motoristas próximos.',
          isAndroidBackgroundLocationEnabled: variant === 'driver',
          isAndroidForegroundServiceEnabled: variant === 'driver',
        }
      ],
      (config) => {
        // Injeta sdk.dir no local.properties para builds EAS local
        const { withDangerousMod } = require('@expo/config-plugins');
        const fs = require('fs');
        const path = require('path');
        return withDangerousMod(config, ['android', async (cfg) => {
          const localProps = path.join(cfg.modRequest.platformProjectRoot, 'local.properties');
          const sdkDir = process.env.ANDROID_HOME || '/usr/lib/android-sdk';
          fs.writeFileSync(localProps, `sdk.dir=${sdkDir}\n`);
          return cfg;
        }]);
      },
    ],
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
