const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
}

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
      example: [
        { id: 1, name: '康健藥局', cashBalance: 1000.0 },
        { id: 2, name: '健康藥局', cashBalance: 500.0 },
      ],
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          cashBalance: { type: 'number' },
        },
      },
    },
    400: errorSchema,
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
      example: [
        { id: 1, name: '棉護口罩（藍色）3入', price: 10.0, stockQuantity: 50 },
        { id: 2, name: '醫守口罩（白色）6入', price: 25.0, stockQuantity: 30 },
      ],
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
    400: errorSchema,
    404: errorSchema,
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
  response: {
    200: {
      type: 'array',
      example: [
        { id: 1, name: '康健藥局', cashBalance: 1000.0, maskCount: 5 },
        { id: 2, name: '健康藥局', cashBalance: 500.0, maskCount: 3 },
      ],
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          cashBalance: { type: 'number' },
          maskCount: { type: 'integer' },
        },
      },
    },
    400: errorSchema,
  },
}

export const upsertMasksSchema = {
  description: 'Batch upsert masks for a pharmacy (create new or update existing by name; masks not in the list are preserved)',
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
  response: {
    200: {
      type: 'array',
      example: [
        { id: 1, pharmacyId: 1, name: '棉護口罩（藍色）3入', price: 25.0, stockQuantity: 100 },
        { id: 2, pharmacyId: 1, name: '醫守口罩（白色）6入', price: 15.0, stockQuantity: 50 },
      ],
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          pharmacyId: { type: 'integer' },
          name: { type: 'string' },
          price: { type: 'number' },
          stockQuantity: { type: 'integer' },
        },
      },
    },
    400: errorSchema,
    404: errorSchema,
  },
}
