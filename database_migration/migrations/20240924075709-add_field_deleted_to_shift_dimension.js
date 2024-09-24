module.exports = {
  async up(db, client) {
    // Add "deleted" boolean field to "shift_dimensions" collection and set it to false
    await db.collection('shift_dimensions').updateMany({}, { $set: { deleted: false } });
  },

  async down(db, client) {
    // Remove the "deleted" field from "shift_dimensions" collection
    await db.collection('shift_dimensions').updateMany({}, { $unset: { deleted: "" } });
  }
};