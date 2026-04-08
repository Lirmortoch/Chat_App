const Joi = require('joi');

const sessionSchema = Joi.object({
  ip_address: Joi.string().pattern(new RegExp('^(((?!25?[6-9])[12]\d|[1-9])?\d\.?\b){4}$')),
  user_agent: Joi.string(),
});

module.exports = sessionSchema;