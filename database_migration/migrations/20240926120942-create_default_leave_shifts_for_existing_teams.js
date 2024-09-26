const { ObjectId } = require('mongodb')

module.exports = {
  async up(db, client) {
    const teams = await db.collection('teams').find({}).toArray();
    const referenceTime = new Date();
    const referenceTimeStart = new Date(referenceTime).setUTCHours(0, 0, 0, 0);
    const referenceTimeEnd = new Date(new Date(referenceTime).setUTCDate(referenceTime.getUTCDate() + 1)).setUTCHours(0, 0, 0, 0);
    const referenceTimeMidday = new Date(referenceTime).setUTCHours(12, 0, 0, 0);

    const leaveShifts = [
      {
        name: "Vacation",
        start_time: referenceTimeStart,
        end_time: referenceTimeEnd,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 1, // Assuming 1 corresponds to ShiftLeaveType.VACATION
        deleted: false,
      },
      {
        name: "Vacation morning",
        start_time: referenceTimeStart,
        end_time: referenceTimeMidday,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 2, // Assuming 2 corresponds to ShiftLeaveType.VACATION_MORNING
        deleted: false,
      },
      {
        name: "Vacation afternoon",
        start_time: referenceTimeMidday,
        end_time: referenceTimeEnd,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 3, // Assuming 3 corresponds to ShiftLeaveType.VACATION_AFTERNOON
        deleted: false,
      },
      {
        name: "Sick leave",
        start_time: referenceTimeStart,
        end_time: referenceTimeEnd,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 4, // Assuming 4 corresponds to ShiftLeaveType.SICK
        deleted: false,
      },
      {
        name: "Sick leave morning",
        start_time: referenceTimeStart,
        end_time: referenceTimeMidday,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 5, // Assuming 5 corresponds to ShiftLeaveType.SICK_MORNING
        deleted: false,
      },
      {
        name: "Sick leave afternoon",
        start_time: referenceTimeMidday,
        end_time: referenceTimeEnd,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 6, // Assuming 6 corresponds to ShiftLeaveType.SICK_AFTERNOON
        deleted: false,
      },
      {
        name: "Unpaid leave",
        start_time: referenceTimeStart,
        end_time: referenceTimeEnd,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 7, // Assuming 7 corresponds to ShiftLeaveType.UNPAID
        deleted: false,
      },
      {
        name: "Unpaid leave morning",
        start_time: referenceTimeStart,
        end_time: referenceTimeMidday,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 8, // Assuming 8 corresponds to ShiftLeaveType.UNPAID_MORNING
        deleted: false,
      },
      {
        name: "Unpaid leave afternoon",
        start_time: referenceTimeMidday,
        end_time: referenceTimeEnd,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 9, // Assuming 9 corresponds to ShiftLeaveType.UNPAID_AFTERNOON
        deleted: false,
      },
      {
        name: "Parental leave",
        start_time: referenceTimeStart,
        end_time: referenceTimeEnd,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 10, // Assuming 10 corresponds to ShiftLeaveType.PARENTAL_LEAVE
        deleted: false,
      },
      {
        name: "Parental leave morning",
        start_time: referenceTimeStart,
        end_time: referenceTimeMidday,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 11, // Assuming 11 corresponds to ShiftLeaveType.PARENTAL_LEAVE_MORNING
        deleted: false,
      },
      {
        name: "Parental leave afternoon",
        start_time: referenceTimeMidday,
        end_time: referenceTimeEnd,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 12, // Assuming 12 corresponds to ShiftLeaveType.PARENTAL_LEAVE_AFTERNOON
        deleted: false,
      },
      {
        name: "Training leave",
        start_time: referenceTimeStart,
        end_time: referenceTimeEnd,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 13, // Assuming 13 corresponds to ShiftLeaveType.TRAINING
        deleted: false,
      },
      {
        name: "Training leave morning",
        start_time: referenceTimeStart,
        end_time: referenceTimeMidday,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 14, // Assuming 14 corresponds to ShiftLeaveType.TRAINING_MORNING
        deleted: false,
      },
      {
        name: "Training leave afternoon",
        start_time: referenceTimeMidday,
        end_time: referenceTimeEnd,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 15, // Assuming 15 corresponds to ShiftLeaveType.TRAINING_AFTERNOON
        deleted: false,
      },
      {
        name: "Other",
        start_time: referenceTimeStart,
        end_time: referenceTimeEnd,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 16, // Assuming 16 corresponds to ShiftLeaveType.OTHER
        deleted: false,
      },
      {
        name: "Other morning",
        start_time: referenceTimeStart,
        end_time: referenceTimeMidday,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 17, // Assuming 17 corresponds to ShiftLeaveType.OTHER_MORNING
        deleted: false,
      },
      {
        name: "Other afternoon",
        start_time: referenceTimeMidday,
        end_time: referenceTimeEnd,
        staffing: 0,
        is_time_off: true,
        color: "grey",
        leave_type: 18, // Assuming 18 corresponds to ShiftLeaveType.OTHER_AFTERNOON
        deleted: false,
      },
    ];



    for (const team of teams) {
      const existingShifts = await db.collection('shifts').find({ team: team._id }).toArray();
      const existingLeaveTypes = existingShifts.map(shift => shift.leave_type);

      for (const shift of leaveShifts) {
        if (!existingLeaveTypes.includes(shift.leave_type)) {
          const shiftCopy = JSON.parse(JSON.stringify(shift)); // Create a deep copy
          shiftCopy._id = String(new ObjectId()); // Manually set the id
          shiftCopy.team = team._id;
          await db.collection('shifts').insertOne(shiftCopy);
          // const result = await db.collection('shifts').insertOne(shiftCopy);
          // if (result.insertedId) {
          //   console.log(`Shift with id ${result.insertedId} was successfully inserted.`);
          // } else {
          //   console.error(`Failed to insert shift: ${shiftCopy}`);
          // }
        }
      }
    }
  },

  async down(db, client) {
    const defaultShiftLeaveTypes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    await db.collection('shifts').deleteMany({ leave_type: { $in: defaultShiftLeaveTypes } });
  }
};