import { COMMUNITY_QQ_URL } from './community-links.mjs'
import { renderQrDataUrl } from './optional-integrations.mjs'

export function createCommunityQrImage() {
  return renderQrDataUrl(COMMUNITY_QQ_URL, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: { dark: '#06151d', light: '#ffffff' },
  })
}
