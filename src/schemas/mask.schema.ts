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
}
