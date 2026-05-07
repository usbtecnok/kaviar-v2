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
    version: '1.11.15',
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
          // Desabilitar resource path shortening para preservar res/raw/kaviar_ride.wav
          const gradleProps = path.join(cfg.modRequest.platformProjectRoot, 'gradle.properties');
          let content = fs.existsSync(gradleProps) ? fs.readFileSync(gradleProps, 'utf8') : '';
          if (!content.includes('android.enableResourceOptimizations')) {
            content += '\nandroid.enableResourceOptimizations=false\n';
            fs.writeFileSync(gradleProps, content);
          }
          return cfg;
        }]);
      },
      (config) => {
        // Preserva kaviar_ride.wav em res/raw para som de notificação customizado
        const { withDangerousMod } = require('@expo/config-plugins');
        const fs = require('fs');
        const path = require('path');
        return withDangerousMod(config, ['android', async (cfg) => {
          const rawDir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/raw');
          if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
          fs.writeFileSync(path.join(rawDir, 'keep.xml'),
            '<?xml version="1.0" encoding="utf-8"?>\n<resources xmlns:tools="http://schemas.android.com/tools"\n    tools:keep="@raw/kaviar_ride" />\n');
          return cfg;
        }]);
      },
      (config) => {
        // Cria NotificationChannel nativamente no MainApplication.onCreate()
        // Bypassa o SoundResolver do expo-notifications que não resolve o recurso
        const { withMainApplication } = require('@expo/config-plugins');
        return withMainApplication(config, (cfg) => {
          const mainApp = cfg.modResults.contents;
          // Adicionar imports necessários
          const importBlock = `import android.app.NotificationChannel\nimport android.app.NotificationManager\nimport android.media.AudioAttributes\nimport android.net.Uri\nimport android.os.Build`;
          if (!mainApp.includes('import android.app.NotificationChannel')) {
            cfg.modResults.contents = mainApp.replace(
              'import android.app.Application',
              `import android.app.Application\n${importBlock}`
            );
          }
          // Adicionar criação do canal no onCreate, antes do loadReactNative
          const channelCode = `
    // KAVIAR: Criar canal de notificação com som customizado nativamente
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
      val existingChannel = notificationManager.getNotificationChannel("expo_notifications_fallback_notification_channel")
      if (existingChannel == null) {
        val soundUri = Uri.parse("android.resource://com.kaviar.driver/raw/kaviar_ride")
        val audioAttributes = AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_NOTIFICATION)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
        val channel = NotificationChannel(
          "expo_notifications_fallback_notification_channel",
          "Corridas KAVIAR",
          NotificationManager.IMPORTANCE_HIGH
        )
        channel.setSound(soundUri, audioAttributes)
        channel.enableVibration(true)
        channel.vibrationPattern = longArrayOf(0, 250, 250, 250)
        notificationManager.createNotificationChannel(channel)
      }
    }`;
          cfg.modResults.contents = cfg.modResults.contents.replace(
            'super.onCreate()',
            `super.onCreate()\n${channelCode}`
          );
          return cfg;
        });
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
