export default (req, res) => {
  const {
    query: { name },
  } = req
  console.log(name)
  res.end()
}
