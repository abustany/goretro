export enum Key {
  Waiting = 1,
  Running = 2,
  Reviewing = 3,
}

export interface State {
  key: Key,
  name: string,
}

export const Waiting: State = {
  key: Key.Waiting,
  name: "Waiting",
}

export const Running: State = {
  key: Key.Running,
  name: "Running",
}

export const Reviewing: State = {
  key: Key.Reviewing,
  name: "Reviewing",
}

export const States = {
  [Key.Waiting]: Waiting,
  [Key.Running]: Running,
  [Key.Reviewing]: Reviewing,
}
