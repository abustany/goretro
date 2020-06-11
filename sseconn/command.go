package sseconn

import "encoding/json"

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
