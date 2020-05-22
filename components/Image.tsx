import Imgix from 'react-imgix'
import useIntersectionObserver from '../hooks/useIntersectionObserver'
import React from 'react'
import styles from './Image.module.css'

const { useLayoutEffect, useState } = React

const Image = ({ src }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [onScreen, setOnScreen] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(true)
  const [ref, entry] = useIntersectionObserver({
    rootMargin: '24px',
    threshold: [0, 0.5, 1],
  })
  const baseUrl = isHovered ? 'de-gifs.netlify.com' : 'de-gif-netlify.imgix.net'
  const source = `https://${baseUrl}${src}`

  const isGif = src.match('gif$')

  useLayoutEffect(() => {
    if (entry?.intersectionRatio > 0.5) {
      setOnScreen(true)
    } else {
      setOnScreen(false)
    }
  }, [entry])

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
        htmlAttributes={{
          alt: src.split('.')[0],
          ref,
          loading: 'lazy',
          onLoad,
          src: !onScreen && `${source}?blur=200&px=20&auto=format`
        }}
        src={source}
        width={150}
        sizes={'25vw'}
      />
    </a>
  )
}

export default Image
