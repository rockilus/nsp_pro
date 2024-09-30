module.exports = {
  async up(db, client) {
    // Remove the field "recuperation_duties"
    await db.collection('shifts').updateMany({}, { $unset: { recuperation_duties: "" } });

    // Add the field "recuperation_duty" and set it to null
    await db.collection('shifts').updateMany({}, { $set: { recuperation_duty: null } });
  },

  async down(db, client) {
    // Add back the field "recuperation_duties" as an empty array
    await db.collection('shifts').updateMany({}, { $set: { recuperation_duties: [] } });

    // Remove the field "recuperation_duty"
    await db.collection('shifts').updateMany({}, { $unset: { recuperation_duty: "" } });
  }
};