module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Remove the 'workers' field from all documents in the 'users' collection
    await db.collection('users').updateMany({}, { $unset: { workers: "" } });
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Rollback: Re-add the 'workers' field as an empty array to all documents in the 'users' collection
    await db.collection('users').updateMany({}, { $set: { workers: [] } });
  }
};
