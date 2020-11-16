import { createContext, SetStateAction, Dispatch } from 'react'

type ImagePreviewContextValue = [string, Dispatch<SetStateAction<string>>]

const ImagePreviewContext = createContext<ImagePreviewContextValue>(null)

export default ImagePreviewContext
