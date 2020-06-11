package retro

import "github.com/abustany/goretro/sseconn"

type Participant struct {
	ClientID        sseconn.ClientID `json:"clientId"`
	Name            string           `json:"name"`
	FinishedWriting bool             `json:"finishedWriting,omitempty"`
}
