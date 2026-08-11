import Joi from 'joi';
import photoSchema from './photo.schema.js';

const chatSchema = Joi.object({
  name: Joi.string().max(45),
  type: Joi.string()
    .max(25)
    .valid('private-chat', 'private-channel', 'private-group', 'public-channel', 'public-group'),
  url: Joi.string(),
  recipient_public_id: Joi.string(),
  photo: photoSchema,
  role: Joi.string()
    .valid('low-admin', 'med-admin', 'high-admin', 'user', 'owner')
    .default('user')
    .max(25),

  description: Joi.string().max(255),

  deleted: Joi.bool().default(false),
  restricted: Joi.bool().default(false),

  delete_reason: Joi.string().max(125),
  restrict_reason: Joi.string().max(125),

  last_read_at: Joi.bool(),
});

export default chatSchema;
