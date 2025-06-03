module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Set solve_status to 0 where it is null
    await db.collection('schedules').updateMany(
      { solve_status: null },
      { $set: { solve_status: 0 } }
    );

    // Set status to 0 where it is null
    await db.collection('schedules').updateMany(
      { status: null },
      { $set: { status: 0 } }
    );
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Optionally revert solve_status and status fields set to 0 back to null if they were 0
    await db.collection('schedules').updateMany(
      { solve_status: 0 },
      { $set: { solve_status: null } }
    );

    await db.collection('schedules').updateMany(
      { status: 0 },
      { $set: { status: null } }
    );
  }
};
