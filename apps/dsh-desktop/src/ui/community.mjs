import { COMMUNITY_QQ_URL, GITHUB_FEEDBACK_URL } from '../community-links.mjs'

const query = new URLSearchParams(window.location.search)
const theme = query.get('theme')
if (theme === 'dark' || theme === 'light') {
  document.documentElement.dataset.dshDesktopTheme = theme
}
document.querySelector('#join-community').href = COMMUNITY_QQ_URL
document.querySelector('#open-feedback').href = GITHUB_FEEDBACK_URL
