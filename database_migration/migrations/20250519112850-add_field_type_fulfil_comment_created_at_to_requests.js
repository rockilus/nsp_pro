module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    const now = new Date().getTime() / 1000;
    // Map int status to string and fulfillment
    const statusMap = {
      0: { status: "pending", fulfillment: "not_processed" },
      1: { status: "approved", fulfillment: "fulfilled" },
      2: { status: "denied", fulfillment: "unfulfilled" },
      3: { status: "pending", fulfillment: "not_processed" },
    };

    // Find all requests (no status filter)
    const requests = await db.collection("requests").find({}).toArray();
    for (const req of requests) {
      let mapped = { status: req.status, fulfillment: req.fulfillment };
      // If status is int and in statusMap, map it
      if (typeof req.status === "number" && statusMap.hasOwnProperty(req.status)) {
        mapped = statusMap[req.status];
      } else if (typeof req.status === "number") {
        // If status is int but not in map, treat as 0 (pending)
        mapped = statusMap[0];
      } else if (typeof req.status === "string" && !["pending","approved","denied"].includes(req.status)) {
        // If status is string but not a known value, set to pending
        mapped = statusMap[0];
      }
      await db.collection("requests").updateOne(
        { _id: req._id },
        {
          $set: {
            request_type: "work_demand",
            fulfillment: mapped.fulfillment || "not_processed",
            comment: req.comment !== undefined ? req.comment : "",
            created_at: req.created_at !== undefined ? req.created_at : now,
            status: mapped.status || req.status,
          },
        }
      );
    }
    // For any requests missing the new fields but not matching int status, add defaults
    await db.collection("requests").updateMany(
      { request_type: { $exists: false } },
      { $set: { request_type: "work_demand" } }
    );
    await db.collection("requests").updateMany(
      { fulfillment: { $exists: false } },
      { $set: { fulfillment: "not_processed" } }
    );
    await db.collection("requests").updateMany(
      { comment: { $exists: false } },
      { $set: { comment: "" } }
    );
    await db.collection("requests").updateMany(
      { created_at: { $exists: false } },
      { $set: { created_at: now } }
    );
    // For any requests with int status not in [0,1,2], set to "pending" and "not_processed"
    await db.collection("requests").updateMany(
      { status: { $type: "int", $nin: [0, 1, 2] } },
      { $set: { status: "pending", fulfillment: "not_processed" } }
    );
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Rollback: revert status and fulfillment to int, remove added fields
    const statusReverseMap = {
      pending: { status: 0, fulfillment: "not_processed" },
      approved: { status: 1, fulfillment: "fulfilled" },
      denied: { status: 2, fulfillment: "unfulfilled" },
    };
    const requests = await db.collection("requests").find({ status: { $in: ["pending", "approved", "denied"] } }).toArray();
    for (const req of requests) {
      const mapped = statusReverseMap[req.status];
      await db.collection("requests").updateOne(
        { _id: req._id },
        {
          $set: {
            status: mapped.status,
            fulfillment: mapped.fulfillment,
          },
          $unset: {
            request_type: "",
            comment: "",
            created_at: "",
          },
        }
      );
    }
    // Remove fields from any requests that may have them
    await db.collection("requests").updateMany({}, { $unset: { request_type: "", comment: "", created_at: "" } });
  }
};
