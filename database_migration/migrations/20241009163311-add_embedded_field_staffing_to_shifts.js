module.exports = {
  async up(db, client) {
    // Update all documents in the shifts collection
    await db.collection('shifts').updateMany(
      {},
      [
        {
          $set: {
            staffing: {
              $map: {
                input: { $range: [0, "$staffing"] },
                as: "staffing",
                in: { specialty: null, staffing: 1 }
              }
            }
          }
        }
      ]
    );
  },

  async down(db, client) {
    // Revert the changes by setting staffing back to the original integer value
    await db.collection('shifts').updateMany(
      {},
      [
        {
          $set: {
            staffing: { $size: "$staffing" }
          }
        }
      ]
    );
  }
};