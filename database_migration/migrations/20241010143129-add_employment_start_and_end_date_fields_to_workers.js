module.exports = {
  async up(db, client) {
    const currentTimestamp = new Date().getTime() / 1000; // Current date as a timestamp in seconds

    await db.collection('workers').updateMany(
      {},
      {
        $set: {
          employment_start_date: currentTimestamp,
          employment_end_date: null
        }
      }
    );
  },

  async down(db, client) {
    await db.collection('workers').updateMany(
      {},
      {
        $unset: {
          employment_start_date: "",
          employment_end_date: ""
        }
      }
    );
  }
};