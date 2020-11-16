import React, { useContext } from 'react'
import ImagePreviewContext from './ImagePreviewContext'
import Image from 'next/image'

export default function ImagePreview() {
  const [imageId] = useContext(ImagePreviewContext)
  return (
    <>
      <div>
        {imageId ? (
          <Image
            layout="fill"
            src={`https://de-gifs.netlify.com${imageId}`}
            sizes="25vmin"
          />
        ) : (
          'Hover over an image to preview'
        )}
      </div>
      <style jsx>{`
        div {
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          width: 25vmin;
          height: 25vmin;
          border-radius: 8px;
          background-color: rgba(128, 128, 128, 0.2);
          box-shadow: 0 8px 12px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          overflow: hidden;
          display: grid;
          align-items: center;
          text-align: center;
          color: rgba(0, 0, 0, 0.5);
        }

        div :global(img) {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      `}</style>
    </>
  )
}
