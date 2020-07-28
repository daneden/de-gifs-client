import NetlifyAPI from 'netlify'
import { GetStaticProps } from 'next'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import React from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { areEqual, FixedSizeGrid as Grid } from 'react-window'
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

  const colWidth = 187
  const rowHeight = colWidth

  const getColumnCount = (width, target) => {
    return Math.floor(width / target)
  }

  const getRowCount = (columnCount) => {
    return Math.ceil(filteredImages.length / columnCount)
  }

  const Cell = React.memo<{
    columnIndex: number
    rowIndex: number
    style: any
    data: any
  }>(({ columnIndex, rowIndex, style, data }) => {
    const index = rowIndex * data.columnCount + columnIndex
    const image = filteredImages[index]?.id

    return image ? (
      <div style={style}>
        <Image src={image} />
      </div>
    ) : null
  }, areEqual)

  useEffect(() => {
    if (filter) {
      filterImages(filter)
    } else {
      setFilteredImages(images)
    }
  }, [filter])

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
          min-height: 100vh;
        }

        #__next {
          height: 100vh;
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
            itemData={{ columnCount: getColumnCount(width, colWidth) }}
            columnWidth={colWidth}
            columnCount={getColumnCount(width, colWidth)}
            rowHeight={rowHeight}
            rowCount={getRowCount(getColumnCount(width, colWidth))}
          >
            {Cell}
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
  return { props: { images }, revalidate: 1 }
}

export default Home
