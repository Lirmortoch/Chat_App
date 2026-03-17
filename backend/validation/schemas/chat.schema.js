const Joi = require('joi');

const chatSchema = Joi.object({
  name: Joi.string().max(45),
  type: Joi.string().max(25).valid('private', 'channel', 'group'),
  // url: Joi.string(),
  recipient_public_id: Joi.string(),
});

module.exports = chatSchema;