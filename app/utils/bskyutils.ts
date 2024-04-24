import axios, { type AxiosResponse } from 'axios'
import { isDev } from '@/utils/helpers'
import {
  AppBskyActorProfile,
  type AppBskyFeedPost,
  AtpAgent,
  AtUri,
  ComAtprotoRepoDescribeRepo,
  type ComAtprotoRepoGetRecord,
  type ComAtprotoRepoListRecords,
  ComAtprotoServerDescribeServer,
} from '@atproto/api'
import type { BlobRef } from '@atproto/lexicon'

const plcURL = 'https://plc.directory'
let atp: AtpAgent | null = null

let config = {
  defaultPDS: 'bsky.social' as string,
  defaultSuffix: 'bsky.social' as string,
  defaultPDSEntrypoint: 'https://bsky.social' as string,
  bskyAppURL: 'https://bsky.app' as string,
  webmasterDid: 'did:bsky:webmaster' as string,
}

export const setConfig = (newConfig: typeof config) => {
  config = { ...config, ...newConfig }
  atp = new AtpAgent({ service: config.defaultPDSEntrypoint })
}

export const getConfig = (): {
  defaultPDS: string
  defaultSuffix: string
  defaultPDSEntrypoint: string
  bskyAppURL: string
  webmasterDid: string
} => {
  return config
}

export const createAtpAgent = (service?: string): AtpAgent => {
  service = service || config.defaultPDSEntrypoint
  if (!service && !atp) {
    atp = new AtpAgent({ service: config.defaultPDSEntrypoint })
    return atp
  }
  return new AtpAgent({ service: service })
}

/**
 *
 */
export const formatIdentifier = (id: string) => {
  if (id.length > 0) {
    id = id.startsWith('at://') ? id.substring(5) : id
    if (!id.startsWith('did:')) id = id.startsWith('@') ? id.substring(1) : id
    if (!id.startsWith('did:') && !id.includes('.')) {
      id += `.${config.defaultSuffix}` // default xxx -> xxx.bsky.social
    }
  }
  return id
}

/**
 * Convert DID to at-proto-uri or handle to DID
 * @param {string} identifier DID
 * @param {boolean} onlyHandle Return only handle
 * @returns {string} Handle
 * @throws {Error} Invalid DID
 */
export const resolveDID = async (
  identifier: string,
  onlyHandle: boolean = true
): Promise<string> => {
  try {
    let requestUrl
    if (identifier.startsWith('did:')) requestUrl = `${plcURL}/${identifier}`
    else
      requestUrl = `${config.defaultPDSEntrypoint}/xrpc/com.atproto.identity.resolveHandle?handle=${identifier}`

    const res = await axios.get(requestUrl)

    if (res.data?.did) {
      return res.data.did.trim() as string
    } else if (res.data?.alsoKnownAs) {
      const handle = res.data.alsoKnownAs[0]
      return onlyHandle
        ? formatIdentifier(handle).trim()
        : (handle.trim() as string)
    }
    throw new Error(`Invalid DID: '${identifier}'`)
  } catch (error: any) {
    if (isDev()) {
      console.error('[BskyUtils] resolveDID::response.Error')
      console.error(error)
    }
    throw error
  }
}

/**
 *
 * @param {string} identifier Handle
 * @returns {string} DID
 * @throws {Error} Invalid handle
 */
export const resolveHandle = async (identifier: string): Promise<string> => {
  if (identifier.startsWith('did:'))
    throw new Error('Invalid handle. Should be a handle, not a DID')
  if (identifier.length > 253) throw new Error('Too long identifier')

  try {
    const url = `${config.defaultPDSEntrypoint}/xrpc/com.atproto.identity.resolveHandle?handle=${identifier}`
    let res = await axios.get(url)
    if (res.status === 200 && res.data?.did) return res.data.did as string
  } catch (error: any) {
    if (isDev()) {
      console.error('[BskyUtils] resolveHandle::response.Error')
      console.error(error)
    }
  }

  try {
    const url = `https://${identifier}/.well-known/atproto-did`
    let res = await axios.get(url)
    if (res.status === 200) return res.data as string
  } catch (err) {
    if (isDev()) {
      console.error('[BskyUtils] resolveHandle::response.Error = ')
      console.error(err)
    }
  }
  try {
    // DNS resolve
    const query = (new URLSearchParams({ handle: identifier })).toString()
    const url = `/api/resolve-handle?${query}`
    const res = await axios.get(url)
    if (res.status === 200) {
      if (res.data.error === undefined && res.data.did.length > 0)
        return res.data.did[0]
    }

    throw new Error('Failed to resolve handle')
  } catch (err: any) {
    if (isDev()) {
      console.error('[BskyUtils] resolveHandle::response.Error = ')
      console.error(err)
    }
    throw err
  }
}
/**
 * Get PDS by DID
 * @param {string} identifier
 * @returns {Promise<string>} PDS endpoint
 * @throws {Error} Failed to get PDS endpoint
 */
export const getPDSEndpointByDID = async (
  identifier: string
): Promise<string> => {
  const url = `${plcURL}/${identifier}`
  try {
    const res = await axios.get(url)

    if (res.data) {
      for (const service of res.data.service) {
        if (service.type === 'AtprotoPersonalDataServer') {
          return service.serviceEndpoint
        }
      }
    }
    throw new Error('Failed to get PDS endpoint')
  } catch (err: any) {
    if (isDev()) {
      console.error(`[BskyUtils] getPDSEndpointByDID::response.Error`)
    }
    console.warn(err)
    throw err
  }
}

/**
 *
 * @param {string} identifier
 * @returns {Object} Audit logs
 * @throws {Error} Invalid handle
 */
export const getIdentityAuditLogs = async (
  identifier: string
): Promise<any> => {
  const url = `${plcURL}/${identifier}/log/audit`
  try {
    const res: AxiosResponse<Object, any> = await axios.get(url)

    if (res.data) return res.data as Object
    throw new Error('Failed to resolve handle')
  } catch (err: any) {
    if (isDev()) {
      console.error('[BskyUtils] getIdentityAuditLogs::response.Error')
    }
    console.warn(err)
    throw err
  }
}

/**
 * Parsing at-proto-uri
 * @param {string} uri at://did:plc:xxxxxxxxxxxxx/app.bsky.feed.post/abbcde12345
 * @return {object<string, string>} {did: did:plc:xxxxxxxxxxxxx, collection: app.bsky.feed.post, key: abbcde12345}
 * @throws {Error} Invalid URI format
 */
export const parseAtUri = (uri: string): { [key: string]: string } => {
  const aturi = new AtUri(uri)
  return {
    did: aturi.host,
    collection: aturi.collection,
    rkey: aturi.rkey,
  }
}

/**
 * Parsing DID
 * @param {string} did did:plc:xxxxxxxxxxxxxx, did:web:xxxxxxxxxxxxxx
 * @return {object} {method: plc, identifier: xxxxxxxxxxxxxx}
 */
export const parseDID = (did: string): { [key: string]: string } => {
  const m = did.match(/^did:(?<method>\w+):(?<identifier>[a-z0-9:%-]+)$/)
  if (m && m.groups) return m.groups

  throw new Error('Invalid URI format')
}

/**
 * Fetch posts
 * @return ComAtprotoRepoGetRecord.Response
 * @param {string} repoEndpoint
 * @param {string} collection
 * @param {string} repo
 * @param {string} recordKey
 * @return Promise<ComAtProtoRepoGetRecord.Response|any>
 */
export const getRecord = async (
  repoEndpoint: string,
  collection: string,
  repo: string,
  recordKey: string
): Promise<ComAtprotoRepoGetRecord.Response | any> => {
  try {
    const response: ComAtprotoRepoGetRecord.Response = await createAtpAgent(
      repoEndpoint
    ).api.com.atproto.repo.getRecord({
      repo: repo,
      collection: collection,
      rkey: recordKey,
    })

    if (response.data) {
      return response
    }
    throw new Error('Record not found')
  } catch (err: any) {
    if (isDev()) {
      console.error('[BskyUtils] getRecord::response.Error')
    }
    console.warn(err)
    throw new Error(err.message, err)
  }
}

/**
 * Get records as list
 * @param {string} repoEndpoint
 * @param {string} collection
 * @param {string} identifier
 * @param {int} limit
 * @param {string|undefined} cursor
 * @return {ComAtprotoRepoListRecords.Response} list of records
 */
export const listRecords = async (
  repoEndpoint: string,
  collection: string,
  identifier: string,
  limit: number = 50,
  cursor: string | undefined = undefined
): Promise<ComAtprotoRepoListRecords.Response> => {
  try {
    const response = await createAtpAgent(
      repoEndpoint
    ).api.com.atproto.repo.listRecords({
      collection: collection,
      repo: identifier,
      limit: limit,
      cursor: cursor,
    })

    if (response) return response
    throw new Error('Record not found')
  } catch (err: any) {
    if (isDev()) console.warn(err)
    throw new Error(err.message, err)
  }
}

/**
 * Get blob by sync
 * @param {string} did
 * @param {string} cid
 * @returns
 */
export const getBlob = async (did: string, cid: string): Promise<string> => {
  try {
    const response = await createAtpAgent().com.atproto.sync.getBlob({
      did: did,
      cid: cid,
    })
    if (response.data) {
      const blobObject = new Blob([response.data], {
        type: response.headers['Content-Type'] as string,
      })
      return URL.createObjectURL(blobObject)
    }
    return ''
  } catch (err: any) {
    if (isDev()) console.warn(err)
    throw new Error(err.message, err)
  }
}

/**
 * Get individual post
 * @param {string} endpoint
 * @param {string} identity
 * @param {string} recordKey
 * @return {Promise<AppBskyFeedPost.Record>}
 */
export const getPost = async (
  endpoint: string,
  identity: string,
  recordKey: string
): Promise<AppBskyFeedPost.Record> => {
  try {
    const res = await getRecord(
      endpoint,
      'app.bsky.feed.post',
      identity,
      recordKey
    )
    if (res.success) return res.data.value as AppBskyFeedPost.Record
    throw new Error('Failed to get post')
  } catch (err: any) {
    if (isDev()) console.warn(err)
    throw err
  }
}

/**
 * Get identifier details
 * @param {string} id handle or DID
 * @return {Promise<ComAtprotoRepoDescribeRepo.OutputSchema>}
 */
export const describeRepo = async (id: string): Promise<any> => {
  try {
    const response: ComAtprotoRepoDescribeRepo.Response =
      await createAtpAgent().api.com.atproto.repo.describeRepo({
        repo: id,
      })

    if (response.data) {
      return response.data as ComAtprotoRepoDescribeRepo.OutputSchema
    }
    throw new Error('Failed to get details')
  } catch (err) {
    if (isDev()) {
      console.error('[BskyUtils] describeRepo::response.Error')
    }
    console.warn(err)
    throw err
  }
}

/**
 * Get account profile
 * @param {string} endpoint
 * @param {string} id
 * @return AppBskyActorProfile.Record
 */
export const loadProfile = async (
  endpoint: string,
  id: string
): Promise<AppBskyActorProfile.Record> => {
  const profile = await getRecord(
    endpoint,
    'app.bsky.actor.profile',
    id,
    'self'
  )
  return profile.data.value as AppBskyActorProfile.Record
}

/**
 * Build blob image URL with com.atproto.sync.getBlob
 * @param {string} cdnURL https://av-cdn.bsky.social
 * @param {string} did DID
 * @param {AppBskyActorProfile.Record} record ProfileRecord object
 * @param {string} itemName "avatar" | "banner"
 * @param {string | undefined} PDS endpoint URL
 * @returns {string}
 * @throws {Error} Invalid profile record
 */
export const buildBlobRefURL = (
  cdnURL: string,
  did: string,
  record: AppBskyActorProfile.Record,
  itemName: string,
  endpoint?: string | undefined
): string => {
  if (!AppBskyActorProfile.isRecord(record)) {
    console.info(did, itemName, endpoint)
    console.dir(record)
    throw new Error(`Invalid profile record: ${did}`)
  }
  if (record[itemName] === undefined) {
    console.warn(`Not found blob field "${itemName}" in profile : ${did}`)
    return ''
  }
  if (endpoint !== undefined && endpoint.startsWith('http')) {
    endpoint = endpoint.substring(endpoint.indexOf('://') + 3)
  }
  const itemRef = (record[itemName] as BlobRef).ref
  return `${cdnURL}/${endpoint ?? config.defaultPDS}/image/${did}/${itemRef}`
}

/**
 * Build posts URL for App
 * @param {string} urlPrefix App URL prefix
 * @param {string} uri At Uri
 * @param {string | undefined} handle Handle
 * @returns {string}
 */
export const buildPostURL = async (
  urlPrefix: string,
  uri: string | { [key: string]: string },
  handle?: string
): Promise<string> => {
  let atUri
  if (typeof uri === 'string' && uri.startsWith('at://'))
    atUri = parseAtUri(uri)
  else atUri = uri as { [key: string]: string }
  console.log('uri = ', uri)
  console.log('atUri = ', atUri)

  if (handle === undefined) {
    try {
      if (isDev()) console.log(atUri)
      handle = await resolveDID(atUri.did, false)
    } catch (er) {
      handle = atUri.did
    }
  }
  return `${urlPrefix}/profile/${handle}/post/${atUri.rkey}`
}

export const describeServer = async (
  server: string
): Promise<ComAtprotoServerDescribeServer.OutputSchema> => {
  try {
    const response: ComAtprotoServerDescribeServer.Response =
      await createAtpAgent(server).api.com.atproto.server.describeServer()
    console.log(response)
    if (response.success) {
      return response.data
    }
    throw new Error('Failed to get details for ' + server)
  } catch (err) {
    if (isDev()) {
      console.error('[BskyUtils] describeServer::response.Error')
    }
    console.warn(err)
    throw err
  }
}

export default {
  isDev,
  getConfig,
  formatIdentifier,
  resolveDID,
  resolveHandle,
  getIdentityAuditLogs,
  parseDID,
  parseAtUri,
  getPost,
  getBlob,
  listRecords,
  getRecord,
  buildBlobRefURL,
  loadProfile,
  describeRepo,
  describeServer,
  buildPostURL,
  getPDSEndpointByDID,
}
