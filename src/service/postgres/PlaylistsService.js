const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exception/InvariantError');
const NotFoundError = require('../../exception/NotFoundError');
const AuthorizationError = require('../../exception/AuthorizationError');

class PlaylistsService {
  constructor(collaborationsService) {
    this._pool = new Pool();
    this._collaborationsService = collaborationsService;
  }

  async addPlaylist({ name, owner }) {
    const id = `playlist-${nanoid(15)}`;

    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Lagu gagal ditambahkan.');
    }

    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const query = {
      text: `SELECT playlists.id, playlists.name, users.username FROM playlists 
    LEFT JOIN users ON playlists.owner = users.id 
    LEFT JOIN collaborations ON playlists.id = collaborations.playlist_id 
    WHERE playlists.owner = $1 OR collaborations.user_id = $1`,
      values: [owner],
    };

    const result = await this._pool.query(query);

    return result.rows;
  }

  async addPlaylistSongById(playlistId, songId) {
    const id = `playlist-song-${nanoid(15)}`;

    const query = {
      text: 'INSERT INTO playlist_songs VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };
    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Lagu gagal ditambahkan.');
    }

    return result.rows[0].id;
  }

  async getPlaylistSongsById(playlistId) {
    const queryPlaylist = {
      text: `SELECT playlists.id, playlists.name, users.username FROM playlists 
    LEFT JOIN playlist_songs ON playlists.id = playlist_songs.playlist_id 
    LEFT JOIN users ON playlists.owner = users.id 
    WHERE playlists.id = $1`,
      values: [playlistId],
    };

    const result = await this._pool.query(queryPlaylist);

    if (!result.rows[0].id) {
      throw new NotFoundError('Playlist tidak ditemukan.');
    }

    const rows = result.rows;

    const querySongs = {
      text: `SELECT songs.id, songs.title, songs.performer FROM songs 
    LEFT JOIN playlist_songs ON songs.id = playlist_songs.song_id 
    WHERE playlist_songs.playlist_id = $1;`,
      values: [playlistId],
    };

    const resultSongs = await this._pool.query(querySongs);

    if (!resultSongs.rows.length) {
      return { rows, songs: [] };
    }

    return { ...rows[0], songs: resultSongs.rows };
  }

  async deletePlaylistById(playlistId) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id',
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist gagal dihapus. ID tidak ditemukan.');
    }
  }

  async deletePlaylistSongById(playlistId, songId) {
    const query = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2 RETURNING id',
      values: [playlistId, songId],
    };
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Lagu gagal dihapus. ID tidak ditemukan.');
    }
  }

  async verifyPlaylistOwner(id, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan.');
    }

    const playlist = result.rows[0];
    if (playlist.owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini.');
    }
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      try {
        await this._collaborationsService.verifyCollaborator(playlistId, userId);
      } catch {
        throw error;
      }
    }
  }

  async checkSong(songId) {
    const query = {
      text: 'SELECT * FROM songs WHERE id = $1',
      values: [songId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Lagu gagal ditambahkan. ID lagu tidak ditemukan.');
    }
  }

  async addActivity(playlistId, songId, credentialId, action, time) {
    const id = `activity-${nanoid(15)}`;
    const query = {
      text: 'INSERT INTO playlist_song_activities VALUES($1, $2, $3, $4, $5, $6) RETURNING id',
      values: [id, playlistId, songId, credentialId, action, time],
    };

    await this._pool.query(query);
  }
}

module.exports = PlaylistsService;
