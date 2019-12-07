import fetch from 'isomorphic-fetch'
import React from 'react'

const Home = ({ images }) => <div>{images.map(image => image.id)}</div>

Home.getInitialProps = async ctx => {
  const { process, req } = ctx
  const origin =
    process && process.browser
      ? window.location.origin
      : `${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host']}`
  const r = await fetch(`${origin}/api/imageList`)
  return { images: await r.json() }
}

export default Home
