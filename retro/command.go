package retro

type command struct {
	Name string `json:"name"`
}

const createRoomCommandName = `create-room`

type createRoomCommand struct {
	command
	RoomName string `json:"roomName"`
}

const joinRoomCommandName = `join-room`

type joinRoomCommand struct {
	command
	RoomID string `json:"roomId"`
}

const identifyCommandName = `identify`

type identifyCommand struct {
	command
	Nickname string `json:"nickname"`
}

const setStateCommandName = `set-state`

type setStateCommand struct {
	command
	State uint `json:"state"`
}

const saveNoteCommentName = `save-note`

type saveNoteCommand struct {
	command
	ID   uint   `json:"noteId"`
	Text string `json:"text"`
	Mood uint   `json:"mood"`
}

const setFinishedWritingName = `set-finished-writing`

type setFinishedWritingCommand struct {
	command
	Finished bool `json:"finished"`
}
