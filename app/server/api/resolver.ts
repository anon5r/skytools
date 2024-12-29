import { defineEventHandler, getQuery } from 'h3'
import type { QueryObject } from 'ufo'
import { DidResolver, HandleResolver } from '@atproto/identity'
import { getHandle } from '@atproto/common-web'
import Protocol from 'wrangler'
import integer = Protocol.integer
import { DidDocument } from '@atproto/identity/src/types'

export default defineEventHandler(async event => {
  const query: QueryObject = getQuery(event)
  const actor: string = query.actor as string

  console.log('Received request with actor:', actor)

  if (!actor) {
    console.log('No actor provided')
    return {
      status: 400,
      body: { error: 'No `actor` provided' },
    }
  }

  try {
    let result: { error?: string; did?: string; handle?: string } = {
      error: 'No DID or handle found',
    }

    const timeout = (
      promise: Promise<DidDocument | string | null | undefined>,
      ms: number
    ) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Promise timed out after ' + ms + ' ms'))
        }, ms as number)
        promise
          .then(value => {
            clearTimeout(timer)
            resolve(value)
          })
          .catch(err => {
            clearTimeout(timer)
            reject(err)
          })
      })
    }

    if (actor.startsWith('did:')) {
      console.log('Resolving DID:', actor)
      const resolver = new DidResolver({})
      const handle = (await timeout(
        resolver.resolve(actor),
        5000
      )) as DidDocument
      if (handle) {
        result = { did: actor, handle: getHandle(handle) }
        console.log('Resolved handle:', result.handle)
      }
    } else {
      console.log('Resolving handle:', actor)
      const resolver = new HandleResolver({})
      const did = (await timeout(resolver.resolve(actor), 5000)) as string
      if (did) {
        result = { did: did, handle: actor }
        console.log('Resolved DID:', result.did)
      }
    }

    if (result.did) {
      console.log('Returning success response:', result)
      return {
        status: 200,
        body: result,
      }
    } else {
      console.log('Returning not found response:', result)
      return {
        status: 404,
        body: result,
      }
    }
  } catch (error: Error | any) {
    console.error('Error occurred:', error)
    return {
      status: 500,
      body: { error: error.message },
    }
  }
})
