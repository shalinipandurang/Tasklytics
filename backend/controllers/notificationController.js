import pool from '../config/db.js';
import { sendNotification } from '../services/pushService.js';

// @desc    Subscribe to push notifications
// @route   POST /api/notifications/subscribe
export const subscribe = async (req, res) => {
  try {
    const { userId, subscription } = req.body;

    if (!subscription) {
      return res.status(400).json({ success: false, message: 'Subscription object is required' });
    }

    const subscriptionStr = JSON.stringify(subscription);

    // Check if subscription already exists for this user to avoid duplicates
    const [existing] = await pool.query(
      'SELECT id FROM push_subscriptions WHERE user_id = ? AND subscription_data = ?',
      [userId, subscriptionStr]
    );

    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO push_subscriptions (user_id, subscription_data) VALUES (?, ?)',
        [userId, subscriptionStr]
      );
    }

    res.status(200).json({ success: true, message: 'Successfully subscribed to push notifications' });
  } catch (error) {
    console.error('[NotificationController] Subscribe error:', error);
    res.status(500).json({ success: false, message: 'Server error during subscription' });
  }
};

// @desc    Send manual push notification to a user (testing)
// @route   POST /api/notifications/send
export const send = async (req, res) => {
  try {
    const { userId, title, body, url } = req.body;

    // Fetch user's active subscriptions
    const [subscriptions] = await pool.query(
      'SELECT id, subscription_data FROM push_subscriptions WHERE user_id = ?',
      [userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ success: false, message: 'No subscriptions found for user' });
    }

    const payload = {
      title: title || 'Tasklytics Alert',
      body: body || 'This is a test push notification.',
      url: url || '/'
    };

    let successCount = 0;
    for (const sub of subscriptions) {
      try {
        const subData = JSON.parse(sub.subscription_data);
        await sendNotification(subData, payload);
        successCount++;
      } catch (err) {
        console.error('[NotificationController] Failed to send push:', err.message);
        // If subscription is expired or invalid, remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
          console.log(`[NotificationController] Deleted expired subscription ID: ${sub.id}`);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Push notification sent to ${successCount}/${subscriptions.length} active devices.`
    });
  } catch (error) {
    console.error('[NotificationController] Send error:', error);
    res.status(500).json({ success: false, message: 'Server error during send' });
  }
};

// @desc    Get VAPID public key
// @route   GET /api/notifications/vapid-public-key
export const getVapidPublicKey = async (req, res) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(500).json({ success: false, message: 'VAPID public key not configured' });
    }
    res.status(200).json({ success: true, publicKey });
  } catch (error) {
    console.error('[NotificationController] Get VAPID public key error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
