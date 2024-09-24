module.exports = {
  async up(db, client) {
    // Add "deleted" boolean field to "worker_dimensions" collection and set it to false
    await db.collection('worker_dimensions').updateMany({}, { $set: { deleted: false } });
  },

  async down(db, client) {
    // Remove the "deleted" field from "worker_dimensions" collection
    await db.collection('worker_dimensions').updateMany({}, { $unset: { deleted: "" } });
  }
};