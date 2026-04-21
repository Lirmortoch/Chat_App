import Joi from 'joi';
import photoSchema from './photo.schema.js';

const avatarSchema = Joi.object({
  is_main: Joi.bool(),

  photo: photoSchema,
});

export default avatarSchema;
