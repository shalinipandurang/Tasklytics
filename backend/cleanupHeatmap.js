import pool from './config/db.js';

const cleanup = async () => {
  try {
    await pool.query('DELETE FROM tasks WHERE description = ? AND user_id != ?', ['Auto-generated for heatmap visualization', 8]);
    console.log('Cleaned up data for other users');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
};

cleanup();
