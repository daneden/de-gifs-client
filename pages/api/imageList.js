import NetlifyAPI from 'netlify'

require('dotenv').config()

const netlify = new NetlifyAPI(process.env.NETLIFY_AUTH_TOKEN)

export default async (req, res) => {
  const files = await netlify
    .listSiteFiles({
      site_id: process.env.NETLIFY_SITE_ID,
    })
    .then(data => {
      return data.map(({ id, size, ...rest }) => {
        return {
          id,
          size,
        }
      })
    })
    .then(files => files.filter(file => file.id !== '_headers'))
    .then(files => {
      return files.sort((a, b) => {
        return a.id.localeCompare(b.id)
      })
    })
    .catch(err => console.error(err))

  res.json(files)
}
