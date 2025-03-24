module.exports = {
  async up(db, client) {
    const currentTimestamp = new Date().getTime() / 1000;
    await db.collection('schedules').updateMany({}, {
      $set: {
        last_updated_dsds: null,
        last_modified_dates: currentTimestamp
      }
    });
  },

  async down(db, client) {
    await db.collection('schedules').updateMany({}, {
      $unset: {
        last_updated_dsds: "",
        last_modified_dates: ""
      }
    });
  }
};
