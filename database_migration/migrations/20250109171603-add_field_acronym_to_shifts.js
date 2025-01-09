module.exports = {
  async up(db, client) {
    // Fetch all shifts
    const shifts = await db.collection('shifts').find().toArray();

    // Function to generate acronym
    function generateAcronym(inputString, existingAcronyms) {
      if (!inputString.trim()) {
        return '';
      }

      const words = inputString.split(' ').filter(word => word.length > 0);
      let acronym = words.map(word => word[0].toUpperCase()).join('');
      
      if (!existingAcronyms.includes(acronym)) {
        return acronym;
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

    // Group shifts by team
    const shiftsByTeam = shifts.reduce((acc, shift) => {
      if (!acc[shift.team]) {
        acc[shift.team] = [];
      }
      acc[shift.team].push(shift);
      return acc;
    }, {});

    // Update each shift with the new fields
    for (const team in shiftsByTeam) {
      const teamShifts = shiftsByTeam[team];
      const existingAcronyms = teamShifts.map(shift => shift.acronym).filter(Boolean);

      for (const shift of teamShifts) {
        const acronym = generateAcronym(shift.name, existingAcronyms);
        existingAcronyms.push(acronym); // Add the new acronym to the list to avoid duplicates

        await db.collection('shifts').updateOne(
          { _id: shift._id },
          { $set: { acronym: acronym, acronym_custom: false } }
        );
      }
    }
  },

  async down(db, client) {
    // Remove the fields acronym and acronym_custom from the shifts collection
    await db.collection('shifts').updateMany(
      {},
      { $unset: { acronym: "", acronym_custom: "" } }
    );
  }
};