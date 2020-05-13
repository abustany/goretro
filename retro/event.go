package retro

import "github.com/abustany/goretro/sseconn"

type Event struct {
	Recipient sseconn.ClientID
	Name      string // type of the event
	Payload   interface{}
}

const (
	participantAddedEventName   = "participant-added"
	participantRemovedEventName = "participant-removed"
	participantUpdatedEventName = "participant-updated"
	currentStateEventName       = "current-state"
	hostChangedEventName        = "host-changed"
	stateChangedEventName       = "state-changed"
)
