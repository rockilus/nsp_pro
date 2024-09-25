module.exports = {
  async up(db, client) {
    // Add the 'weekly_hours' field with a default value of 39 for existing workers
    await db.collection('workers').updateMany({}, { $set: { weekly_hours: 39 } });

    // Add the 'annual_leave' field with a default value of 25 for existing workers
    await db.collection('workers').updateMany({}, { $set: { annual_leave: 25 } });
  },

  async down(db, client) {
    // Remove the 'weekly_hours' field from the workers collection
    await db.collection('workers').updateMany({}, { $unset: { weekly_hours: "" } });

    // Remove the 'annual_leave' field from the workers collection
    await db.collection('workers').updateMany({}, { $unset: { annual_leave: "" } });
  }
};