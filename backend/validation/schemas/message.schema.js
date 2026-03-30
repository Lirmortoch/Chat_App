const Joi = require('joi');

const messageSchema = Joi.object({
  message: Joi.string(),
  additionals: Joi.array().items(Joi.object({
    file_type: Joi.string(15),
    file_url: Joi.string(),
    file_name: Joi.string().max(50),
  })),
});

module.exports = messageSchema;