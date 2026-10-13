import { createGateway, embedMany, generateText, jsonSchema, Output } from 'ai'
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  type Caption,
} from '../lib/manifest'

const captionSchema = jsonSchema<Caption>({
  type: 'object',
  additionalProperties: false,
  required: ['caption', 'usage', 'text', 'tags'],
  properties: {
    caption: {
      type: 'string',
      description:
        'One plain sentence describing what happens. Name the show, film, game or character when the image or filename makes it clear.',
    },
    usage: {
      type: 'string',
      description:
        'The reaction or feeling someone sends this to express, phrased as a situation, e.g. "when a plan falls apart" or "smug satisfaction".',
    },
    text: {
      type: 'string',
      description: 'Any visible text or subtitles, verbatim. Empty string if none.',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description:
        '5–10 lowercase search terms: emotions, actions, subjects, and the source if known. Skip words that fit almost any reaction gif, like funny, meme, reaction, gif or humor.',
    },
  },
})

export function createEnricher(
  apiKey: string | undefined,
  captionModel: string,
  captionsPerMinute: number
) {
  const gateway = createGateway({ apiKey })
  const interval = 60_000 / captionsPerMinute
  let nextSlot = 0

  // Paces request starts instead of leaning on retries: the free Gateway tier
  // allows 5 requests a minute per model, and a 429 costs a 60 s back-off.
  async function throttle() {
    const wait = nextSlot - Date.now()
    nextSlot = Math.max(nextSlot, Date.now()) + interval
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  }

  async function caption(
    name: string,
    sheet: Buffer,
    frames: number
  ): Promise<Caption> {
    await throttle()
    const { output } = await generateText({
      model: gateway(captionModel),
      maxRetries: 4,
      output: Output.object({ schema: captionSchema }),
      system:
        'You catalogue a personal library of reaction GIFs and images so the owner can find the right one by searching for a feeling, a situation, or what happens in it.',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'file', mediaType: 'image/jpeg', data: sheet },
            {
              type: 'text',
              text: [
                `Filename: ${name}`,
                'The owner named the file, so it usually names the joke or the reaction.',
                frames > 1
                  ? `This is an animated GIF (${frames} frames). The image shows four frames in order: top left, top right, bottom left, bottom right.`
                  : 'This is a still image.',
              ].join('\n'),
            },
          ],
        },
      ],
    })
    return {
      ...output,
      tags: [...new Set(output.tags.map((tag) => tag.trim().toLowerCase()))],
    }
  }

  async function embed(values: string[]) {
    const { embeddings } = await embedMany({
      model: gateway.embeddingModel(EMBEDDING_MODEL),
      values,
      dimensions: EMBEDDING_DIMENSIONS,
      maxRetries: 4,
    })
    return embeddings
  }

  return { caption, embed }
}
