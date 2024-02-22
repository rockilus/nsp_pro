module.exports = {
  async up(db) {
    await db.collection('constraint_builds').updateMany({}, {$set: {missing_properties: []}});
  },

  async down(db) {
    await db.collection('constraint_builds').updateMany({}, {$unset: {missing_properties: []}});
  }
};
