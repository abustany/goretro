import * as Mood from './mood'

export interface Note {
  id: number
  mood: Mood.Mood
  content: string
  authorId: number
}
