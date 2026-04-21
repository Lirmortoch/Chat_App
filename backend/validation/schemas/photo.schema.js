import Joi from 'joi';

const photoSchema = Joi.object({
  file_name: Joi.string().max(50),
  file_type: Joi.string().max(15),
  file_url: Joi.string(),
  height: Joi.number().max(1440).min(500),
  width: Joi.number().max(1440).min(500),
});

export default photoSchema;
