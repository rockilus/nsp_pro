module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Replace 'recurrence_rule_id' with 'source_id' in assignments
    const assignments = await db.collection('assignments').find({}).toArray();
    const bulkOps = assignments.map(doc => {
      const source_id = doc.recurrence_rule_id !== undefined ? doc.recurrence_rule_id : null;
      return {
        updateOne: {
          filter: { _id: doc._id },
          update: [
            { $set: { source_id: source_id } },
            { $unset: "recurrence_rule_id" }
          ]
        }
      };
    });
    if (bulkOps.length > 0) {
      // Use bulkWrite with pipeline updates (MongoDB 4.2+)
      await db.collection('assignments').bulkWrite(bulkOps);
    }
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Rollback: move 'source_id' back to 'recurrence_rule_id' and remove 'source_id'
    const assignments = await db.collection('assignments').find({}).toArray();
    const bulkOps = assignments.map(doc => {
      const recurrence_rule_id = doc.source_id !== undefined ? doc.source_id : null;
      return {
        updateOne: {
          filter: { _id: doc._id },
          update: [
            { $set: { recurrence_rule_id: recurrence_rule_id } },
            { $unset: "source_id" }
          ]
        }
      };
    });
    if (bulkOps.length > 0) {
      await db.collection('assignments').bulkWrite(bulkOps);
    }
  }
};
