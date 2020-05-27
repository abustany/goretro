package retro

import (
	"encoding/json"
	"errors"
	"fmt"
	"sync"

	"log"

	"github.com/abustany/goretro/sseconn"
)

type ConnManager interface {
	ListenConnections() <-chan sseconn.ClientID
	Listen(clientID sseconn.ClientID) (<-chan json.RawMessage, error)
	Send(clientID sseconn.ClientID, eventName string, payload interface{}) error
}

type clientInfo struct {
	name  string
	retro *Retro
}

type Manager struct {
	lock        sync.RWMutex
	connManager ConnManager
	retros      map[sseconn.ClientID]*Retro
	clientInfo  map[sseconn.ClientID]clientInfo
}

func NewManager(connManager ConnManager) *Manager {
	m := &Manager{
		connManager: connManager,
		retros:      make(map[sseconn.ClientID]*Retro),
		clientInfo:  make(map[sseconn.ClientID]clientInfo),
	}

	newConns := connManager.ListenConnections()

	go func() {
		for clientID := range newConns {
			m.handleNewConnection(clientID)
		}
	}()

	return m
}

func (m *Manager) handleNewConnection(clientID sseconn.ClientID) {
	log.Printf("New connection with ID %s", clientID)

	events, err := m.connManager.Listen(clientID)
	if err != nil {
		log.Printf("error listening on connection: %s", err)
	}

	go func(clientID sseconn.ClientID) {
		for event := range events {
			m.handleConnectionData(clientID, event)
		}

		log.Printf("Client disconnected: %s", clientID)
		m.handleDisconnect(clientID)
	}(clientID)
}

func (m *Manager) handleDisconnect(clientID sseconn.ClientID) {
	m.lock.Lock()
	clientInfo, ok := m.clientInfo[clientID]
	delete(m.clientInfo, clientID)
	m.lock.Unlock()

	if !ok {
		return
	}

	if clientInfo.retro != nil {
		m.dispatchEvents(clientInfo.retro.RemoveParticipant(clientID))
	}
}

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

func (m *Manager) handleConnectionData(clientID sseconn.ClientID, data json.RawMessage) {
	if err := m.handleCommand(clientID, data); err != nil {
		log.Printf("invalid command from client %s: %s (%s)", clientID.String(), string(data), err)
	}
}

func (m *Manager) handleCommand(clientID sseconn.ClientID, data json.RawMessage) error {
	var (
		cmd    command
		events []Event
		err    error
	)

	if err := json.Unmarshal(data, &cmd); err != nil {
		return fmt.Errorf("error unmarshaling command: %w", err)
	}

	switch cmd.Name {
	case createRoomCommandName:
		var createRoomCommand createRoomCommand
		if err := json.Unmarshal(data, &createRoomCommand); err != nil {
			return fmt.Errorf("error decoding command: %w", err)
		}

		events, err = m.handleCreateRoomCommand(clientID, createRoomCommand)
	case joinRoomCommandName:
		var joinRoomCommand joinRoomCommand
		if err := json.Unmarshal(data, &joinRoomCommand); err != nil {
			return fmt.Errorf("error decoding command: %w", err)
		}

		events, err = m.handleJoinRoomCommand(clientID, joinRoomCommand)
	case identifyCommandName:
		var identifyCommand identifyCommand
		if err := json.Unmarshal(data, &identifyCommand); err != nil {
			return fmt.Errorf("error decoding command: %w", err)
		}

		events, err = m.handleIdentifyCommand(clientID, identifyCommand)
	case setStateCommandName:
		var setStateCommand setStateCommand
		if err := json.Unmarshal(data, &setStateCommand); err != nil {
			return fmt.Errorf("error decoding command: %w", err)
		}

		events, err = m.handlesetStateCommand(clientID, setStateCommand)
	case saveNoteCommentName:
		var saveNoteCommand saveNoteCommand
		if err := json.Unmarshal(data, &saveNoteCommand); err != nil {
			return fmt.Errorf("error decoding command: %w", err)
		}

		events, err = m.handleSaveNoteCommand(clientID, saveNoteCommand)
	case setFinishedWritingName:
		var setFinishedWritingCommand setFinishedWritingCommand
		if err := json.Unmarshal(data, &setFinishedWritingCommand); err != nil {
			return fmt.Errorf("error decoding command: %w", err)
		}

		events, err = m.handleSetFinishedWritingCommand(clientID, setFinishedWritingCommand)
	default:
		return fmt.Errorf("unknown command %s", cmd.Name)
	}

	if err != nil {
		return fmt.Errorf("error handling command %s: %w", cmd.Name, err)
	}

	m.dispatchEvents(events)

	return nil
}

func (m *Manager) handleCreateRoomCommand(clientID sseconn.ClientID, cmd createRoomCommand) ([]Event, error) {
	if cmd.RoomName == "" {
		return nil, fmt.Errorf("empty room name")
	}

	roomID, err := sseconn.NewClientID()
	if err != nil {
		return nil, fmt.Errorf("error generating room ID: %w", err)
	}

	retro := NewRetro(roomID, cmd.RoomName)

	m.lock.Lock()
	defer m.lock.Unlock()

	m.retros[roomID] = retro

	return m.joinRoomLocked(retro, clientID)
}

func (m *Manager) handleJoinRoomCommand(clientID sseconn.ClientID, cmd joinRoomCommand) ([]Event, error) {
	roomID, err := sseconn.ClientIDFromString(cmd.RoomID)
	if err != nil {
		return nil, fmt.Errorf("invalid room ID: %s", roomID)
	}

	m.lock.RLock()
	defer m.lock.RUnlock()

	retro := m.retros[roomID]

	if retro == nil {
		return nil, fmt.Errorf("invalid room ID: %s", roomID)
	}

	return m.joinRoomLocked(retro, clientID)
}

func (m *Manager) joinRoomLocked(retro *Retro, clientID sseconn.ClientID) ([]Event, error) {
	clientInfo := m.clientInfo[clientID]

	if clientInfo.retro != nil {
		m.dispatchEvents(clientInfo.retro.RemoveParticipant(clientID))
	}

	clientInfo.retro = retro
	m.clientInfo[clientID] = clientInfo

	return retro.AddParticipant(Participant{ClientID: clientID, Name: clientInfo.name}), nil
}

func (m *Manager) handleIdentifyCommand(clientID sseconn.ClientID, cmd identifyCommand) ([]Event, error) {
	m.lock.Lock()
	defer m.lock.Unlock()

	clientInfo := m.clientInfo[clientID]
	clientInfo.name = cmd.Nickname
	m.clientInfo[clientID] = clientInfo

	if clientInfo.retro == nil {
		return nil, nil
	}

	return clientInfo.retro.UpdateParticipant(Participant{ClientID: clientID, Name: cmd.Nickname}), nil
}

func (m *Manager) handlesetStateCommand(clientID sseconn.ClientID, cmd setStateCommand) ([]Event, error) {
	state, err := stateFromInt(cmd.State)
	if err != nil {
		return nil, fmt.Errorf("error validating state: %w", err)
	}

	m.lock.Lock()
	defer m.lock.Unlock()

	clientInfo := m.clientInfo[clientID]

	if clientInfo.retro == nil {
		return nil, nil
	}

	return clientInfo.retro.SetState(clientID, state), nil
}

func (m *Manager) handleSaveNoteCommand(clientID sseconn.ClientID, cmd saveNoteCommand) ([]Event, error) {
	mood, err := moodFromInt(cmd.Mood)
	if err != nil {
		return nil, fmt.Errorf("error validating mood: %w", err)
	}

	m.lock.Lock()
	defer m.lock.Unlock()

	clientInfo := m.clientInfo[clientID]
	if clientInfo.retro == nil {
		return nil, errors.New("client is not in any room")
	}

	return clientInfo.retro.SaveNote(clientID, cmd.ID, cmd.Text, mood), nil
}

func (m *Manager) handleSetFinishedWritingCommand(clientID sseconn.ClientID, cmd setFinishedWritingCommand) ([]Event, error) {
	m.lock.Lock()
	defer m.lock.Unlock()

	clientInfo := m.clientInfo[clientID]
	if clientInfo.retro == nil {
		return nil, errors.New("client is not in any room")
	}

	return clientInfo.retro.SetFinishedWriting(clientID, cmd.Finished), nil
}

func (m *Manager) dispatchEvents(events []Event) {
	for _, ev := range events {
		if err := m.connManager.Send(ev.Recipient, ev.Name, ev.Payload); err != nil {
			log.Printf("error dispatching event to %s: %s", ev.Recipient, err)
		}
	}
}

func moodFromInt(i uint) (Mood, error) {
	switch i {
	case uint(PositiveMood), uint(NegativeMood), uint(ConfusedMood):
		return Mood(i), nil
	default:
		return 0, fmt.Errorf("invalid value: %d", i)
	}
}

func stateFromInt(i uint) (State, error) {
	switch i {
	case uint(WaitingForParticipants), uint(Running), uint(ActionPoints):
		return State(i), nil
	default:
		return 0, fmt.Errorf("invalid value: %d", i)
	}
}
