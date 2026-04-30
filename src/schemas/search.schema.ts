const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
}

export const searchSchema = {
  description: 'Search pharmacies and masks by name',
  tags: ['search'],
  querystring: {
    type: 'object',
    required: ['q'],
    properties: {
      q: { type: 'string', minLength: 1 },
    },
  },
  response: {
    200: {
      type: 'object',
      example: {
        pharmacies: [{ id: 1, name: '康健藥局', cashBalance: 1000.0 }],
        masks: [{ id: 1, name: '棉護口罩（藍色）3入', price: 10.0, stockQuantity: 50, pharmacyId: 1 }],
      },
      properties: {
        pharmacies: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              cashBalance: { type: 'number' },
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
    400: errorSchema,
  },
}
