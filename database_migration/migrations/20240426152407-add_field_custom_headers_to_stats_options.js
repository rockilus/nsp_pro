module.exports = {
  async up(db) {
    await db.collection('stats_options').updateMany({}, {$set: {custom_headers: []}});
  },

  async down(db) {
    await db.collection('stats_options').updateMany({}, {$unset: {custom_headers: []}});
  }
};
