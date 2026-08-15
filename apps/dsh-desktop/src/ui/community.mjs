import { COMMUNITY_QQ_URL, GITHUB_FEEDBACK_URL } from '../community-links.mjs'

const query = new URLSearchParams(window.location.search)
const qrImage = query.get('qr')
const qr = document.querySelector('#community-qr')
const status = document.querySelector('#qr-status')

document.querySelector('#join-community').href = COMMUNITY_QQ_URL
document.querySelector('#open-feedback').href = GITHUB_FEEDBACK_URL

if (qrImage?.startsWith('data:image/png;base64,')) {
  qr.src = qrImage
  qr.hidden = false
  status.hidden = true
} else {
  status.textContent = '二维码暂时不可用，请使用一键加群'
}
