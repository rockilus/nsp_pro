module.exports = {
  async up(db) {
    // Create notifications collection with indexes
    const notificationsExists = await db
      .listCollections({ name: "notifications" })
      .hasNext();
    if (!notificationsExists) {
      await db.createCollection("notifications");
    }
    await db
      .collection("notifications")
      .createIndex({ user_id: 1, read: 1, created_at: -1 });
    await db
      .collection("notifications")
      .createIndex({ user_id: 1, created_at: -1 });

    // Create notification_preferences collection with unique index on user_id
    const prefsExists = await db
      .listCollections({ name: "notification_preferences" })
      .hasNext();
    if (!prefsExists) {
      await db.createCollection("notification_preferences");
    }
    await db
      .collection("notification_preferences")
      .createIndex({ user_id: 1 }, { unique: true });
  },

  async down(db) {
    await db.collection("notifications").drop();
    await db.collection("notification_preferences").drop();
  },
};
