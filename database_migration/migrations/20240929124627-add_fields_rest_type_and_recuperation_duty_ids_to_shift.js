module.exports = {
  async up(db, client) {
    // Add the rest_type field with a default value of 0
    await db.collection('shifts').updateMany(
      {},
      { $set: { rest_type: 0, recuperation_duties: [] } }
    );
  },

  async down(db, client) {
    // Remove the rest_type and recuperation_duties fields
    await db.collection('shifts').updateMany(
      {},
      { $unset: { rest_type: "", recuperation_duties: "" } }
    );
  }
};