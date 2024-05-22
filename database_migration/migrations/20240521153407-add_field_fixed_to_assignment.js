module.exports = {
  async up(db) {
    await db.collection('assignments').updateMany({}, {$set: {fixed: false}});
  },

  async down(db) {
    await db.collection('assignments').updateMany({}, {$unset: {fixed: false}});
  }
};
