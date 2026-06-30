import { fetchAPI } from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function checkAndSubscribeNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push messaging is not supported in this browser.');
    return;
  }

  const userData = localStorage.getItem('taskManagerUser');
  if (!userData) return;

  let user;
  try {
    user = JSON.parse(userData);
  } catch (e) {
    return;
  }

  try {
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.log('Notification permission not granted.');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const keyData = await fetchAPI('/notifications/vapid-public-key');
      if (!keyData || !keyData.publicKey) {
        console.error('Failed to retrieve VAPID public key');
        return;
      }

      const convertedPublicKey = urlBase64ToUint8Array(keyData.publicKey);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedPublicKey
      });
      
      console.log('New subscription created:', subscription);
    }

    await fetchAPI('/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        userId: user.id,
        subscription: subscription
      })
    });
    
    console.log('Subscription synced with backend.');
  } catch (error) {
    console.error('Error during notification subscription check:', error);
  }
}
