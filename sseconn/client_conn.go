package sseconn

import "encoding/json"

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
