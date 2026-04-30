const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
}

export const purchaseSchema = {
  description: 'Purchase masks from pharmacies',
  tags: ['purchases'],
  body: {
    type: 'object',
    required: ['userId', 'items'],
    properties: {
      userId: { type: 'integer' },
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['maskId', 'quantity'],
          properties: {
            maskId: { type: 'integer' },
            quantity: { type: 'integer', minimum: 1 },
          },
        },
      },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        totalAmount: { type: 'number' },
        purchaseCount: { type: 'integer' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              maskId: { type: 'integer' },
              maskName: { type: 'string' },
              quantity: { type: 'integer' },
              unitPrice: { type: 'number' },
              subtotal: { type: 'number' },
            },
          },
        },
      },
    },
    400: errorSchema,
    404: errorSchema,
    422: errorSchema,
  },
}
