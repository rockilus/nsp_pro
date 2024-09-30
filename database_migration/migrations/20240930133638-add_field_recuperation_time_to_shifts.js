module.exports = {
  async up(db, client) {
    await db.collection('shifts').updateMany({}, { $set: { recuperation_time: 0 } });
  },

  async down(db, client) {
    await db.collection('shifts').updateMany({}, { $unset: { recuperation_time: "" } });
  }
};