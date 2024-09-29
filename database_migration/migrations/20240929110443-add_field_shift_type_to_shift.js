module.exports = {
  async up(db, client) {
    // Add the shift_type field based on the conditions and remove the is_time_off field
    await db.collection('shifts').updateMany(
      { is_time_off: true, leave_type: { $ne: 0 } },
      { $set: { shift_type: 3 }, $unset: { is_time_off: "" } }
    );

    await db.collection('shifts').updateMany(
      { is_time_off: true, leave_type: 0 },
      { $set: { shift_type: 2 }, $unset: { is_time_off: "" } }
    );

    await db.collection('shifts').updateMany(
      { is_time_off: false },
      { $set: { shift_type: 0 }, $unset: { is_time_off: "" } }
    );
  },

  async down(db, client) {
    // Rollback the migration by removing the shift_type field and restoring the is_time_off field
    await db.collection('shifts').updateMany(
      { shift_type: 3 },
      { $unset: { shift_type: "" }, $set: { is_time_off: true } }
    );

    await db.collection('shifts').updateMany(
      { shift_type: 2 },
      { $unset: { shift_type: "" }, $set: { is_time_off: true } }
    );

    await db.collection('shifts').updateMany(
      { shift_type: 0 },
      { $unset: { shift_type: "" }, $set: { is_time_off: false } }
    );
  }
};
