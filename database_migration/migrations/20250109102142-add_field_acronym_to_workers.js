module.exports = {
  async up(db, client) {
    // Fetch all workers
    const workers = await db.collection('workers').find().toArray();

    // Function to generate acronym
    function generateAcronym(inputString, existingAcronyms) {
      if (!inputString.trim()) {
        return '';
      }

      const words = inputString.split(' ');
      let acronym = words.map(word => word[0].toUpperCase()).join('');
      
      if (!existingAcronyms.includes(acronym)) {
        return acronym;
      }
      
      if (words[words.length - 1].length > 1) {
        const acronymWithSecondLetter = acronym + words[words.length - 1][1].toLowerCase();
        if (!existingAcronyms.includes(acronymWithSecondLetter)) {
          return acronymWithSecondLetter;
        }
      }
      
      let counter = 2;
      while (true) {
        const newAcronym = `${acronym}-${counter}`;
        if (!existingAcronyms.includes(newAcronym)) {
          return newAcronym;
        }
        counter++;
      }
    }

    // Group workers by team
    const workersByTeam = workers.reduce((acc, worker) => {
      if (!acc[worker.team]) {
        acc[worker.team] = [];
      }
      acc[worker.team].push(worker);
      return acc;
    }, {});

    // Update each worker with the new fields
    for (const team in workersByTeam) {
      const teamWorkers = workersByTeam[team];
      const existingAcronyms = teamWorkers.map(worker => worker.acronym).filter(Boolean);

      for (const worker of teamWorkers) {
        const acronym = generateAcronym(worker.name, existingAcronyms);
        existingAcronyms.push(acronym); // Add the new acronym to the list to avoid duplicates

        await db.collection('workers').updateOne(
          { _id: worker._id },
          { $set: { acronym: acronym, acronym_custom: false } }
        );
      }
    }
  },

  async down(db, client) {
    // Remove the fields acronym and acronym_custom from the workers collection
    await db.collection('workers').updateMany(
      {},
      { $unset: { acronym: "", acronym_custom: "" } }
    );
  }
};