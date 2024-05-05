module.exports = {
  async up(db) {
    await db.collection('schedules').updateMany({}, {$set: {constraint_builds: []}});
  },

  async down(db) {
    await db.collection('schedules').updateMany({}, {$unset: {constraint_builds: []}});
  }
};
