module.exports = {
  async up(db, client) {
    // Add the weekly_hours_desired field with a default value of 39
    // Add the duties_per_month field with a default value of 4
    await db.collection('workers').updateMany(
      {},
      { $set: { weekly_hours_desired: 39, duties_per_month: 4 } }
    );
  },

  async down(db, client) {
    // Remove the weekly_hours_desired and duties_per_month fields
    await db.collection('workers').updateMany(
      {},
      { $unset: { weekly_hours_desired: "", duties_per_month: "" } }
    );
  }
};