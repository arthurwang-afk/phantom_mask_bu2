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
}
