package retro

import "fmt"

type State int

const (
	WaitingForParticipants State = iota + 1
	Running
	ActionPoints
)

func stateFromInt(i uint) (State, error) {
	switch i {
	case uint(WaitingForParticipants), uint(Running), uint(ActionPoints):
		return State(i), nil
	default:
		return 0, fmt.Errorf("invalid value: %d", i)
	}
}
