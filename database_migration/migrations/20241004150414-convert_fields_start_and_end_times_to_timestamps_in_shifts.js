module.exports = {
  async up(db, client) {
    const shifts = await db.collection('shifts').find({}).toArray();
    for (const shift of shifts) {
      const startTime = new Date(shift.start_time).getTime() / 1000;
      const endTime = new Date(shift.end_time).getTime() / 1000;
      await db.collection('shifts').updateOne(
        { _id: shift._id },
        { $set: { start_time: startTime, end_time: endTime } }
      );
    }
  },

  async down(db, client) {
    const shifts = await db.collection('shifts').find({}).toArray();
    for (const shift of shifts) {
      const startTime = new Date(shift.start_time * 1000);
      const endTime = new Date(shift.end_time * 1000);
      await db.collection('shifts').updateOne(
        { _id: shift._id },
        { $set: { start_time: startTime, end_time: endTime } }
      );
    }
  }
};