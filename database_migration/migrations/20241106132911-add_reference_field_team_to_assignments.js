const { ObjectId } = require('mongodb');

const RequestStatus = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
  DISABLED: 3,
};

module.exports = {
  async up(db, client) {
    const requests = await db.collection('requests').find({}).toArray();
    for (const request of requests) {
      console.log(`Processing request ${request._id}`);
      // Find the worker to get the team reference
      const worker = await db.collection('workers').findOne({ _id: ObjectId(request.worker) });
      if (worker && worker.team) {
        // Update the request with the new fields
        await db.collection('requests').updateOne(
          { _id: request._id },
          {
            $set: {
              team: worker.team,
              negative: false,
              status: RequestStatus[request.status.toUpperCase()],
              start_date: new Date(request.start_date).getTime() / 1000,
              end_date: new Date(request.end_date).getTime() / 1000,
            },
          }
        );
      }
    }
  },

  async down(db, client) {
    // Revert the changes made in the up migration
    await db.collection('requests').updateMany(
      {},
      {
        $unset: { team: "", negative: "" },
        $set: {
          status: { $toString: "$status" },
          start_date: { $toDate: { $multiply: ["$start_date", 1000] } },
          end_date: { $toDate: { $multiply: ["$end_date", 1000] } },
        },
      }
    );
  }
};