export const listPharmaciesSchema = {
  description: 'List pharmacies with optional day/time filter',
  tags: ['pharmacies'],
  querystring: {
    type: 'object',
    properties: {
      day: { type: 'string', enum: ['Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'] },
      time: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
    },
    dependencies: {
      time: { required: ['day'] },
    },
  },
  response: {
    200: {
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
  },
}

export const listMasksSchema = {
  description: 'List masks for a pharmacy with optional sort',
  tags: ['pharmacies'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'integer' },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      sort: { type: 'string', enum: ['name', 'price'] },
    },
  },
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          price: { type: 'number' },
          stockQuantity: { type: 'integer' },
        },
      },
    },
  },
}

export const maskCountSchema = {
  description: 'List pharmacies by mask count in price range',
  tags: ['pharmacies'],
  querystring: {
    type: 'object',
    required: ['minPrice', 'maxPrice'],
    properties: {
      minPrice: { type: 'number', minimum: 0 },
      maxPrice: { type: 'number', minimum: 0 },
      countMin: { type: 'integer', minimum: 0 },
      countMax: { type: 'integer', minimum: 0 },
    },
  },
}

export const upsertMasksSchema = {
  description: 'Bulk create/update masks for a pharmacy',
  tags: ['pharmacies'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'integer' },
    },
  },
  body: {
    type: 'object',
    required: ['masks'],
    properties: {
      masks: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['name', 'price', 'stockQuantity'],
          properties: {
            name: { type: 'string' },
            price: { type: 'number', exclusiveMinimum: 0 },
            stockQuantity: { type: 'integer', minimum: 0 },
          },
        },
      },
    },
  },
}
