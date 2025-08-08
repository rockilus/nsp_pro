// Switch to application database
db = db.getSiblingDB("test");

// Insert a user document compatible with UserSchema
db.users.insertOne({
  _id: ObjectId("64e9b7f1e13e4a1a9c8b4567"), // Set a known ObjectId for testing
  email: "testuser@example.com",
  first_name: "Test",
  last_name: "User",
  language: "en",
  sign_up_at: new Date(),
  impersonating_user: null
});