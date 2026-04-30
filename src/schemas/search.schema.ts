const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
}

export const searchSchema = {
  description: 'Search pharmacies and masks by name with pagination',
  tags: ['search'],
  querystring: {
    type: 'object',
    required: ['q'],
    properties: {
      q: { type: 'string', minLength: 1 },
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            pharmacies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                },
              },
            },
            masks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  price: { type: 'number' },
                  stockQuantity: { type: 'integer' },
                  pharmacyId: { type: 'integer' },
                },
              },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            pharmaciesTotal: { type: 'integer' },
            masksTotal: { type: 'integer' },
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
          },
        },
      },
    },
    400: errorSchema,
  },
}
