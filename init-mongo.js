// Switch to application database
db = db.getSiblingDB("test");

// Create any necessary database indexes or initial configuration
// User creation is now handled by the onboard endpoint via init-dev-user service

print("MongoDB initialization completed - user creation handled by onboard service");