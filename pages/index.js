import fetch from 'isomorphic-fetch'
import Head from 'next/head'
import React from 'react'
import Image from '../components/Image'
import styles from './index.css'

const Home = ({ images }) => {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
      </Head>
      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          position: relative;
        }

        body {
          background: #101010;
          color: #fff;
          font: 100%/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
            Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
      `}</style>
      <div className={styles.imageRoot}>
        {images.map(image => (
          <Image key={image.id} src={image.id} />
        ))}
      </div>
    </>
  )
}

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
