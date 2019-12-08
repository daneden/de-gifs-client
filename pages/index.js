import fetch from 'isomorphic-fetch'
import Head from 'next/head'
import React from 'react'
import Image from '../components/Image'
import useDebounce from '../hooks/useDebounce'
import styles from './index.css'

const { useEffect, useState } = React

const Home = ({ images }) => {
  const [filter, setFilter] = useState('')
  const [filteredImages, setFilteredImages] = useState(images)

  const filterImages = val => {
    setFilteredImages(images.filter(image => image.id.match(val.toLowerCase())))
  }

  const debouncedFilter = useDebounce(filter, 500)

  useEffect(() => {
    if (debouncedFilter) {
      filterImages(debouncedFilter)
    } else {
      setFilteredImages(images)
    }
  }, [debouncedFilter])

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
        <link
          href="https://fonts.googleapis.com/css?family=Archivo:400,700&display=swap"
          rel="stylesheet"
        />
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
          font: 100%/1.5 'Archivo', -apple-system, BlinkMacSystemFont,
            'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans',
            'Helvetica Neue', sans-serif;
        }
      `}</style>
      <input
        autoFocus={true}
        className={styles.searchBox}
        onInput={e => setFilter(e.currentTarget.value)}
        placeholder={'Search'}
      />
      <div className={styles.imageRoot}>
        {filteredImages.map(image => (
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
