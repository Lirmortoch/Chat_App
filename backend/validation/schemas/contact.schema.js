import Joi from 'joi';
import parsePhoneNumber from 'libphonenumber-js';

import avatarSchema from './avatar.schema.js';

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

export default contactSchema;
