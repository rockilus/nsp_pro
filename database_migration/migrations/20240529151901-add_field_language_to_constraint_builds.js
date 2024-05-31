module.exports = {
  async up(db) {
    await db.collection('constraint_builds').updateMany({}, {$set: {language: "en"}});
  },

  async down(db) {
    await db.collection('constraint_builds').updateMany({}, {$unset: {language: ""}});
  }
};
