const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
}

export const adjustStockSchema = {
  description: 'Adjust mask stock quantity',
  tags: ['masks'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'integer' },
    },
  },
  body: {
    type: 'object',
    required: ['adjustment'],
    properties: {
      adjustment: { type: 'integer' },
    },
  },
  response: {
    200: {
      type: 'object',
      example: { id: 1, pharmacyId: 1, name: '棉護口罩（藍色）3入', price: 10.0, stockQuantity: 25 },
      properties: {
        id: { type: 'integer' },
        pharmacyId: { type: 'integer' },
        name: { type: 'string' },
        price: { type: 'number' },
        stockQuantity: { type: 'integer' },
      },
    },
    400: errorSchema,
    404: errorSchema,
    422: errorSchema,
  },
}
