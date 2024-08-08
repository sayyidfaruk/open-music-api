/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('songs', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },

    title: {
      type: 'VARCHAR(255)',
      notNull: true
    },

    year: {
      type: 'INTEGER',
      notNull: true
    },

    performer: {
      type: 'VARCHAR(255)',
      notNull: true
    },

    genre: {
      type: 'VARCHAR(100)',
      notNull: true
    },

    duration: {
      type: 'INTEGER',
    },

    albumId: {
      type: 'VARCHAR(50)',
    },

    created_at: {
      type: 'TEXT',
      notNull: true,
    },

    updated_at: {
      type: 'TEXT',
      notNull: true,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('songs');
};
