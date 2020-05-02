export enum Key {
  Up = 1,
  Down = 2,
  Discuss = 3,
}
// const MoodIcons = {
//   [Mood.Up]: "👍",
//   [Mood.Down]: "👎",
//   [Mood.Discuss]: "🤔",
// }

export interface Mood {
  key: Key,
  icon: string
}

export const Up: Mood = {
  key: Key.Up,
  icon: "👍",
}

export const Down: Mood = {
  key: Key.Down,
  icon: "👎",
}

export const Discuss: Mood = {
  key: Key.Discuss,
  icon: "🤔",
}

export const Moods = {
  [Key.Up]: Up,
  [Key.Down]: Down,
  [Key.Discuss]: Discuss
}
