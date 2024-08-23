/* eslint-disable no-undef */
require('dotenv').config();

const Hapi = require('@hapi/hapi');
const Jwt = require('@hapi/jwt');
const Inert = require('@hapi/inert');
const path = require('path');

const ClientError = require('./exception/ClientError');

// albums
const albums = require('./api/albums');
const AlbumsService = require('./service/postgres/AlbumService');
const AlbumsValidator = require('./validator/albums');

// songs
const songs = require('./api/songs');
const SongsService = require('./service/postgres/SongService');
const SongsValidator = require('./validator/songs');

// users
const users = require('./api/users');
const UsersService = require('./service/postgres/UsersService');
const UsersValidator = require('./validator/users');

// authentications
const authentications = require('./api/authentications');
const AuthenticationsService = require('./service/postgres/AuthenticationService');
const AuthenticationsValidator = require('./validator/authentications');
const TokenManager = require('./tokenize/TokenManager');

// playlists
const playlists = require('./api/playlists');
const PlaylistsService = require('./service/postgres/PlaylistsService'); //
const PlaylistsValidator = require('./validator/playlists');

// collaborations
const collaborations = require('./api/collaborations');
const CollaborationsService = require('./service/postgres/CollaborationService');
const CollaborationsValidator = require('./validator/collaborations');

// activities
const activities = require('./api/activities');
const ActivitiesService = require('./service/postgres/ActivityService');
const ActivitiesValidator = require('./validator/activities');

// exports
const _exports = require('./api/exports');
const ProducerService = require('./service/rabbitmq/ProducerService');
const ExportsValidator = require('./validator/exports');

const StorageService = require('./service/storage/StorageService');
const CacheService = require('./service/redis/CacheService');

const init = async () => {
  const cacheService = new CacheService();
  const albumsService = new AlbumsService(cacheService);
  const songsService = new SongsService();
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  const collaborationsService = new CollaborationsService();
  const playlistsService = new PlaylistsService(collaborationsService);
  const activitiesService = new ActivitiesService();
  const storageService = new StorageService(path.join(__dirname, '/api/albums/file/images'));

  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  await server.register([
    {
      plugin: Jwt,
    },
    {
      plugin: Inert,
    }
  ]);

  server.auth.strategy('openmusic_jwt', 'jwt', {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id,
      },
    }),
  });

  await server.register(
    [
      {
        plugin: songs,
        options: {
          service: songsService,
          validator: SongsValidator
        }
      },
      {
        plugin: albums,
        options: {
          service: albumsService,
          storageService,
          validator: AlbumsValidator
        }
      },
      {
        plugin: users,
        options: {
          service: usersService,
          validator: UsersValidator,
        }
      },
      {
        plugin: authentications,
        options: {
          authenticationsService,
          usersService,
          tokenManager: TokenManager,
          validator: AuthenticationsValidator,
        },
      },
      {
        plugin: playlists,
        options: {
          service: playlistsService,
          validator: PlaylistsValidator,
        },
      },
      {
        plugin: collaborations,
        options: {
          collaborationsService,
          playlistsService,
          validator: CollaborationsValidator,
        },
      },
      {
        plugin: activities,
        options: {
          service: activitiesService,
          validator: ActivitiesValidator,
        },
      },
      {
        plugin: _exports,
        options: {
          service: ProducerService,
          playlistsService,
          validator: ExportsValidator,
        }
      }
    ]
  );

  server.ext('onPreResponse', (request, h) => {
    const { response } = request;

    if (response instanceof ClientError) {
      const newResponse = h.response({
        status: 'fail',
        message: response.message,
      });
      newResponse.code(response.statusCode);
      return newResponse;
    }

    return h.continue;
  });

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

init();
