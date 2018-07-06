import { OAuth2Client } from 'google-auth-library'

const clientId = 'mazer-5422b'
const client = new OAuth2Client(clientId)

export default async idToken => {
  console.log('idToken:', idToken)
  const ticket = await client.verifyIdToken({
    idToken: idToken,
    audience: clientId,
  })

  return ticket.payload.sub
}
