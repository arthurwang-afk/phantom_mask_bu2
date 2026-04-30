import { FastifyInstance } from 'fastify'
import { findUserByName } from '../repositories/userRepository.js'
import { NotFoundError } from '../errors.js'

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { name: string } }>(
    '/token',
    {
      schema: {
        description: 'Get a JWT token by user name',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['name'],
          properties: { name: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: { token: { type: 'string' } },
          },
        },
      },
    },
    async (request) => {
      const user = await findUserByName(request.body.name)
      if (!user) throw new NotFoundError(`User "${request.body.name}" not found`)
      const token = app.jwt.sign({ userId: user.id, name: user.name })
      return { token }
    },
  )
}
