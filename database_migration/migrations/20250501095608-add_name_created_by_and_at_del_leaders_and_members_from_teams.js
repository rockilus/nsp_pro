module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    const now = new Date().getTime() / 1000;

    // Fetch all team documents
    const teams = await db.collection('teams').find({}).toArray();

    for (const team of teams) {
      const createdByUserId = team.team_leaders && team.team_leaders.length > 0 ? team.team_leaders[0] : null;

      // Update the team document
      await db.collection('teams').updateOne(
        { _id: team._id },
        {
          $set: {
            name: 'New team',
            created_by_user_id: createdByUserId,
            created_at: now
          },
          $unset: {
            team_leaders: '',
            team_members: ''
          }
        }
      );
    }
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Rollback logic: Revert the changes made in the `up` method
    const teams = await db.collection('teams').find({}).toArray();

    for (const team of teams) {
      // Revert the fields added
      await db.collection('teams').updateOne(
        { _id: team._id },
        {
          $unset: {
            name: '',
            created_by_user_id: '',
            created_at: ''
          },
          $set: {
            team_leaders: [],
            team_members: []
          }
        }
      );
    }
  }
};
