module.exports = {
  async up(db) {
    await db.collection('workers').updateMany({}, {$set: {active: true}});
  },

  async down(db) {
    await db.collection('workers').updateMany({}, {$unset: {active: true}});
  }
};
