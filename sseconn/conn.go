package sseconn

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
)

const (
	keepAliveEventName     = "keep-alive"
	clientIDLength         = 16 // bytes
	clientSecretLength     = 64 // bytes
	jsonContentType        = "application/json; charset=utf-8"
	eventStreamContentType = "text/event-stream"
)

var (
	keepAliveInterval = 10 * time.Second
)

var (
	errInvalidRequest      = errors.New("Invalid request")
	errInvalidClientID     = errors.New("Invalid client ID")
	errInvalidClientSecret = errors.New("Invalid client secret")
	errUnknownClient       = errors.New("Unknown client")
	errInvalidConnState    = errors.New("Invalid connection state")
	errEventBufferFull     = errors.New("Event buffer full")
)

// Client Connection

type clientConnState int

const (
	helloReceived clientConnState = iota + 1
	eventsOpen
)

type clientConn struct {
	state     clientConnState
	clientID  ClientID
	secret    ClientSecret
	eventChan chan interface{}
	listeners []chan json.RawMessage
}

// ClientID

type ClientID [clientIDLength]byte

func ClientIDFromString(s string) (ClientID, error) {
	var c ClientID

	data, err := base64.URLEncoding.DecodeString(s)
	if err != nil || len(data) != clientIDLength {
		return c, errInvalidClientID
	}

	copy(c[:], data)
	return c, nil
}

func NewClientID() (ClientID, error) {
	var res ClientID
	_, err := rand.Read(res[:])
	return res, err
}

func (c ClientID) String() string {
	return base64.URLEncoding.EncodeToString(c[:])
}

func (c ClientID) MarshalJSON() ([]byte, error) {
	return json.Marshal(c.String())
}

func (c ClientID) MarshalText() ([]byte, error) {
	return []byte(c.String()), nil
}

func (c ClientID) IsZero() bool {
	var zero ClientID
	return bytes.Equal(zero[:], c[:])
}

// ClientSecret

type ClientSecret [clientSecretLength]byte

func ClientSecretFromString(s string) (ClientSecret, error) {
	var c ClientSecret

	data, err := base64.URLEncoding.DecodeString(s)
	if err != nil || len(data) != clientSecretLength {
		return c, errInvalidClientSecret
	}

	copy(c[:], data)
	return c, nil
}

func (c ClientSecret) String() string {
	return base64.URLEncoding.EncodeToString(c[:])
}

// Commands

type command struct {
	Name     string `json:"name"`
	ClientID string `json:"clientId"`
	Secret   string `json:"secret"`
}

const helloCommandName = "hello"

type helloResult struct {
	EventsURL string `json:"eventsUrl"`
}

const dataCommandName = "data"

type dataCommand struct {
	command
	Payload json.RawMessage `json:"payload"`
}

type dataResult struct {
}

type eventData struct {
	Event   string      `json:"event"`
	Payload interface{} `json:"payload,omitempty"`
}

// Handler

// Handler is a HTTP handler that manages bidirectional connections on top of
// HTTP and SSE.
//
// The client-to-server messages are sent over regular HTTP requests, and the
// server-to-client messages are dispatched via server sent events.
//
// This handler handles two routes under a given prefix:
// 1. POST /prefix/command for client sent messages
// 2. GET /api/events/{ID} for server sent events
//
// Connection steps:
// 1. Client sends initial POST to open connection with a client ID (how do we prevent takeovers?)
// 2. Server sends back SSE endpoint URL
// 3. Client creates EventSource and when the connection is open, confirms to the server.
type Handler struct {
	prefix              string
	router              *mux.Router
	lock                sync.RWMutex
	connections         map[ClientID]*clientConn
	connectionListeners []chan ClientID
}

func NewHandler(prefix string) *Handler {
	h := &Handler{
		router:      mux.NewRouter(),
		connections: map[ClientID]*clientConn{},
	}

	router := h.router

	if prefix != "" {
		if !strings.HasPrefix(prefix, "/") {
			prefix = "/" + prefix
		}

		if !strings.HasSuffix(prefix, "/") {
			prefix += "/"
		}

		router = router.PathPrefix(prefix).Subrouter()
	}

	h.prefix = prefix
	router.Methods("POST").Path("/command").HandlerFunc(h.commandHandlerHTTP)
	router.Methods("GET").Path("/events/{id}").HandlerFunc(h.eventsHandlerHTTP)

	return h
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if err := recover(); err != nil {
			log.Printf("panic happened while handling %s %s: %s", r.Method, r.URL.String(), err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
	}()
	h.router.ServeHTTP(w, r)
}

func (h *Handler) ListenConnections() <-chan ClientID {
	h.lock.Lock()
	defer h.lock.Unlock()

	ch := make(chan ClientID)
	h.connectionListeners = append(h.connectionListeners, ch)
	return ch
}

func (h *Handler) Send(clientID ClientID, eventName string, payload interface{}) error {
	h.lock.RLock()
	defer h.lock.RUnlock()

	c, exists := h.connections[clientID]
	if !exists {
		return errUnknownClient
	}

	select {
	case c.eventChan <- eventData{Event: eventName, Payload: payload}:
		return nil
	default:
		return errEventBufferFull
	}
}

func (h *Handler) Listen(clientID ClientID) (<-chan json.RawMessage, error) {
	h.lock.Lock()
	defer h.lock.Unlock()

	c, exists := h.connections[clientID]
	if !exists {
		return nil, errUnknownClient
	}

	ch := make(chan json.RawMessage)
	c.listeners = append(c.listeners, ch)
	h.connections[clientID] = c

	return ch, nil
}

// Handler - Private

func (h *Handler) writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, errInvalidRequest), errors.Is(err, errInvalidClientID),
		errors.Is(err, errUnknownClient), errors.Is(err, errInvalidConnState),
		errors.Is(err, errInvalidClientSecret):
		http.Error(w, err.Error(), http.StatusBadRequest)
	default:
		log.Printf("error serving request: %s", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

func (h *Handler) commandHandlerHTTP(w http.ResponseWriter, r *http.Request) {
	result, err := h.commandHandler(r.Body)

	if err != nil {
		h.writeError(w, err)
		return
	}

	w.Header().Add("Content-Type", jsonContentType)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

func (h *Handler) commandHandler(in io.Reader) (interface{}, error) {
	var rawCmd json.RawMessage
	if err := json.NewDecoder(in).Decode(&rawCmd); err != nil {
		return nil, errInvalidRequest
	}

	var baseCmd command
	if err := json.Unmarshal(rawCmd, &baseCmd); err != nil {
		return nil, errInvalidRequest
	}

	clientID, err := ClientIDFromString(baseCmd.ClientID)
	if err != nil {
		return struct{}{}, errInvalidClientID
	}

	clientSecret, err := ClientSecretFromString(baseCmd.Secret)
	if err != nil {
		return struct{}{}, errInvalidClientSecret
	}

	var result interface{}

	switch baseCmd.Name {
	case helloCommandName:
		result, err = h.handleHelloCommand(clientID, clientSecret)
	case dataCommandName:
		cmd := dataCommand{}
		if err := json.Unmarshal(rawCmd, &cmd); err != nil {
			return nil, errInvalidRequest
		}

		result, err = h.handleDataCommand(clientID, clientSecret, cmd)
	default:
		err = errInvalidRequest
	}

	return result, err
}

func (h *Handler) handleHelloCommand(clientID ClientID, clientSecret ClientSecret) (helloResult, error) {
	if err := h.closeConnectionIfExists(clientID, clientSecret); err != nil && err != errUnknownClient {
		return helloResult{}, fmt.Errorf("error closing existing connection: %w", err)
	}

	clientConn, err := h.createConnection(clientID, clientSecret)
	if err != nil {
		return helloResult{}, fmt.Errorf("error creating connection: %w", err)
	}

	eventsURL := path.Join(h.prefix, "events", url.PathEscape(clientConn.clientID.String()))

	return helloResult{EventsURL: eventsURL}, nil
}

func (h *Handler) handleDataCommand(clientID ClientID, clientSecret ClientSecret, cmd dataCommand) (dataResult, error) {
	h.lock.RLock()
	defer h.lock.RUnlock()

	var res dataResult

	c, exists := h.connections[clientID]
	if !exists {
		return res, errUnknownClient
	} else if c.secret != clientSecret {
		return res, errInvalidClientSecret
	}

	for _, listener := range c.listeners {
		select {
		case listener <- cmd.Payload:
		default:
			log.Printf("listener lagging behind for client %s, dropping data", clientID.String())
		}
	}

	return res, nil
}

func (h *Handler) eventsHandlerHTTP(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	clientID, err := ClientIDFromString(vars["id"])
	if err != nil {
		h.writeError(w, err)
		return
	}

	eventsChan, err := h.markConnectionOpen(clientID)
	if err != nil {
		h.writeError(w, err)
		return
	}

	encoder := json.NewEncoder(w)
	flusher := w.(http.Flusher)
	keepAliveTicker := time.NewTicker(keepAliveInterval)

	w.Header().Add("Cache-Control", "no-cache, no-transform")
	w.Header().Add("Content-Type", eventStreamContentType)
	w.WriteHeader(http.StatusOK)
	io.WriteString(w, ": Beginning of the event stream\n\n")
	flusher.Flush()

MainLoop:
	for {
		var message interface{}
		select {
		case ev, ok := <-eventsChan:
			if !ok {
				break MainLoop
			}

			message = ev
		case <-keepAliveTicker.C:
			message = eventData{Event: keepAliveEventName}
		case <-r.Context().Done():
			// connection has been closed
			h.closeConnection(clientID)
			break MainLoop
		}

		io.WriteString(w, "data: ")

		err := encoder.Encode(message)
		if err != nil {
			log.Printf("error encoding event for client %s: %s", clientID.String(), err)
			break
		}

		io.WriteString(w, "\n\n")

		flusher.Flush()
	}
}

func (h *Handler) closeConnection(clientID ClientID) error {
	h.lock.Lock()
	defer h.lock.Unlock()

	return h.closeConnectionLocked(clientID)
}

func (h *Handler) closeConnectionIfExists(clientID ClientID, secret ClientSecret) error {
	h.lock.Lock()
	defer h.lock.Unlock()

	if conn := h.connections[clientID]; conn != nil && conn.secret == secret {
		return h.closeConnectionLocked(clientID)
	}

	return nil
}

func (h *Handler) closeConnectionLocked(clientID ClientID) error {

	c, exists := h.connections[clientID]
	if !exists {
		return errUnknownClient
	}

	delete(h.connections, clientID)
	for _, listener := range c.listeners {
		close(listener)
	}
	close(c.eventChan)

	// FIXME: Implement
	return nil
}

func (h *Handler) createConnection(clientID ClientID, secret ClientSecret) (*clientConn, error) {
	h.lock.Lock()
	defer h.lock.Unlock()

	if _, exists := h.connections[clientID]; exists {
		return nil, fmt.Errorf("connection already exists")
	}

	c := &clientConn{
		state:     helloReceived,
		clientID:  clientID,
		secret:    secret,
		eventChan: make(chan interface{}, 128),
	}

	h.connections[clientID] = c

	for _, listener := range h.connectionListeners {
		select {
		case listener <- clientID:
		default:
			log.Printf("connection listener lagging behind, dropping data")
		}
	}

	return c, nil
}

func (h *Handler) markConnectionOpen(clientID ClientID) (<-chan interface{}, error) {
	h.lock.Lock()
	defer h.lock.Unlock()

	c, exists := h.connections[clientID]
	if !exists {
		return nil, errUnknownClient
	} else if c.state != helloReceived {
		return nil, errInvalidConnState
	}

	c.state = eventsOpen

	return c.eventChan, nil
}
