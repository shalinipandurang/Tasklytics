import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 21140,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Automatically enable SSL for remote cloud databases (Aiven, Railway, etc.)
  ssl: process.env.DB_HOST && !process.env.DB_HOST.includes('localhost') && !process.env.DB_HOST.includes('127.0.0.1') ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`MySQL DB connected successfully: ${connection.config.database}`);
    
    // Self-healing database migration for user settings/preferences
    const [columns] = await connection.query("SHOW COLUMNS FROM users");
    const columnNames = columns.map(c => c.Field);
    
    if (!columnNames.includes('theme')) {
      await connection.query("ALTER TABLE users ADD COLUMN theme VARCHAR(20) DEFAULT 'light'");
      console.log("Added 'theme' column to users table");
    }
    if (!columnNames.includes('daily_target')) {
      await connection.query("ALTER TABLE users ADD COLUMN daily_target INT DEFAULT 3");
      console.log("Added 'daily_target' column to users table");
    }
    if (!columnNames.includes('default_category')) {
      await connection.query("ALTER TABLE users ADD COLUMN default_category VARCHAR(50) DEFAULT 'Other'");
      console.log("Added 'default_category' column to users table");
    }
    if (!columnNames.includes('ai_enabled')) {
      await connection.query("ALTER TABLE users ADD COLUMN ai_enabled TINYINT(1) DEFAULT 1");
      console.log("Added 'ai_enabled' column to users table");
    }
    if (!columnNames.includes('notifications_enabled')) {
      await connection.query("ALTER TABLE users ADD COLUMN notifications_enabled TINYINT(1) DEFAULT 0");
      console.log("Added 'notifications_enabled' column to users table");
    }
    if (!columnNames.includes('security_question')) {
      await connection.query("ALTER TABLE users ADD COLUMN security_question VARCHAR(255) DEFAULT NULL");
      console.log("Added 'security_question' column to users table");
    }
    if (!columnNames.includes('security_answer')) {
      await connection.query("ALTER TABLE users ADD COLUMN security_answer VARCHAR(255) DEFAULT NULL");
      console.log("Added 'security_answer' column to users table");
    }
    if (!columnNames.includes('registered_at')) {
      await connection.query("ALTER TABLE users ADD COLUMN registered_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
      await connection.query("UPDATE users SET registered_at = DATE_SUB(NOW(), INTERVAL 30 DAY) WHERE registered_at IS NULL");
      console.log("Added 'registered_at' column to users table");
    }

    const [subtaskColumns] = await connection.query("SHOW COLUMNS FROM sub_tasks");
    const subtaskColumnNames = subtaskColumns.map(c => c.Field);
    if (!subtaskColumnNames.includes('completed_at')) {
      await connection.query("ALTER TABLE sub_tasks ADD COLUMN completed_at TIMESTAMP NULL DEFAULT NULL");
      console.log("Added 'completed_at' column to sub_tasks table");
    }

    // PWA & Push Notifications Migrations
    await connection.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        subscription_data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Verified 'push_subscriptions' table exists");

    const [taskColumns] = await connection.query("SHOW COLUMNS FROM tasks");
    const taskColumnNames = taskColumns.map(c => c.Field);

    if (!taskColumnNames.includes('due_time')) {
      await connection.query("ALTER TABLE tasks ADD COLUMN due_time TIME DEFAULT '23:59:59'");
      console.log("Added 'due_time' column to tasks table");
    }
    if (!taskColumnNames.includes('due_reminder_sent')) {
      await connection.query("ALTER TABLE tasks ADD COLUMN due_reminder_sent TINYINT(1) DEFAULT 0");
      console.log("Added 'due_reminder_sent' column to tasks table");
    }
    
    connection.release();
  } catch (error) {
    console.error('Error connecting to MySQL DB:', error.message);
    process.exit(1);
  }
};

export default pool;
