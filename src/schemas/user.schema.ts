const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
}

export const topSpendersSchema = {
  description: 'Get top N users by spending in a date range',
  tags: ['users'],
  querystring: {
    type: 'object',
    required: ['start', 'end'],
    properties: {
      start: { type: 'string', format: 'date' },
      end: { type: 'string', format: 'date' },
      limit: { type: 'integer', minimum: 1, default: 10 },
    },
  },
  response: {
    200: {
      type: 'array',
      example: [
        { id: 1, name: '游雅文', totalSpent: 320.5 },
        { id: 2, name: '賴思妤', totalSpent: 210.0 },
        { id: 3, name: '方佳慧', totalSpent: 150.0 },
      ],
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          totalSpent: { type: 'number' },
        },
      },
    },
    400: errorSchema,
  },
}
