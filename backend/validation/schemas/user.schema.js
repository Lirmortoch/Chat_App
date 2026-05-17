/* eslint-disable no-useless-escape */
import Joi from 'joi';
import parsePhoneNumber from 'libphonenumber-js';

import avatarSchema from './avatar.schema.js';

const userSchema = Joi.object({
  first_name: Joi.string().min(3).max(125),
  username: Joi.string().min(5).max(45),
  password: Joi.string().min(12).max(50).pattern(new RegExp(/^\S{12,50}$/)),
  repeated_password: Joi.ref('password'),
  email: Joi.string().email().max(135),

  phone_number: Joi.string().custom((value, helper) => {
    const parsed_phone_number = parsePhoneNumber(value);

    if (!parsed_phone_number.isValid() || !parsed_phone_number.isPossible()) {
      return helper.message('Phone number is wrong. Enter again');
    }
  }),

  role: Joi.string()
    .valid('low-admin', 'med-admin', 'high-admin', 'user', 'owner')
    .default('user')
    .max(25),
  last_name: Joi.string().min(3).max(125),
  user_about: Joi.string().max(125),

  avatar: avatarSchema,

  deleted: Joi.bool().default(false),
  restricted: Joi.bool().default(false),

  delete_reason: Joi.string().max(125),
  restrict_reason: Joi.string().max(125),
});

export default userSchema;
