/**
 * SigV4 verification (AWS doc example inputs + independent Python check):
 *   npx tsx --import ./scripts/preload.mjs scripts/test-sigv4.mts
 *
 * Inputs: AWS sigv4-query-string-auth example — GET
 * examplebucket.s3.amazonaws.com/test.txt, 20130524T000000Z, 86400s.
 * Expected signature cross-verified with an independent Python
 * hashlib/hmac computation (same inputs -> same output).
 */
import { signQuery } from '../src/lib/storage/s3-sign'

const sig = signQuery({
  method: 'GET',
  host: 'examplebucket.s3.amazonaws.com',
  uri: '/test.txt',
  params: {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': 'AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request',
    'X-Amz-Date': '20130524T000000Z',
    'X-Amz-Expires': '86400',
    'X-Amz-SignedHeaders': 'host',
  },
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  shortDate: '20130524',
  longDate: '20130524T000000Z',
  region: 'us-east-1',
})

const expected = 'aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404'
if (sig === expected) {
  console.log('PASS sigv4 matches AWS published vector')
} else {
  console.error(`FAIL sigv4 mismatch:\n got ${sig}\nwant ${expected}`)
  process.exit(1)
}
