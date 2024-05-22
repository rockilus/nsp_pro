module.exports = {
  async up(db) {
    await db.collection('requests').updateMany({}, {$rename: {"date": "start_date"}});
  },

  async down(db) {
    await db.collection('requests').updateMany({}, {$rename: {"start_date": "date"}});
  }
};