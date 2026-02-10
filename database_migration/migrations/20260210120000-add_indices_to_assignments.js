module.exports = {
  async up(db) {
    // Add compound index on team and date for main query pattern
    await db.collection('assignments').createIndex(
      { team: 1, date: 1 },
      { name: 'idx_assignments_team_date' }
    );

    // Add index on source_id and date for recurrence materialization queries
    await db.collection('assignments').createIndex(
      { source_id: 1, date: 1 },
      { name: 'idx_assignments_source_date' }
    );

    // Add compound index on team, worker, and date for worker-filtered queries (mobile use case)
    await db.collection('assignments').createIndex(
      { team: 1, worker: 1, date: 1 },
      { name: 'idx_assignments_team_worker_date' }
    );
  },

  async down(db) {
    // Drop indices in reverse order
    await db.collection('assignments').dropIndex('idx_assignments_team_worker_date');
    await db.collection('assignments').dropIndex('idx_assignments_source_date');
    await db.collection('assignments').dropIndex('idx_assignments_team_date');
  }
};
