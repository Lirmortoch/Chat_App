const Joi = require('joi');
const parsePhoneNumber = require('libphonenumber-js');
const avatarSchema = require('./avatar.schema');

const contactSchema = Joi.object({
  first_name: Joi.string().min(3).max(125),
  email: Joi.string().email().max(145),

  phone_number: Joi.string().custom((value, helper) => {
    const parsed_phone_number = parsePhoneNumber(value);

    if (!parsed_phone_number.isValid() || !parsed_phone_number.isPossible() || value.length > 25) {
      return helper.message('Phone number is wrong. Enter again');
    }
  }),

  last_name: Joi.string().min(3).max(125),
  avatar: avatarSchema,
});

module.exports = contactSchema;
