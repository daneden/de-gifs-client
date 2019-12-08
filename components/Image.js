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
    <a
      className={[styles.root, isGif && styles.isGif].join(' ')}
      href={src}
      onBlur={onMouseOut}
      onFocus={onMouseOver}
      onMouseOut={onMouseOut}
      onMouseOver={onMouseOver}
    >
      <Imgix
        className={[styles.image, !hasLoaded && styles.isLoading].join(' ')}
        height={150}
        imgixParams={{
          auto: isHovered ? 'format' : 'compress',
          format: isHovered ? 'auto' : 'jpg',
        }}
        htmlAttributes={{
          loading: 'lazy',
          onLoad,
        }}
        src={source}
        width={150}
        sizes={'25vw'}
      />
    </a>
  )
}

export default Image
