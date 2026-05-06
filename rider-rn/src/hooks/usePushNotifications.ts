/**
 * Rider push notifications hook.
 *
 * Critical: rider job offers (type: job.offered) use tripchow_jobs channel
 * which is MAX importance to wake the device even in Doze mode.
 *
 * Backend sends FCM for:
 *   - job.offered         → MAX importance, sound + vibration
 *   - payout.completed    → general
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { notifications } from '../api/endpoints';

async function createChannels() {
  if (Platform.OS !== 'android') return;
  // Max importance for job offers — must wake device even in Doze mode
  await notifee.createChannel({
    id:          'tripchow_jobs',
    name:        'New delivery jobs',
    importance:  AndroidImportance.HIGH,
    visibility:  AndroidVisibility.PUBLIC,
    vibration:   true,
    vibrationPattern: [0, 500, 200, 500, 200, 500],
    sound:       'default',
    bypassDnd:   true,   // Bypass Do Not Disturb for job offers
    description: 'New delivery job alerts — critical for receiving work',
  });
  await notifee.createChannel({
    id:          'tripchow_orders',
    name:        'Order updates',
    importance:  AndroidImportance.DEFAULT,
    sound:       'default',
    description: 'Order status updates for active deliveries',
  });
  await notifee.createChannel({
    id:          'tripchow_general',
    name:        'General notifications',
    importance:  AndroidImportance.DEFAULT,
    sound:       'default',
  });
}

async function showForegroundNotification(remoteMessage: any) {
  const data      = remoteMessage.data || {};
  const channelId = data.channel_id || data.fcm_channel || 'tripchow_general';
  const title     = remoteMessage.notification?.title || data.title || 'TripChow Rider';
  const body      = remoteMessage.notification?.body  || data.body  || '';

  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId,
      smallIcon:   'ic_notification',
      pressAction: { id: 'default' },
      importance:  channelId === 'tripchow_jobs'
        ? AndroidImportance.HIGH
        : AndroidImportance.DEFAULT,
    },
    ios: { sound: 'default' },
  });
}

export function usePushNotifications() {
  const qc = useQueryClient();

  useEffect(() => {
    createChannels();

    const registerToken = async () => {
      const authStatus = await messaging().requestPermission();
      const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED
                   || authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) return;

      const token = await messaging().getToken();
      if (token) {
        notifications.registerDevice(
          `rider-${Platform.OS}`,
          token,
          Platform.OS as 'android' | 'ios'
        ).catch(() => {});
      }
    };
    registerToken();

    const unsubRefresh = messaging().onTokenRefresh(token => {
      notifications.registerDevice(`rider-${Platform.OS}`, token, Platform.OS as 'android' | 'ios').catch(() => {});
    });

    const unsubFg = messaging().onMessage(async remoteMessage => {
      await showForegroundNotification(remoteMessage);

      const type = remoteMessage.data?.type as string;
      if (type === 'job.offered') {
        qc.invalidateQueries({ queryKey: ['jobs'] });
        qc.invalidateQueries({ queryKey: ['dashboard'] });
      }
      if (type === 'payout.completed') {
        qc.invalidateQueries({ queryKey: ['wallet'] });
      }
      qc.invalidateQueries({ queryKey: ['rider-notif-count'] });
    });

    return () => { unsubFg(); unsubRefresh(); };
  }, []);
}
