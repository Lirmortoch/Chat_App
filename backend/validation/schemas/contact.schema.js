const Joi = require('joi');

const contactSchema = Joi.object({
  first_name: Joi.string().min(3).max(128),
  email: Joi.string().email(), 
  phone_number: Joi.string(),
  last_name: Joi.string().min(3).max(128),
});

module.exports = contactSchema;