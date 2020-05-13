package sseconn

import "encoding/base64"

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
