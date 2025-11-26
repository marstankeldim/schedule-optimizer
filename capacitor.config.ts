import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.eb695f51e5af4271adcfadc3834f8c88',
  appName: 'rhythm-maker-ai',
  webDir: 'dist',
  server: {
    url: 'https://eb695f51-e5af-4271-adcf-adc3834f8c88.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#10B981",
      sound: "beep.wav"
    }
  }
};

export default config;