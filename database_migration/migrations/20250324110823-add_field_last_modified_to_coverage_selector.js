module.exports = {
  async up(db, client) {
    const now = new Date().getTime() / 1000;
    await db.collection('coverage_selectors').updateMany({}, { $set: { last_modified: now } });
  },

  async down(db, client) {
    await db.collection('coverage_selectors').updateMany({}, { $unset: { last_modified: "" } });
  }
};
