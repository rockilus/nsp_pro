
const ScheduleSolveStatus= {
  "Not solved" : 0,
  "Solved" : 1,
  "Hard breached" : 2,
  "Soft breached" : 3,
  "No solution" : 4,
}

const ScheduleStatus ={
  "wip" : 0,
  "WIP" : 0,
  "validated" : 1,
  "past" : 1,
}

module.exports = {
  async up(db, client) {
    const schedules = await db.collection('schedules').find({}).toArray();

    for (const schedule of schedules) {
      const solveStatusInt = ScheduleSolveStatus[schedule.solve_status];
      const statusInt = ScheduleStatus[schedule.status];

      await db.collection('schedules').updateOne(
        { _id: schedule._id },
        {
          $set: {
            solve_status: solveStatusInt,
            status: statusInt,
          },
        }
      );
    }
  },

  async down(db, client) {
    const schedules = await db.collection('schedules').find({}).toArray();

    for (const schedule of schedules) {
      const solveStatusStr = Object.keys(ScheduleSolveStatus).find(
        key => ScheduleSolveStatus[key] === schedule.solve_status
      );
      const statusStr = Object.keys(ScheduleStatus).find(
        key => ScheduleStatus[key] === schedule.status
      );

      await db.collection('schedules').updateOne(
        { _id: schedule._id },
        {
          $set: {
            solve_status: solveStatusStr,
            status: statusStr,
          },
        }
      );
    }
  },
};