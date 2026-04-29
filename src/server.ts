import 'dotenv/config'
import { buildApp } from './app.js'

const app = buildApp()
const port = parseInt(process.env.PORT ?? '3000', 10)

app.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})
