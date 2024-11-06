module.exports = {
  async up(db, client) {
    // Add the team reference field to each assignment
    const assignments = await db.collection('assignments').find({}).toArray();
    for (const assignment of assignments) {
      const schedule = await db.collection('schedules').findOne({ _id: assignment.schedule });
      if (schedule && schedule.team) {
        await db.collection('assignments').updateOne(
          { _id: assignment._id },
          { $set: { team: schedule.team } }
        );
      }
    }
  },

  async down(db, client) {
    // Remove the team reference field from each assignment
    await db.collection('assignments').updateMany(
      {},
      { $unset: { team: "" } }
    );
  }
};