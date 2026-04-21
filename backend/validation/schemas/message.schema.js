import Joi from 'joi';

const messageSchema = Joi.object({
  message: Joi.string(),
  additionals: Joi.array().items(
    Joi.object({
      file_type: Joi.string().max(15),
      file_url: Joi.string(),
      file_name: Joi.string().max(50),
    }),
  ),
});

export default messageSchema;
