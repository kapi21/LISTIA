import { onRequest } from 'firebase-functions/v2/https'
import { config } from './config'
import {
  exchangeCodeAndSaveConnection,
  getGmailAuthUrl,
  isValidPin,
} from './oauth'

const corsOrigins = [config.pwaOrigin]

export const gmailStart = onRequest({ cors: corsOrigins }, async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed')
    return
  }

  const pin = typeof req.query.pin === 'string' ? req.query.pin : undefined
  if (!pin || !isValidPin(pin)) {
    res.status(400).send('Invalid PIN')
    return
  }

  try {
    res.redirect(getGmailAuthUrl(pin))
  } catch (error) {
    console.error('gmailStart failed', error)
    res.status(500).send('OAuth configuration error')
  }
})

export const gmailCallback = onRequest({ cors: corsOrigins }, async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed')
    return
  }

  const code = typeof req.query.code === 'string' ? req.query.code : undefined
  const state = typeof req.query.state === 'string' ? req.query.state : undefined
  const oauthError =
    typeof req.query.error === 'string' ? req.query.error : undefined

  if (oauthError) {
    console.warn('gmailCallback OAuth error', oauthError)
    res.redirect(`${config.pwaOrigin}/?purchases=1&error=oauth_denied`)
    return
  }

  if (!code || !state) {
    res.status(400).send('Missing code or state')
    return
  }

  try {
    await exchangeCodeAndSaveConnection(code, state)
    res.redirect(`${config.pwaOrigin}/?purchases=1`)
  } catch (error) {
    console.error('gmailCallback failed', error)
    res.redirect(`${config.pwaOrigin}/?purchases=1&error=oauth_failed`)
  }
})
