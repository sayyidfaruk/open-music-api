/* eslint-disable no-unused-vars */
const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exception/InvariantError');
const NotFoundError = require('../../exception/NotFoundError');
const { mapDbAlbumsToModel, mapDbSongsToModel } = require('../../utils/index');

class AlbumsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addAlbum({ name, year }) {
    const id = `album-${nanoid(15)}`;
    const createdAt = new Date().toISOString();

    const query = {
      text: 'INSERT INTO albums VALUES($1, $2, $3, $4, $4) RETURNING id',
      values: [id, name, year, createdAt],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Album gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getAlbums() {
    const result = await this._pool.query('SELECT * FROM albums');
    return result.rows.map(mapDbAlbumsToModel);
  }

  async getAlbumById(id) {
    const query = {
      text: 'SELECT * FROM albums WHERE id = $1',
      values: [id],
    };
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Album tidak ditemukan');
    }

    const album =  result.rows.map(mapDbAlbumsToModel)[0];

    const query2 = {
      text: 'SELECT id, title, performer FROM songs WHERE "albumId" = $1',
      values: [id],
    };

    const result2 = await this._pool.query(query2);

    const songs = result2.rows.map(mapDbSongsToModel);

    const response = {
      ...album,
      songs
    };

    return response;
  }

  async editAlbumById(id, { name, year }) {
    const updatedAt = new Date().toISOString();
    const query = {
      text: 'UPDATE albums SET name = $1, year = $2, updated_at = $3 WHERE id = $4 RETURNING id',
      values: [name, year, updatedAt, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Gagal memperbarui Album. Id tidak ditemukan');
    }
  }

  async deleteAlbumById(id) {
    const query = {
      text: 'DELETE FROM albums WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Album gagal dihapus. Id tidak ditemukan');
    }
  }

  async editAlbumCoverById(id, path) {
    const query = {
      text: 'UPDATE albums SET "coverUrl" = $1 WHERE id = $2',
      values: [path, id],
    };
    const result = await this._pool.query(query);

    try {
      if (result.rowCount === 0) {
        throw new NotFoundError('Gagal menambahkan cover. Id tidak ditemukan.');
      }
    } catch (error) {
      throw new error;
    }
  }

  async addLikeAlbum(albumId, credentialId) {
    const check = {
      text: 'SELECT * FROM user_album_likes WHERE album_id = $1 AND user_id = $2',
      values: [albumId, credentialId],
    };

    const like = await this._pool.query(check);

    if (like.rowCount) {
      throw new InvariantError('Album sudah disukai');
    }

    const id = `albumLikes-${nanoid(15)}`;

    const query = {
      text: 'INSERT INTO user_album_likes VALUES($1, $2, $3) RETURNING id',
      values: [id, albumId, credentialId],
    };

    await this._pool.query(query);

    await this._cacheService.delete(`user_album_likes:${id}`);
  }

  async deleteLikeAlbum(albumId, credentialId) {
    const query = {
      text: 'DELETE FROM user_album_likes WHERE album_id = $1 AND user_id = $2 RETURNING id',
      values: [albumId, credentialId],
    };
    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Gagal menghapus Like, Album belum disukai');
    }

    await this._cacheService.delete(`user_album_likes:${albumId}`);
  }

  async getLikesAlbum(id) {
    try {
      const result = await this._cacheService.get(`user_album_likes:${id}`);
      return {
        isCache: true,
        result: JSON.parse(result),
      };
    } catch (error) {
      const query = {
        text: 'SELECT * FROM user_album_likes WHERE album_id = $1',
        values: [id],
      };
      const result = await this._pool.query(query);
      await this._cacheService.set(`user_album_likes:${id}`, JSON.stringify(result.rowCount), 1800);

      return {
        isCache: false,
        result: result.rowCount,
      };
    }
  }
}

module.exports = AlbumsService;
