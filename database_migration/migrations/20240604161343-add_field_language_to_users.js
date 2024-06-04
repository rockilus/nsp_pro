module.exports = {
  async up(db) {
    await db.collection('users').updateMany({}, {$set: {language: "en"}});
  },

  async down(db) {
    await db.collection('users').updateMany({}, {$unset: {language: ""}});
  }
};
