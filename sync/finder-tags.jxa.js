// Prints {filename: [tag, …]} for every tagged file in a directory. Uses
// NSURLTagNamesKey so Finder's binary-plist xattr format and colour suffixes
// stay Apple's problem, and no file content is read (online-only files stay
// online-only).
ObjC.import('Foundation')

function run(argv) {
  const dir = argv[0]
  const names = ObjC.deepUnwrap(
    $.NSFileManager.defaultManager.contentsOfDirectoryAtPathError(dir, null)
  )
  const out = {}
  for (const name of names || []) {
    const url = $.NSURL.fileURLWithPath(dir + '/' + name)
    const ref = Ref()
    url.getResourceValueForKeyError(ref, $.NSURLTagNamesKey, null)
    const tags = ObjC.deepUnwrap(ref[0])
    if (tags && tags.length) out[name] = tags
  }
  return JSON.stringify(out)
}
