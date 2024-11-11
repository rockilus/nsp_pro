module.exports = {
  async up(db, client) {
    try {
      // Remove the 'status' field from all documents in the 'assignments' collection
      const result = await db.collection('assignments').updateMany(
        {},
        { $unset: { status: "" } }
      );

      console.log(`Up Migration: Removed 'status' field from ${result.modifiedCount} documents in 'assignments' collection.`);
    } catch (error) {
      console.error("Up Migration Error:", error);
      throw error;
    }
  },

  async down(db, client) {
    try {
      // Add the 'status' field back to all documents in the 'assignments' collection with a default value
      const result = await db.collection('assignments').updateMany(
        { status: { $exists: false } }, // Only update documents where 'status' was removed
        { $set: { status: null } } // Set 'status' to null or any default value you prefer
      );

      console.log(`Down Migration: Added 'status' field to ${result.modifiedCount} documents in 'assignments' collection with default value.`);
    } catch (error) {
      console.error("Down Migration Error:", error);
      throw error;
    }
  }
};