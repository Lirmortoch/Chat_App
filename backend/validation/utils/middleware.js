const validator = (schema) => {
  return (request, response, next) => {
    const isNested = request.body.fieldsData || request.body.sessionData;
    const dataToValidate = isNested || request.body;

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      allowUnknown: true, 
    });

    if (error) {
      return response.status(400).json({
        message: 'Validation error',
        details: error.details.map((d) => d.message),
      });
    }

    if (request.body.fieldsData) {
      request.body.fieldsData = value;
    } else if (request.body.sessionData) {
      request.body.sessionData = value;
    } else {
      request.body = value;
    }

    next();
  };
};

export { validator };
