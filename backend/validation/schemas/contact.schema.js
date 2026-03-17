const Joi = require('joi');
const parsePhoneNumber = require('libphonenumber-js');

const contactSchema = Joi.object({
  first_name: Joi.string().min(3).max(128),
  email: Joi.string().email(), 
  phone_number: Joi.string().custom((value, helper) => {
    const parsed_phone_number = parsePhoneNumber(value);
          
    if (!parsed_phone_number.isValid() || !parsed_phone_number.isPossible()) {
      return helper.message("Phone number is wrong. Enter again");
    }
  }),
  last_name: Joi.string().min(3).max(128),
  avatar: Joi.any(),
});

module.exports = contactSchema;