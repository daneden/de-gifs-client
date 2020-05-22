import NetlifyAPI from 'netlify'
import { GetStaticProps } from 'next'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import React from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeGrid as Grid } from 'react-window'
import useDebounce from '../hooks/useDebounce'
import styles from './index.module.css'

require('dotenv').config()

interface Image {
  id: string
  size: number
}

interface Extra {
  [key: string]: unknown
}

type LooseImage = Image & Extra

const netlify = new NetlifyAPI(process.env.NETLIFY_AUTH_TOKEN)
const { useEffect, useState } = React
const Image = dynamic(() => import('../components/Image'), { ssr: false })

const Home = ({ images = [] }) => {
  const [filter, setFilter] = useState('')
  const [filteredImages, setFilteredImages] = useState(images)

  const filterImages = (val: string) => {
    setFilteredImages(
      images.filter((image) => image.id.match(val.toLowerCase()))
    )
  }

  const debouncedFilter = useDebounce(filter, 500)

  const colWidth = 200
  const rowHeight = 200

  const getColumnCount = (width, target) => {
    return Math.floor(width / target)
  }

  const getRowCount = (width, target) => {
    return Math.ceil(width / target)
  }

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
        <title>Daniel Eden's GIF trove</title>
        <meta
          name="description"
          content="The GIF/reactions image library of Daniel Eden, a designer living and working in London, England"
        />
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

        :root {
          --defaultInputShadow: 0 8px 24px rgba(0, 0, 0, 0.75),
            0 0 1px 1px rgba(0, 0, 0, 0.1),
            inset 0 0 0 1px rgba(255, 255, 255, 0.1);
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
        aria-label="Search"
        id="search"
        autoFocus={true}
        className={styles.searchBox}
        onInput={(e) => setFilter(e.currentTarget.value)}
        placeholder={'Search'}
      />
      <AutoSizer>
        {({ height, width }) => (
          <Grid
            height={height}
            width={width}
            itemCount={filteredImages.length}
            columnWidth={colWidth}
            columnCount={getColumnCount(width, colWidth)}
            rowHeight={rowHeight}
            rowCount={getRowCount(height, colWidth)}
          >
            {filteredImages.map((image) => (
              <Image key={image.id} src={image.id} />
            ))}
          </Grid>
        )}
      </AutoSizer>
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
      files.filter((file) => {
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
