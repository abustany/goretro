package sseconn

import (
	"encoding/base64"
	"strings"
)

type ClientSecret [clientSecretLength]byte

func ClientSecretFromString(s string) (ClientSecret, error) {
	var c ClientSecret

	s = strings.TrimRight(s, "=")
	data, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil || len(data) != clientSecretLength {
		return c, errInvalidClientSecret
	}

	copy(c[:], data)
	return c, nil
}

func (c ClientSecret) String() string {
	return base64.RawURLEncoding.EncodeToString(c[:])
}
