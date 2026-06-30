import pool from './config/db.js';

const seedHeatmap = async () => {
  try {
    console.log('Starting to seed heatmap data...');
    
    // Get all users
    const [users] = await pool.query('SELECT id FROM users');
    if (users.length === 0) {
      console.log('No users found in the database. Please register a user first.');
      process.exit(1);
    }
    
    for (const user of users) {
      const userId = user.id;
      console.log(`Seeding data for user ID: ${userId}`);

    // Generate random completed tasks over the past 90 days
    const totalDays = 90;
    const tasksToInsert = [];

    for (let i = 0; i < totalDays; i++) {
      // Randomly decide how many tasks were completed on this day (0 to 5)
      const tasksCount = Math.floor(Math.random() * 6);
      
      if (tasksCount > 0) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        // Format to YYYY-MM-DD HH:MM:SS for MySQL
        const dateString = date.toISOString().slice(0, 19).replace('T', ' ');

        for (let j = 0; j < tasksCount; j++) {
          tasksToInsert.push([
            userId,
            `Historical Task ${i}-${j}`, // task_title
            'Auto-generated for heatmap visualization', // description
            'Completed', // status
            dateString, // due_date
            'Other', // category
            0, // is_urgent
            0, // is_important
            dateString // updated_at
          ]);
        }
      }
    }

    if (tasksToInsert.length === 0) {
      console.log('No tasks generated.');
      process.exit(0);
    }

    // Insert tasks
    const query = `
      INSERT INTO tasks 
      (user_id, task_title, description, status, due_date, category, is_urgent, is_important, updated_at) 
      VALUES ?
    `;
    
      await pool.query(query, [tasksToInsert]);
      console.log(`Successfully inserted ${tasksToInsert.length} historical tasks for user ${userId}!`);
    }
  } catch (error) {
    console.error('Error seeding heatmap data:', error);
  } finally {
    process.exit(0);
  }
};

seedHeatmap();
