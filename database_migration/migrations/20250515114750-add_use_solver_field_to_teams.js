module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Add 'use_solver' field set to true to all documents in the teams collection that do not have it
    await db.collection('teams').updateMany(
      { use_solver: { $exists: false } },
      { $set: { use_solver: true } }
    );
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Remove 'use_solver' field from all documents in the teams collection
    await db.collection('teams').updateMany(
      { use_solver: { $exists: true } },
      { $unset: { use_solver: "" } }
    );
  }
};
