import Imgix from 'react-imgix'
import useIntersectionObserver from '../hooks/useIntersectionObserver'
import React from 'react'
import styles from './Image.module.css'
import 'lazysizes'
import 'lazysizes/plugins/attrchange/ls.attrchange'

const { useState } = React

const Image = ({ src }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(true)
  const baseUrl = isHovered ? 'de-gifs.netlify.com' : 'de-gif-netlify.imgix.net'
  const source = `https://${baseUrl}${src}`

  const isGif = src.match('gif$')

  function onMouseOver() {
    setIsHovered(true)
    setHasLoaded(false)
  }

  function onMouseOut() {
    setIsHovered(false)
  }

  function onLoad() {
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
        attributeConfig={{
          src: "data-src",
          srcSet: "data-srcset",
          sizes: "data-sizes",
        }}
        htmlAttributes={{
          alt: src.split('.')[0],
          loading: 'lazy',
          onLoad,
          src: `${source}?blur=200&px=16&auto=format`
        }}
        src={source}
        width={150}
        sizes={'25vw'}
      />
    </a>
  )
}

export default Image
