const Joi = require('joi');

const chatSchema = Joi.object({
  name: Joi.string().max(45),
  type: Joi.string().max(25).valid('private', 'channel', 'group'),
  // url: Joi.string(),
  recipient_public_id: Joi.string(),
  avatar: Joi.any(),
  role: Joi.string().valid('low-admin', 'med-admin', 'high-admin', 'user', 'owner').default('user'),
  
  description: Joi.string(),

  deleted: Joi.bool().default(false),
  restricted: Joi.bool().default(false),

  delete_reason: Joi.string(),
  restrict_reason: Joi.string(),
});

module.exports = chatSchema;