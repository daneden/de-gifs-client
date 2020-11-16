module.exports = {
  images: {
    domains: ['de-gifs.netlify.com'],
  },
  webpack: (config) => {
    config.node = {
      fs: 'empty',
    }

    return config
  },
}
