import qrcode from 'qrcode'

import { COMMUNITY_QQ_URL } from './community-links.mjs'

export function createCommunityQrImage() {
  return qrcode.toDataURL(COMMUNITY_QQ_URL, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: { dark: '#06151d', light: '#ffffff' },
  })
}
