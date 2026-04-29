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
}
