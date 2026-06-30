import pool from './config/db.js';

const test = async () => {
  try {
    const [res] = await pool.query("SELECT DATE_FORMAT(updated_at, '%Y-%m-%d') as date, COUNT(*) as count FROM tasks WHERE user_id = 8 AND status = 'Completed' GROUP BY date ORDER BY date ASC LIMIT 5");
    console.log(res);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
};

test();
