import React from 'react'
import Imgix from 'react-imgix'
import useIntersectionObserver from '../hooks/useIntersectionObserver'
import styles from './Image.css'

const { useEffect, useState } = React

const Image = ({ src }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [onScreen, setOnScreen] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(true)
  const [ref, entry] = useIntersectionObserver({
    rootMargin: '24px',
    threshold: [0, 1],
  })
  const baseUrl = isHovered ? 'de-gifs.netlify.com' : 'de-gif-netlify.imgix.net'
  const source = `https://${baseUrl}${src}`

  const isGif = src.match('gif$')

  useEffect(() => {
    if (entry?.intersectionRatio > 0) {
      setOnScreen(true)
    } else {
      setOnScreen(false)
    }
  }, [entry])

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
        height={onScreen ? 150 : 15}
        imgixParams={{
          auto: isHovered ? 'format' : 'compress',
          format: isHovered ? 'auto' : 'jpg',
        }}
        htmlAttributes={{
          ref,
          loading: 'lazy',
          onLoad,
        }}
        src={source}
        width={onScreen ? 150 : 15}
        sizes={'25vw'}
      />
    </a>
  )
}

export default Image
