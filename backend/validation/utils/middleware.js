const validator = (schema) => {
  return (request, response, next) => {
    const fieldsData = request.body.fieldsData || request.body.sessionData;
    const fieldsName = request.body.sessionData === 'undefined' ? 'fieldsData' : 'sessionData';

    const { error, value } = schema.validate(fieldsData, {
      abortEarly: false,
    });

    if (error) {
      return response.status(400).json({
        message: 'Validation error',
        details: error.details.map((d) => d.message),
      });
    }

    request.body[fieldsName] = value;
    next();
  };
};

export { validator };
