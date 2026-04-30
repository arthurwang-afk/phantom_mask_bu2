const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
}

export const adjustStockSchema = {
  description: 'Adjust mask stock quantity (requires auth)',
  tags: ['masks'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'integer' } },
  },
  body: {
    type: 'object',
    required: ['adjustment'],
    properties: {
      adjustment: { type: 'integer', not: { const: 0 } },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        pharmacyId: { type: 'integer' },
        name: { type: 'string' },
        price: { type: 'number' },
        stockQuantity: { type: 'integer' },
      },
    },
    400: errorSchema,
    401: errorSchema,
    404: errorSchema,
    422: errorSchema,
  },
}
