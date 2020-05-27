package retro

import (
	"strconv"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/abustany/goretro/sseconn"
)

func newClientID(t *testing.T) sseconn.ClientID {
	clientID, err := sseconn.NewClientID()
	if err != nil {
		t.Fatalf("error generating second client ID: " + err.Error())
	}

	return clientID
}

func makePartipant(t *testing.T, i int) Participant {
	return Participant{
		ClientID: newClientID(t),
		Name:     "P" + strconv.Itoa(i),
	}
}

func makeRetro(t *testing.T) *Retro {
	retroID := newClientID(t)
	retroName := "Retro"
	return NewRetro(retroID, retroName)
}

func checkEqual(t *testing.T, expected, actual interface{}) {
	t.Helper()

	if diff := cmp.Diff(expected, actual); diff != "" {
		t.Fatalf("values do not match\nexpected: %+v\nactual:   %+v\ndiff: %s", expected, actual, diff)
	}
}

func TestAddParticipant(t *testing.T) {
	r := makeRetro(t)
	p1, p2 := makePartipant(t, 0), makePartipant(t, 1)

	serializedRetro := SerializedRetro{
		ID:    r.id,
		Name:  r.name,
		State: WaitingForParticipants,
		Notes: map[sseconn.ClientID][]Note{},
	}

	t.Run("first participant becomes the host", func(t *testing.T) {
		serializedRetro.Participants = append(serializedRetro.Participants, p1)
		serializedRetro.HostID = p1.ClientID

		expectedEvents := []Event{
			{
				Recipient: p1.ClientID,
				Name:      currentStateEventName,
				Payload:   serializedRetro,
			},
		}
		checkEqual(t, expectedEvents, r.AddParticipant(p1))
		checkEqual(t, p1.ClientID, r.hostID)
		checkEqual(t, []Participant{p1}, r.participants)
	})

	t.Run("second participant triggers a notification to the first one", func(t *testing.T) {
		serializedRetro.Participants = append(serializedRetro.Participants, p2)

		expectedEvents := []Event{
			{
				Recipient: p1.ClientID,
				Name:      participantAddedEventName,
				Payload:   p2,
			},
			{
				Recipient: p2.ClientID,
				Name:      currentStateEventName,
				Payload:   serializedRetro,
			},
		}
		checkEqual(t, expectedEvents, r.AddParticipant(p2))
		checkEqual(t, p1.ClientID, r.hostID)
		checkEqual(t, []Participant{p1, p2}, r.participants)
	})

	t.Run("participant reconnecting does not dispatch any notifications for others", func(t *testing.T) {
		expectedEvents := []Event{
			{
				Recipient: p2.ClientID,
				Name:      currentStateEventName,
				Payload:   serializedRetro,
			},
		}
		checkEqual(t, expectedEvents, r.AddParticipant(p2))
		checkEqual(t, p1.ClientID, r.hostID)
		checkEqual(t, []Participant{p1, p2}, r.participants)
	})
}

func TestRemoveParticipant(t *testing.T) {
	r := makeRetro(t)
	p1, p2, p3 := makePartipant(t, 0), makePartipant(t, 1), makePartipant(t, 2)
	r.AddParticipant(p1)
	r.AddParticipant(p2)
	r.AddParticipant(p3)

	t.Run("removing a non existing participant does nothing", func(t *testing.T) {
		checkEqual(t, []Event(nil), r.RemoveParticipant(newClientID(t)))
		checkEqual(t, []Participant{p1, p2, p3}, r.participants)
	})

	t.Run("removing a participant notifies the others", func(t *testing.T) {
		expectedEvents := []Event{
			{
				Recipient: p1.ClientID,
				Name:      participantRemovedEventName,
				Payload:   Participant{ClientID: p2.ClientID},
			},
			{
				Recipient: p3.ClientID,
				Name:      participantRemovedEventName,
				Payload:   Participant{ClientID: p2.ClientID},
			},
		}
		checkEqual(t, expectedEvents, r.RemoveParticipant(p2.ClientID))
		checkEqual(t, []Participant{p1, p3}, r.participants)
	})

	t.Run("removing the host promotes another user", func(t *testing.T) {
		expectedEvents := []Event{
			{
				Recipient: p3.ClientID,
				Name:      participantRemovedEventName,
				Payload:   Participant{ClientID: p1.ClientID},
			},
			{
				Recipient: p3.ClientID,
				Name:      hostChangedEventName,
				Payload:   p3.ClientID,
			},
		}
		checkEqual(t, expectedEvents, r.RemoveParticipant(p1.ClientID))
		checkEqual(t, []Participant{p3}, r.participants)
		checkEqual(t, p3.ClientID, r.hostID)
	})

	t.Run("removing the the last user does not send any events", func(t *testing.T) {
		checkEqual(t, []Event{}, r.RemoveParticipant(p3.ClientID))
		checkEqual(t, []Participant{}, r.participants)
	})
}

func TestUpdateParticipant(t *testing.T) {
	r := makeRetro(t)
	p1, p2, p3 := makePartipant(t, 0), makePartipant(t, 1), makePartipant(t, 2)
	r.AddParticipant(p1)
	r.AddParticipant(p2)
	r.AddParticipant(p3)

	t.Run("updating a non existing participant does nothing", func(t *testing.T) {
		checkEqual(t, []Event(nil), r.UpdateParticipant(Participant{ClientID: newClientID(t), Name: "Unknown"}))
		checkEqual(t, []Participant{p1, p2, p3}, r.participants)
	})

	t.Run("Updating a participant notifies the other", func(t *testing.T) {
		p2.Name = "Renamed!"
		expectedEvents := []Event{
			{
				Recipient: p1.ClientID,
				Name:      participantUpdatedEventName,
				Payload:   p2,
			},
			{
				Recipient: p3.ClientID,
				Name:      participantUpdatedEventName,
				Payload:   p2,
			},
		}
		checkEqual(t, expectedEvents, r.UpdateParticipant(p2))
		checkEqual(t, []Participant{p1, p2, p3}, r.participants)
	})
}

func TestSetState(t *testing.T) {
	r := makeRetro(t)
	p1, p2, p3 := makePartipant(t, 0), makePartipant(t, 1), makePartipant(t, 2)
	r.AddParticipant(p1)
	r.AddParticipant(p2)
	r.AddParticipant(p3)

	t.Run("SetState does nothing if you're not the host", func(t *testing.T) {
		checkEqual(t, []Event(nil), r.SetState(p2.ClientID, Running))
		checkEqual(t, WaitingForParticipants, r.state)
	})

	t.Run("Starting the retro notifies all participants", func(t *testing.T) {
		expectedEvents := []Event{
			{
				Recipient: p1.ClientID,
				Name:      stateChangedEventName,
				Payload:   Running,
			},
			{
				Recipient: p2.ClientID,
				Name:      stateChangedEventName,
				Payload:   Running,
			},
			{
				Recipient: p3.ClientID,
				Name:      stateChangedEventName,
				Payload:   Running,
			},
		}
		checkEqual(t, expectedEvents, r.SetState(p1.ClientID, Running))
	})

	t.Run("SetState never does not rewind from Running to WaitingForParticipants", func(t *testing.T) {
		checkEqual(t, []Event(nil), r.SetState(p1.ClientID, WaitingForParticipants))
		checkEqual(t, Running, r.state)
	})

	serializedRetro := SerializedRetro{
		ID:           r.id,
		Name:         r.name,
		State:        ActionPoints,
		HostID:       p1.ClientID,
		Participants: []Participant{p1, p2, p3},
		Notes:        map[sseconn.ClientID][]Note{},
	}

	expectedActionPointsEvents := []Event{
		{
			Recipient: p1.ClientID,
			Name:      stateChangedEventName,
			Payload:   ActionPoints,
		},
		{
			Recipient: p2.ClientID,
			Name:      stateChangedEventName,
			Payload:   ActionPoints,
		},
		{
			Recipient: p3.ClientID,
			Name:      stateChangedEventName,
			Payload:   ActionPoints,
		},
		{
			Recipient: p1.ClientID,
			Name:      currentStateEventName,
			Payload:   serializedRetro,
		},
		{
			Recipient: p2.ClientID,
			Name:      currentStateEventName,
			Payload:   serializedRetro,
		},
		{
			Recipient: p3.ClientID,
			Name:      currentStateEventName,
			Payload:   serializedRetro,
		},
	}

	t.Run("Switching to action points sends the complete retro state to all participants", func(t *testing.T) {
		checkEqual(t, expectedActionPointsEvents, r.SetState(p1.ClientID, ActionPoints))
	})

	t.Run("SetState never does not rewind from ActionPoints to WaitingForParticipants", func(t *testing.T) {
		checkEqual(t, []Event(nil), r.SetState(p1.ClientID, WaitingForParticipants))
		checkEqual(t, ActionPoints, r.state)
	})

	t.Run("SetState can rewind from ActionPoints to Running", func(t *testing.T) {
		expectedEvents := []Event{
			{
				Recipient: p1.ClientID,
				Name:      stateChangedEventName,
				Payload:   Running,
			},
			{
				Recipient: p2.ClientID,
				Name:      stateChangedEventName,
				Payload:   Running,
			},
			{
				Recipient: p3.ClientID,
				Name:      stateChangedEventName,
				Payload:   Running,
			},
		}
		checkEqual(t, expectedEvents, r.SetState(p1.ClientID, Running))
		checkEqual(t, Running, r.state)
	})

	t.Run("SetState can go back to action points", func(t *testing.T) {
		checkEqual(t, expectedActionPointsEvents, r.SetState(p1.ClientID, ActionPoints))
	})
}

func TestSaveNote(t *testing.T) {
	r := makeRetro(t)
	p1 := makePartipant(t, 0)
	r.AddParticipant(p1)

	t.Run("Saving notes is not possible in WaitingForParticipants state", func(t *testing.T) {
		checkEqual(t, []Event(nil), r.SaveNote(p1.ClientID, 0, "Hello", PositiveMood))
		checkEqual(t, map[sseconn.ClientID][]Note{}, r.notes)
	})

	r.SetState(p1.ClientID, Running)

	expectedNotes := []Note{}

	t.Run("Saving a new note", func(t *testing.T) {
		expectedNotes = append(expectedNotes, Note{ID: 0, AuthorID: p1.ClientID, Text: "Hello", Mood: PositiveMood})
		checkEqual(t, []Event(nil), r.SaveNote(p1.ClientID, 0, "Hello", PositiveMood))
		checkEqual(t, map[sseconn.ClientID][]Note{p1.ClientID: expectedNotes}, r.notes)
	})

	t.Run("Saving a second note", func(t *testing.T) {
		expectedNotes = append(expectedNotes, Note{ID: 1, AuthorID: p1.ClientID, Text: "World", Mood: NegativeMood})
		checkEqual(t, []Event(nil), r.SaveNote(p1.ClientID, 1, "World", NegativeMood))
		checkEqual(t, map[sseconn.ClientID][]Note{p1.ClientID: expectedNotes}, r.notes)
	})

	t.Run("Overwriting a note", func(t *testing.T) {
		expectedNotes[0].Text = "Wat"
		expectedNotes[0].Mood = ConfusedMood
		checkEqual(t, []Event(nil), r.SaveNote(p1.ClientID, 0, "Wat", ConfusedMood))
		checkEqual(t, map[sseconn.ClientID][]Note{p1.ClientID: expectedNotes}, r.notes)
	})
}

func TestSetFinishedWriting(t *testing.T) {
	r := makeRetro(t)
	host := makePartipant(t, 0)
	other := makePartipant(t, 1)
	newJoiner := makePartipant(t, 2)
	r.AddParticipant(host)
	r.AddParticipant(other)
	r.SetState(host.ClientID, Running)

	t.Run("host setting finished flag does not trigger any events", func(t *testing.T) {
		checkEqual(t, []Event(nil), r.SetFinishedWriting(host.ClientID, true))
	})

	t.Run("participant setting finished flag triggers an event to the host", func(t *testing.T) {
		updatedOther := other
		updatedOther.FinishedWriting = true

		checkEqual(
			t,
			[]Event{
				{
					Recipient: host.ClientID,
					Name:      participantUpdatedEventName,
					Payload:   updatedOther,
				},
			},
			r.SetFinishedWriting(other.ClientID, true),
		)
	})

	t.Run("a participant rejoining does not see the FinishedWriting flag", func(t *testing.T) {
		serializedRetro := SerializedRetro{
			ID:     r.id,
			Name:   r.name,
			State:  Running,
			HostID: host.ClientID,
			Participants: []Participant{
				host,
				other,
				newJoiner,
			},
			Notes: map[sseconn.ClientID][]Note{},
		}

		checkEqual(
			t,
			[]Event{
				{Recipient: host.ClientID, Name: participantAddedEventName, Payload: newJoiner},
				{Recipient: other.ClientID, Name: participantAddedEventName, Payload: newJoiner},
				{Recipient: newJoiner.ClientID, Name: currentStateEventName, Payload: serializedRetro},
			},
			r.AddParticipant(newJoiner),
		)
	})

	t.Run("the host rejoining sees the FinishedWriting flags", func(t *testing.T) {
		serializedRetro := SerializedRetro{
			ID:     r.id,
			Name:   r.name,
			State:  Running,
			HostID: host.ClientID,
			Participants: []Participant{
				host,
				other,
				newJoiner,
			},
			Notes: map[sseconn.ClientID][]Note{},
		}
		serializedRetro.Participants[1].FinishedWriting = true

		checkEqual(
			t,
			[]Event{
				{Recipient: host.ClientID, Name: currentStateEventName, Payload: serializedRetro},
			},
			r.AddParticipant(host),
		)
	})
}
