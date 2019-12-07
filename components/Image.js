import React from 'react'
import Imgix from 'react-imgix'
import styles from './Image.css'

const { useState } = React

const Image = ({ src }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(true)
  const baseUrl = isHovered ? 'de-gifs.netlify.com' : 'de-gif-netlify.imgix.net'
  const source = `https://${baseUrl}${src}`

  const isGif = src.match('gif$')

  function onMouseOver(e) {
    setIsHovered(true)
    setHasLoaded(false)
  }

  function onMouseOut(e) {
    setIsHovered(false)
  }

  function onLoad(e) {
    setHasLoaded(true)
  }

  return (
    <a className={[styles.root, isGif && styles.isGif].join(' ')} href={src}>
      <Imgix
        className={styles.image}
        height={200}
        imgixParams={{
          auto: isHovered ? 'format' : 'compress',
          format: isHovered ? 'auto' : 'jpg',
        }}
        htmlAttributes={{
          loading: 'lazy',
          onLoad,
          onMouseOut,
          onMouseOver,
          style: {
            opacity: hasLoaded ? 1 : 0.75,
            transition: '.25s ease',
          },
        }}
        src={source}
        width={200}
      />
    </a>
  )
}

export default Image
