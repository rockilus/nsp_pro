module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Add the shift_options field to all documents in the requests collection, defaulting to []
    await db.collection('requests').updateMany(
      { shift_options: { $exists: false } },
      { $set: { shift_options: [] } }
    );
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Remove the shift_options field from all documents in the requests collection
    await db.collection('requests').updateMany(
      {},
      { $unset: { shift_options: "" } }
    );
  }
};
