module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // 1. Find all work demand requests (request_type === 'work_demand') with a non-null shift
    const requests = await db.collection('requests').find({ request_type: 'work_demand', shift: { $ne: null } }).toArray();

    if (requests.length === 0) return;

    // 2. Get all relevant shift ids
    const shiftIds = [...new Set(requests.map(r => r.shift))];
    const shifts = await db.collection('shifts').find({ _id: { $in: shiftIds } }).toArray();
    const shiftMap = Object.fromEntries(shifts.map(s => [String(s._id), s]));

    // 3. For each request, decide what to do based on shift_type
    const bulkOps = requests.map(req => {
      const shift = shiftMap[String(req.shift)];
      if (!shift || typeof shift.shift_type !== 'number') return null;
      if (shift.shift_type === 0 || shift.shift_type === 1) {
        // Normal or Duty
        const shiftOption = {
          name: shift.name,
          id: String(req.shift),
          id_type: 2,
          is_bool_dim: false,
          category_name: 'Shifts',
        };
        return {
          updateOne: {
            filter: { _id: req._id },
            update: {
              $set: { shift_options: [shiftOption], shift: null },
            },
          },
        };
      } else if (shift.shift_type === 2 || shift.shift_type === 3) {
        // Rest or Leave
        return {
          updateOne: {
            filter: { _id: req._id },
            update: {
              $set: { request_type: 'leave' },
            },
          },
        };
      }
      return null;
    }).filter(Boolean);

    if (bulkOps.length > 0) {
      await db.collection('requests').bulkWrite(bulkOps);
    }
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // This down migration will attempt to restore shift_id from shift_options for work demand requests
    const requests = await db.collection('requests').find({ request_type: 'work_demand', shift: null, shift_options: { $type: 'array', $ne: [] } }).toArray();

    const bulkOps = requests.map(req => {
      const shiftOption = req.shift_options && req.shift_options[0];
      if (!shiftOption || !shiftOption.id) return null;
      return {
        updateOne: {
          filter: { _id: req._id },
          update: {
            $set: { shift: shiftOption.id, shift_options: [] },
          },
        },
      };
    }).filter(Boolean);

    if (bulkOps.length > 0) {
      await db.collection('requests').bulkWrite(bulkOps);
    }
  }
};
