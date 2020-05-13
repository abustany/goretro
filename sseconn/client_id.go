package sseconn

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"strings"
)

type ClientID [clientIDLength]byte

func ClientIDFromString(s string) (ClientID, error) {
	var c ClientID

	s = strings.TrimRight(s, "=")
	data, err := base64.RawURLEncoding.DecodeString(s)
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
	return base64.RawURLEncoding.EncodeToString(c[:])
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
