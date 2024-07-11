module.exports = {
  async up(db) {
	await db.collection('users').updateMany({}, {
	  $set: { 
		sign_up_at: new Date().toISOString() 
	  }
	});
  },

  async down(db) {
	await db.collection('users').updateMany({}, {
	  $unset: { 
		sign_up_at: "" 
	  }
	});
  }
};