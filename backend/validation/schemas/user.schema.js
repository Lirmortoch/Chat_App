const Joi = require('joi');
const parsePhoneNumber = require('libphonenumber-js');

const userSchema = Joi.object({
  first_name: Joi.string().min(3).max(128),
  username: Joi.string().min(5).max(45),
  password: Joi.string().pattern(new RegExp('[\W\w]{4,50}')),
  repeated_password: Joi.ref('password'),
  email: Joi.string().email(), 
	phone_number: Joi.string().custom((value, helper) => {
    const parsed_phone_number = parsePhoneNumber(value);
          
    if (!parsed_phone_number.isValid() || !parsed_phone_number.isPossible()) {
      return helper.message("Phone number is wrong. Enter again");
    }
  }),
	role: Joi.string().valid('admin', 'user', 'owner').default('user'), 
	last_name: Joi.string().min(3).max(128),
	user_about: Joi.string().min(3).max(128),
  
  avatar: Joi.any(),
});

module.exports = userSchema;