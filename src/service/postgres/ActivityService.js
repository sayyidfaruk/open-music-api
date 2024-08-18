const { Pool } = require('pg');
const NotFoundError = require('../../exception/NotFoundError');
const AuthorizationError = require('../../exception/AuthorizationError');

class ActivitiesService {
  constructor() {
    this._pool = new Pool();
  }

  async getActivitiesById(id) {
    const queryPlaylist = {
      text: `SELECT users.username, songs.title, activities.action, activities.time FROM playlist_song_activities AS activities
      LEFT JOIN users ON activities.user_id = users.id
      LEFT JOIN songs ON activities.song_id = songs.id
      WHERE activities.playlist_id = $1`,
      values: [id],
    };

    const result = await this._pool.query(queryPlaylist);

    return result.rows;
  }

  async verifyPlaylistAccess(id, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    if (result.rows[0].owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini.');
    }
  }
}

module.exports = ActivitiesService;