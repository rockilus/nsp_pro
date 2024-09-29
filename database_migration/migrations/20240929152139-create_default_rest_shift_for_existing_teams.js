const { ObjectId } = require('mongodb')

module.exports = {
  async up(db, client) {
    const teams = await db.collection('teams').find({}).toArray();
    const referenceTime = new Date();

    const referenceTimeStart = new Date(referenceTime)
    referenceTimeStart.setUTCHours(0, 0, 0, 0);

    const referenceTimeEnd = new Date(referenceTime);
    referenceTimeEnd.setUTCDate(referenceTime.getUTCDate() + 1);
    referenceTimeEnd.setUTCHours(0, 0, 0, 0);

    const defaultRestShift = {
        name: "Off",
        start_time: referenceTimeStart,
        end_time: referenceTimeEnd,
        staffing: 0,
        color: "grey",
        shift_type: 2,
        rest_type: 1,
        leave_type: 0,
        recuperation_duties: [],
        deleted: false,
      }

    for (const team of teams) {
      const existingShifts = await db.collection('shifts').find({ team: team._id }).toArray();
      const existingRestTypes = existingShifts.map(shift => shift.rest_type);

      if (!existingRestTypes.includes(defaultRestShift.rest_type)) {
        const shiftCopy = JSON.parse(JSON.stringify(defaultRestShift)); // Create a deep copy
        shiftCopy._id = String(new ObjectId()); // Manually set the id
        shiftCopy.team = team._id;
        shiftCopy.start_time = new Date(shiftCopy.start_time);
        shiftCopy.end_time = new Date(shiftCopy.end_time);
        await db.collection('shifts').insertOne(shiftCopy);
      }
    }
  },

  async down(db, client) {
    await db.collection('shifts').deleteMany({ rest_type: 1 });
  }
};