const Joi = require('joi');
const photoSchema = require('./photo.schema');

const avatarSchema = Joi.object({
  is_main: Joi.bool(),

  photo: photoSchema,
});

module.exports = avatarSchema;
