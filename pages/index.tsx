import NetlifyAPI from 'netlify'
import { GetStaticProps } from 'next'
import Head from 'next/head'
import React, { useEffect, useState } from 'react'
import ImagePreview from '../components/ImagePreview'
import ImagePreviewContext from '../components/ImagePreviewContext'

const netlify = new NetlifyAPI(process.env.NETLIFY_AUTH_TOKEN)

interface Image {
  id: string
  size: number
}

interface ExtraFields {
  [key: string]: unknown
}

type LooseImage = Image & ExtraFields

const Home = ({ images = [] }) => {
  const [filter, setFilter] = useState('')
  const [filteredImages, setFilteredImages] = useState(images)
  const [previewImageId, setPreviewImageId] = useState<string>()

  const filterImages = (val: string) => {
    setFilteredImages(
      images.filter((image) => image.id.match(val.toLowerCase()))
    )
  }

  useEffect(() => {
    if (filter) {
      filterImages(filter)
    } else {
      setFilteredImages(images)
    }
  }, [filter])

  function handleMouseOver(id) {
    setPreviewImageId(id)
  }

  return (
    <ImagePreviewContext.Provider value={[previewImageId, setPreviewImageId]}>
      <Head>
        <title>Daniel Eden's GIF trove</title>
        <meta
          name="description"
          content="The GIF/reactions image library of Daniel Eden, a designer living and working in London, England"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
      </Head>
      <input
        aria-label="Search"
        autoCorrect={'none'}
        id="search"
        autoFocus={true}
        onInput={(e) => setFilter(e.currentTarget.value)}
        placeholder={'Search'}
        type="search"
      />
      <ul>
        {filteredImages.map((image) => (
          <li
            key={image.id}
            onTouchStart={() => handleMouseOver(image.id)}
            onMouseOver={() => handleMouseOver(image.id)}
            onMouseOut={() => handleMouseOver(null)}
          >
            <a href={`${image.id}`}>{image.id}</a> (
            {Math.round(image.size / 1000)}kb)
          </li>
        ))}
      </ul>
      <ImagePreview />
      <style jsx>{`
        input {
          appearance: none;
          border-radius: 0.35em;
          box-shadow: 0 8px 12px rgba(0, 0, 0, 0.1);
          border: 2px solid rgba(128, 128, 128, 0.5);
          background-clip: padding-box;
          background-color: rgba(128, 128, 128, 0.15);
          backdrop-filter: blur(10px);
          width: 100%;
          font: inherit;
          padding: 0.25rem;
          display: block;
          line-height: 2;

          position: sticky;
          top: 1rem;
          z-index: 1;
        }

        input:focus {
          outline: none;
          border-color: royalblue;
        }

        ul {
          padding: 0;
        }

        li {
          padding: 0.5em;
          border-radius: 0.5em;
          list-style-type: none;
        }

        li:hover {
          background-color: rgba(128, 128, 128, 0.1);
        }
      `}</style>
      <style jsx global>{`
        * {
          box-sizing: border-box;
          position: relative;
        }

        a {
          color: royalblue;
        }

        :root {
          --background: #fefefe;
          --foreground: #111;
        }

        html {
          font: 100%/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
            Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          background-color: var(--background);
          color: var(--foreground);
        }

        @media (prefers-color-scheme: dark) {
          :root {
            --foreground #fff;
            --background: #000;
          }
        }

        body {
          max-width: 35rem;
        }
      `}</style>
    </ImagePreviewContext.Provider>
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
