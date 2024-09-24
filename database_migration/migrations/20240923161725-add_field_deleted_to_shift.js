module.exports = {
  async up(db, client) {
    // Add "deleted" boolean field to "shifts" collection and set it to false
    await db.collection('shifts').updateMany({}, { $set: { deleted: false } });
  },

  async down(db, client) {
    // Remove the "deleted" field from "shifts" collection
    await db.collection('shifts').updateMany({}, { $unset: { deleted: "" } });
  }
};