module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Update all documents in team_memberships: rename 'roles' to 'role' (if present)
    await db.collection('team_memberships').updateMany(
      { roles: { $exists: true } },
      [
        {
          $set: { role: "$roles" },
        },
        {
          $unset: "roles"
        }
      ]
    );
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Rollback: rename 'role' back to 'roles' (if present)
    await db.collection('team_memberships').updateMany(
      { role: { $exists: true } },
      [
        {
          $set: { roles: "$role" },
        },
        {
          $unset: "role"
        }
      ]
    );
  }
};
