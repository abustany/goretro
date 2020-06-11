package sseconn

import (
	"encoding/json"
	"time"
)

type clientConnState int

const (
	helloReceived clientConnState = iota + 1
	eventsOpen
	eventsPaused
)

type clientConn struct {
	state     clientConnState
	pausedAt  time.Time
	clientID  ClientID
	secret    ClientSecret
	eventChan chan interface{}
	listeners []chan json.RawMessage
}
