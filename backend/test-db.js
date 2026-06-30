import pool from './config/db.js';

async function test() {
  try {
    const [rows] = await pool.query('DESCRIBE tasks');
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
