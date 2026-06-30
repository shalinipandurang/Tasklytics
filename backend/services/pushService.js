import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const mailto = process.env.VAPID_MAILTO || 'mailto:admin@tasklytics.com';

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    mailto,
    publicKey,
    privateKey
  );
  console.log('[PushService] Web-push VAPID details set successfully.');
} else {
  console.warn('[PushService] VAPID keys not configured in .env');
}

export const sendNotification = async (subscription, payload) => {
  return webpush.sendNotification(subscription, JSON.stringify(payload));
};

export default {
  sendNotification
};
