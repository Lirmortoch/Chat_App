const Joi = require('joi');
const { message } = require('./contact.schema');

const messageSchema = Joi.object({
  message: Joi.string(),
  additionals: Joi.array().items(Joi.any()),
});