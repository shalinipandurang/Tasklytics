-- Add registered_at to users table for adaptive Pomodoro timer
ALTER TABLE users
  ADD COLUMN registered_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP;

-- Grandfather existing users at max duration (30+ days ago)
UPDATE users SET registered_at = DATE_SUB(NOW(), INTERVAL 30 DAY) WHERE registered_at IS NULL;
