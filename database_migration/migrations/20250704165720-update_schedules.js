module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    const now = new Date().getTime() / 1000;
    // Remove deprecated fields and add new fields to all schedules
    const schedules = await db.collection("schedules").find({}).toArray();
    for (const sched of schedules) {
      // Remove fields
      const unsetFields = {
        solve_details: "",
        last_updated_dsds: "",
        last_modified_dates: "",
        solve_status: "",
      };
      // Add fields
      let createdBy = null;
      if (sched.team) {
        const team = await db.collection("teams").findOne({ _id: sched.team });
        if (team && team.created_by_user_id) {
          createdBy = team.created_by_user_id;
        }
      }
      await db.collection("schedules").updateOne(
        { _id: sched._id },
        {
          $unset: unsetFields,
          $set: {
            created_at: sched.created_at !== undefined ? sched.created_at : now,
            updated_at: sched.updated_at !== undefined ? sched.updated_at : now,
            created_by: createdBy || "",
          },
        }
      );
    }
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Rollback: remove added fields, re-add removed fields as null
    await db.collection("schedules").updateMany(
      {},
      {
        $unset: { created_at: "", updated_at: "", created_by: "" },
        $set: {
          solve_details: null,
          last_updated_dsds: null,
          last_modified_dates: null,
          solve_status: null,
        },
      }
    );
  }
};
