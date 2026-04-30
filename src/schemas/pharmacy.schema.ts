const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
}

const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'integer' },
    pageSize: { type: 'integer' },
    total: { type: 'integer' },
    totalPages: { type: 'integer' },
  },
}

const paginationQuery = {
  page: { type: 'integer', minimum: 1, default: 1 },
  pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
}

export const listPharmaciesSchema = {
  description: 'List pharmacies with optional day/time filter',
  tags: ['pharmacies'],
  querystring: {
    type: 'object',
    properties: {
      day: { type: 'string', enum: ['Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'] },
      time: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
      ...paginationQuery,
    },
    dependencies: { time: { required: ['day'] } },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
            },
          },
        },
        pagination: paginationSchema,
      },
    },
    400: errorSchema,
  },
}

export const listMasksSchema = {
  description: 'List masks for a pharmacy with optional sort and pagination',
  tags: ['pharmacies'],
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'integer' } },
  },
  querystring: {
    type: 'object',
    properties: {
      sort: { type: 'string', enum: ['name', 'price'] },
      ...paginationQuery,
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
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
        pagination: paginationSchema,
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
      ...paginationQuery,
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              maskCount: { type: 'integer' },
            },
          },
        },
        pagination: paginationSchema,
      },
    },
    400: errorSchema,
  },
}

export const upsertMasksSchema = {
  description: 'Batch upsert masks for a pharmacy (requires auth)',
  tags: ['pharmacies'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'integer' } },
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
    401: errorSchema,
    404: errorSchema,
  },
}
