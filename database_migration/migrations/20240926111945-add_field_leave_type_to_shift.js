module.exports = {
  async up(db, client) {
    // Add the "leave_type" field to all documents in the "shifts" collection and set its value to 0
    await db.collection('shifts').updateMany({}, { $set: { leave_type: 0 } });
  },

  async down(db, client) {
    // Remove the "leave_type" field from all documents in the "shifts" collection
    await db.collection('shifts').updateMany({}, { $unset: { leave_type: "" } });
  }
};