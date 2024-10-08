module.exports = {
  async up(db, client) {
    // Add the specialties field to all documents in the workers collection
    await db.collection('workers').updateMany({}, { $set: { specialties: [] } });
  },

  async down(db, client) {
    // Remove the specialties field from all documents in the workers collection
    await db.collection('workers').updateMany({}, { $unset: { specialties: "" } });
  }
};