const { ObjectId } = require('mongodb')

module.exports = {
  async up(db, client) {
  const teams = await db.collection('teams').find({}).toArray();

  for (const team of teams) {
    const teamId = team._id;
    const teamLeaders = team.team_leaders || [];

    for (const userId of teamLeaders) {
      await db.collection('team_memberships').insertOne({
        _id: String(new ObjectId()),
        user_id: userId,
        team_id: teamId,
        roles: ["owner"],
      });
    }
  }
},
  async down(db, client) {
    const teams = await db.collection('teams').find({}).toArray();

    for (const team of teams) {
      const teamId = team._id;
      const teamLeaders = team.team_leaders || [];

      for (const userId of teamLeaders) {
        await db.collection('team_memberships').deleteMany({
          user_id: userId,
          team_id: teamId,
          roles: ["owner"],
        });
      }
    }
  }
}
