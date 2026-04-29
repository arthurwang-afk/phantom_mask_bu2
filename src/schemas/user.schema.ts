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
}
