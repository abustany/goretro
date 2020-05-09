package retro

import (
	"sync"

	"github.com/abustany/goretro/sseconn"
)

type State int

const (
	WaitingForParticipants State = iota + 1
	Running
	ActionPoints
)

type Mood int

const (
	PositiveMood Mood = iota + 1
	NegativeMood
	ConfusedMood
)

type Participant struct {
	ClientID sseconn.ClientID `json:"clientId"`
	Name     string           `json:"name"`
}

type Note struct {
	ID       uint             `json:"id"`
	AuthorID sseconn.ClientID `json:"authorId"`
	Text     string           `json:"text"`
	Mood     Mood             `json:"mood"`
}

type Retro struct {
	sync.Mutex
	id           sseconn.ClientID
	name         string
	state        State
	hostID       sseconn.ClientID // ID of the room "admin"
	participants []Participant
	notes        map[sseconn.ClientID][]Note
}

type Event struct {
	Recipient sseconn.ClientID
	Name      string // type of the event
	Payload   interface{}
}

type SerializedRetro struct {
	ID           sseconn.ClientID            `json:"id"`
	Name         string                      `json:"name"`
	State        State                       `json:"state"`
	HostID       sseconn.ClientID            `json:"hostId"`
	Participants []Participant               `json:"participants"`
	Notes        map[sseconn.ClientID][]Note `json:"notes"`
}

func NewRetro(id sseconn.ClientID, name string) *Retro {
	return &Retro{
		id:    id,
		state: WaitingForParticipants,
		name:  name,
		notes: make(map[sseconn.ClientID][]Note),
	}
}

const (
	participantAddedEventName   = "participant-added"
	participantRemovedEventName = "participant-removed"
	participantUpdatedEventName = "participant-updated"
	currentStateEventName       = "current-state"
	hostChangedEventName        = "host-changed"
	stateChangedEventName       = "state-changed"
)

func (r *Retro) AddParticipant(newParticipant Participant) []Event {
	r.Lock()
	defer r.Unlock()

	events := make([]Event, 0, 1+len(r.participants))

	// send the "participant added" event to all participants, and send the
	// state of the retro to the new participant.

	var alreadyConnected bool

	for _, p := range r.participants {
		if p.ClientID == newParticipant.ClientID {
			// safeguard in case we're adding the same person twice (for
			// example during a reconnect), don't notify other people.
			alreadyConnected = true
			events = nil
			break
		}

		events = append(events, Event{
			Recipient: p.ClientID,
			Name:      participantAddedEventName,
			Payload:   newParticipant,
		})
	}

	if !alreadyConnected {
		r.participants = append(r.participants, newParticipant)
	}

	if len(r.participants) == 1 {
		r.hostID = newParticipant.ClientID
	}

	events = append(events, Event{
		Recipient: newParticipant.ClientID,
		Name:      currentStateEventName,
		Payload:   r.serializeForClientLocked(newParticipant.ClientID),
	})

	return events
}

func (r *Retro) RemoveParticipant(clientID sseconn.ClientID) []Event {
	r.Lock()
	defer r.Unlock()

	newParticipants := make([]Participant, 0, len(r.participants))
	events := make([]Event, 0, len(newParticipants))
	removed := false

	for _, p := range r.participants {
		if p.ClientID == clientID {
			removed = true
			continue
		}

		newParticipants = append(newParticipants, p)
		events = append(events, Event{
			Recipient: p.ClientID,
			Name:      participantRemovedEventName,
			Payload:   Participant{ClientID: clientID},
		})
	}

	if !removed {
		return nil
	}

	r.participants = newParticipants

	if r.hostID == clientID && len(r.participants) > 0 {
		r.hostID = r.participants[0].ClientID

		for _, p := range r.participants {
			events = append(events, Event{
				Recipient: p.ClientID,
				Name:      hostChangedEventName,
				Payload:   r.hostID,
			})
		}
	}

	return events
}

func (r *Retro) UpdateParticipant(updatedParticipant Participant) []Event {
	r.Lock()
	defer r.Unlock()

	var (
		events  = make([]Event, 0, len(r.participants)-1)
		updated bool
	)

	for i, p := range r.participants {
		if p.ClientID == updatedParticipant.ClientID {
			r.participants[i] = updatedParticipant
			updated = true
			continue
		}

		events = append(events, Event{
			Recipient: p.ClientID,
			Name:      participantUpdatedEventName,
			Payload:   updatedParticipant,
		})
	}

	if !updated {
		return nil
	}

	return events
}

func (r *Retro) SetState(clientID sseconn.ClientID, state State) []Event {
	r.Lock()
	defer r.Unlock()

	if clientID != r.hostID || state == WaitingForParticipants {
		return nil
	}

	r.state = state

	events := make([]Event, 0, len(r.participants))

	for _, p := range r.participants {
		events = append(events, Event{
			Recipient: p.ClientID,
			Name:      stateChangedEventName,
			Payload:   state,
		})
	}

	if state == ActionPoints {
		serializedRetro := r.serializeLocked()

		for _, p := range r.participants {
			events = append(events, Event{
				Recipient: p.ClientID,
				Name:      currentStateEventName,
				Payload:   serializedRetro,
			})
		}
	}

	return events
}

func (r *Retro) SaveNote(clientID sseconn.ClientID, ID uint, text string, mood Mood) []Event {
	r.Lock()
	defer r.Unlock()

	if r.state != Running {
		return nil
	}

	note := Note{
		ID:       ID,
		AuthorID: clientID,
		Text:     text,
		Mood:     mood,
	}

	var (
		notes = r.notes[clientID]
		found bool
	)

	for i, n := range notes {
		if n.ID == ID {
			notes[i] = note
			found = true
			break
		}
	}

	if !found {
		notes = append(notes, note)
	}

	r.notes[clientID] = notes

	return nil
}

func (r *Retro) serializeForClientLocked(clientID sseconn.ClientID) SerializedRetro {
	clientNotes := r.notes[clientID]

	if len(clientNotes) == 0 {
		return r.serializeLockedHelper(map[sseconn.ClientID][]Note{})
	}

	notes := map[sseconn.ClientID][]Note{
		clientID: append([]Note{}, clientNotes...),
	}

	return r.serializeLockedHelper(notes)
}

func (r *Retro) serializeLocked() SerializedRetro {
	notes := make(map[sseconn.ClientID][]Note, len(r.notes))

	for clientID, clientNotes := range r.notes {
		notes[clientID] = append([]Note{}, clientNotes...)
	}

	return r.serializeLockedHelper(notes)
}

func (r *Retro) serializeLockedHelper(notes map[sseconn.ClientID][]Note) SerializedRetro {
	return SerializedRetro{
		ID:           r.id,
		Name:         r.name,
		State:        r.state,
		HostID:       r.hostID,
		Participants: append([]Participant{}, r.participants...),
		Notes:        notes,
	}
}
