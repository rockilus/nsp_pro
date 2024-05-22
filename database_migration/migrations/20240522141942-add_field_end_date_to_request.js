module.exports = {
  async up(db) {
    await db.collection('requests').find({}).forEach(function(doc) {
      db.collection('requests').updateOne({_id: doc._id}, {$set: {"end_date": doc.start_date}});
    });
  },

  async down(db) {
    await db.collection('requests').updateMany({}, {$unset: {"end_date": ""}});
  }
};