module.exports = {
  async up(db, client) {
    // Add "deleted" boolean field to "workers" collection and set it to false
    await db.collection('workers').updateMany({}, { $set: { deleted: false } });
  },

  async down(db, client) {
    // Remove the "deleted" field from "workers" collection
    await db.collection('workers').updateMany({}, { $unset: { deleted: "" } });
  }
};