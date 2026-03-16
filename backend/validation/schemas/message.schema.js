const Joi = require('joi');

const messageSchema = Joi.object({
  message: Joi.string(),
  additionals: Joi.array().items(Joi.any()),
});

module.exports = messageSchema;