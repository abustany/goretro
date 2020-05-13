package retro

import "github.com/abustany/goretro/sseconn"

type Note struct {
	ID       uint             `json:"id"`
	AuthorID sseconn.ClientID `json:"authorId"`
	Text     string           `json:"text"`
	Mood     Mood             `json:"mood"`
}
