const { ObjectId } = require('mongodb');

module.exports = {
  async up(db) {
    const collection = db.collection('workers');

    const cursor = collection.find({}); // Get all documents
    while (await cursor.hasNext()) {
      let doc = await cursor.next();
      let oldId = doc._id;

      // Skip if already ObjectId
      if (ObjectId.isValid(oldId) && typeof oldId === 'string') {
        let newId = new ObjectId(oldId);
        doc._id = newId;

        console.log("NEW DOC", doc);

        // Insert new document with ObjectId
        await collection.insertOne(doc);

        // Delete the old document
        await collection.deleteOne({ _id: oldId });
      }
    }
  },



  async down(db, client) {
    const workers = await db.collection('workers').find({}).toArray();
    for (const worker of workers) {
      await db.collection('workers').updateOne(
        { _id: worker._id },
        {
          $set: {
            _id: worker._id.toString(),
            team: worker.team.toString()
          }
        }
      );
    }
  }
};
