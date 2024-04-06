module.exports = {
  async up(db) {
    await db.collection('shift_dimensions').updateMany({}, {$set: {is_rest: false}});
  },

  async down(db) {
    await db.collection('shift_dimensions').updateMany({}, {$unset: {is_rest: false}});
  }
};
