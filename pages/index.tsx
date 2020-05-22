import Head from 'next/head'
import { GetStaticProps } from 'next'
import React from 'react'
import Image from '../components/Image'
import useDebounce from '../hooks/useDebounce'
import styles from './index.css'
import NetlifyAPI from 'netlify'

require('dotenv').config()

interface Image {
    id: string,
    size: number
}

interface Extra {
    [key: string]: unknown
}

type LooseImage = Image & Extra

const netlify = new NetlifyAPI(process.env.NETLIFY_AUTH_TOKEN)

const { useEffect, useState } = React

const Home = ({ images = [] }) => {
  const [filter, setFilter] = useState('')
  const [filteredImages, setFilteredImages] = useState(images)

  const filterImages = (val: string) => {
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

        #__next {
          display: flex;
          flex-direction: column;
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

export const getStaticProps: GetStaticProps = async () => {
  const images = await netlify
    .listSiteFiles({
      site_id: process.env.NETLIFY_SITE_ID,
    })
    .then((data: LooseImage[]) => {
      return data.map(({ id, size }) => {
        return {
          id,
          size,
        }
      })
    })
    .then((files: Image[]) =>
      files.filter(file => {
        return /\.(jpe?g|png|gif)$/.test(file.id)
      })
    )
    .then((files: Image[]) => {
      return files.sort((a, b) => {
        return a.id.localeCompare(b.id)
      })
    })
    .catch((err: Error) => console.error(err))
  return { props: { images }, unstable_revalidate: 1 }
}

export default Home
