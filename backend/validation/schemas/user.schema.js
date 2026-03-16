const Joi = require('joi');

const userSchema = Joi.object({
  first_name: Joi.string().min(3).max(128),
  username: Joi.string().min(5).max(45),
  password: Joi.string().pattern(new RegExp('[\W\w]{4,50}')),
  repeated_password: Joi.ref('password'),
  email: Joi.string().email(), 
	phone_number: Joi.string(),
	role: Joi.string().valid('admin', 'user', 'owner').default('user'), 
	last_name: Joi.string().min(3).max(128),
	user_about: Joi.string().min(3).max(128),
  
  avatar: Joi.object({
    file_url: Joi.string(),
    file_type: Joi.string(),
    is_main: Joi.bool(),
  }),
});

module.exports = userSchema;