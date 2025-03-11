module.exports = {
  async up(db, client) {
    const schedules = await db.collection('schedules').find({}).toArray();
    for (const schedule of schedules) {
      const startDateTimestamp = new Date(schedule.start_date).getTime() / 1000;
      const endDateTimestamp = new Date(schedule.end_date).getTime() / 1000;
      const missingCoverageDatesTimestamps = schedule.missing_coverage_dates.map(date => new Date(date).getTime() / 1000);

      await db.collection('schedules').updateOne(
        { _id: schedule._id },
        {
          $set: {
            start_date: startDateTimestamp,
            end_date: endDateTimestamp,
            missing_coverage_dates: missingCoverageDatesTimestamps
          }
        }
      );
    }
  },

  async down(db, client) {
    const schedules = await db.collection('schedules').find({}).toArray();
    for (const schedule of schedules) {
      const startDate = new Date(schedule.start_date * 1000).toISOString();
      const endDate = new Date(schedule.end_date * 1000).toISOString();
      const missingCoverageDates = schedule.missing_coverage_dates.map(timestamp => new Date(timestamp * 1000).toISOString());

      await db.collection('schedules').updateOne(
        { _id: schedule._id },
        {
          $set: {
            start_date: startDate,
            end_date: endDate,
            missing_coverage_dates: missingCoverageDates
          }
        }
      );
    }
  }
};
