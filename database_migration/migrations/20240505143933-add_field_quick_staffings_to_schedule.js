module.exports = {
  async up(db) {
    await db.collection('schedules').updateMany({}, {$set: {quick_staffings: []}});
  },

  async down(db) {
    await db.collection('schedules').updateMany({}, {$unset: {quick_staffings: []}});
  }
};
