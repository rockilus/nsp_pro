module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Add 'source' field to all assignments
    const assignments = await db.collection('assignments').find({}).toArray();
    const bulkOps = assignments.map(doc => {
      let source = 'solver';
      if (doc.recurrence_rule_id !== undefined && doc.recurrence_rule_id !== null) {
        source = 'recurrence';
      }
      return {
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { source } }
        }
      };
    });
    if (bulkOps.length > 0) {
      await db.collection('assignments').bulkWrite(bulkOps);
    }
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Remove 'source' field from all assignments
    await db.collection('assignments').updateMany(
      { source: { $exists: true } },
      { $unset: { source: "" } }
    );
  }
};
