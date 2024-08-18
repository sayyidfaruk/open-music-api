/* eslint-disable camelcase */
const Joi = require('joi');

const ActivitiesPayloadSchema = Joi.object({
  id: Joi.string().required(),
  playlist_id: Joi.string().required(),
  song_id: Joi.string().required(),
  user_id: Joi.string().required(),
  action: Joi.string().required(),
  time: Joi.string().isoDate().required(),
});

module.exports = { ActivitiesPayloadSchema };
