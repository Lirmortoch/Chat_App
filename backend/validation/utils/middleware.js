const validator = (schema) => {
  return (request, response, next) => {
    const fieldsData = request.body;
    const { error, value } = schema.validate(fieldsData, {
      abortEarly: false,
    });

    if (error) {
      return response.status(400).json({
        message: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    request.body.fieldsData = value;
    next();
  }
}

module.exports = { validator }