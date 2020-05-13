package sseconn

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func makeClientID(t *testing.T) ClientID {
	clientID, err := NewClientID()
	if err != nil {
		t.Fatalf("error generating second client ID: %s", err)
	}

	return clientID
}

func TestSendOnUnknownClient(t *testing.T) {
	if err := NewHandler("api").Send(makeClientID(t), "client does not exist", 33); !errors.Is(err, errUnknownClient) {
		t.Errorf("sending a message to an unknown client should return errUnknownClient")
	}
}

func TestListenOnUnknownClient(t *testing.T) {
	if _, err := NewHandler("api").Listen(makeClientID(t)); !errors.Is(err, errUnknownClient) {
		t.Errorf("listening on an unknown client should return errUnknownClient")
	}
}

func TestInvalidCommands(t *testing.T) {
	handler := NewHandler("api")
	server := httptest.NewServer(handler)
	defer server.Close()

	baseURL := server.URL + "/api/"

	clientID := makeClientID(t)
	clientSecret, err := ClientSecretFromString("R0sxpQUrf7Yc2_uqbQi6E_YJUXUbKqXM-v7dm_m9qe-LuEAtR-ST9IUvwn31_dgSFMeJf51XVhZA-1XhytCnjg==")
	if err != nil {
		t.Fatalf("error parsing client secret: %s", err)
	}

	type testCommand struct {
		Name     interface{} `json:"name"`
		ClientID interface{} `json:"clientId"`
		Secret   interface{} `json:"secret"`
	}

	makeCommand := func(t *testing.T, patch ...func(c *testCommand)) string {
		t.Helper()

		c := testCommand{
			ClientID: clientID.String(),
			Secret:   clientSecret.String(),
		}

		for _, p := range patch {
			p(&c)
		}

		res, err := json.Marshal(c)
		if err != nil {
			t.Fatalf("error marshaling command: %s", err)
		}

		return string(res)
	}

	sendCommand := func(t *testing.T, input string, expectedCode int) {
		t.Helper()
		res, err := http.Post(baseURL+"command", jsonContentType, strings.NewReader(input))
		if err != nil {
			t.Fatalf("error sending command: %s", err)
		}

		res.Body.Close()
		if res.StatusCode != expectedCode {
			t.Errorf("expected status %d, got %d", expectedCode, res.StatusCode)
		}
	}

	getEvents := func(t *testing.T, clientID string, expectedCode int) {
		t.Helper()
		res, err := http.Get(baseURL + "events/" + clientID)
		if err != nil {
			t.Fatalf("error sending events request: %s", err)
		}

		res.Body.Close()
		if res.StatusCode != expectedCode {
			t.Errorf("expected status %d, got %d", expectedCode, res.StatusCode)
		}
	}

	for _, tc := range []struct {
		Name  string
		Input string
	}{
		{
			Name:  "invalid JSON",
			Input: "this is not JSON",
		},
		{
			Name:  "invalid command name",
			Input: makeCommand(t, func(c *testCommand) { c.Name = 33 }),
		},
		{
			Name:  "invalid client ID (type)",
			Input: makeCommand(t, func(c *testCommand) { c.Name = "hello"; c.ClientID = 33 }),
		},
		{
			Name:  "invalid client ID (value)",
			Input: makeCommand(t, func(c *testCommand) { c.Name = "hello"; c.ClientID = "not a valid client ID" }),
		},
		{
			Name:  "invalid client secret (type)",
			Input: makeCommand(t, func(c *testCommand) { c.Name = "hello"; c.Secret = 33 }),
		},
		{
			Name:  "invalid client secret (value)",
			Input: makeCommand(t, func(c *testCommand) { c.Name = "hello"; c.Secret = "not a valid client secret" }),
		},
		{
			Name:  "invalid command name",
			Input: makeCommand(t, func(c *testCommand) { c.Name = "wat" }),
		},
		{
			Name:  "data before hello",
			Input: makeCommand(t, func(c *testCommand) { c.Name = "data"; c.ClientID = makeClientID(t) }),
		},
	} {
		t.Run(tc.Name, func(t *testing.T) {
			sendCommand(t, tc.Input, http.StatusBadRequest)
		})
	}

	t.Run("invalid client secret", func(t *testing.T) {
		clientID := makeClientID(t)
		zeroClientSecret := ClientSecret{}.String()
		sendCommand(t, makeCommand(t, func(c *testCommand) { c.Name = "hello"; c.ClientID = clientID }), http.StatusOK)
		sendCommand(t, makeCommand(t, func(c *testCommand) { c.Name = "data"; c.ClientID = clientID; c.Secret = zeroClientSecret }), http.StatusBadRequest)
	})

	t.Run("invalid client ID in events request", func(t *testing.T) {
		getEvents(t, "not a valid client ID", http.StatusBadRequest)
	})

	t.Run("unknown client ID in events request", func(t *testing.T) {
		clientID := makeClientID(t)
		sendCommand(t, makeCommand(t, func(c *testCommand) { c.Name = "hello"; c.ClientID = clientID }), http.StatusOK)
		getEvents(t, makeClientID(t).String(), http.StatusBadRequest)
	})
}

func TestHelloKeepaliveGoodbye(t *testing.T) {
	keepAliveInterval = 200 * time.Millisecond

	handler := NewHandler("api")
	server := httptest.NewServer(handler)
	defer server.Close()

	incomingConnections := handler.ListenConnections()

	baseURL := server.URL + "/api/"
	clientID, err := ClientIDFromString("VHUFS_CXZf1rn4IFPRY7fA==")
	if err != nil {
		t.Fatalf("error parsing client ID: %s", err)
	}

	clientSecret, err := ClientSecretFromString("R0sxpQUrf7Yc2_uqbQi6E_YJUXUbKqXM-v7dm_m9qe-LuEAtR-ST9IUvwn31_dgSFMeJf51XVhZA-1XhytCnjg==")
	if err != nil {
		t.Fatalf("error parsing client secret: %s", err)
	}

	go func(t *testing.T) {
		select {
		case incomingClientID := <-incomingConnections:
			if incomingClientID != clientID {
				t.Errorf("invalid client ID in incoming connection listener: expected %s, got %s", clientID, incomingClientID)
			}
		case <-time.After(5 * time.Second):
			t.Errorf("timeout waiting for incoming connection listener")
		}
	}(t)

	// 1. Send hello command
	helloRes, err := postHello(baseURL, clientID.String(), clientSecret.String())
	if err != nil {
		t.Fatalf(err.Error())
	}

	expectedEventsURL := "/api/events/" + clientID.String()
	if helloRes.EventsURL != expectedEventsURL {
		t.Fatalf("unexpected events URL, expected %q, got %q", expectedEventsURL, helloRes.EventsURL)
	}

	// 2. Open events channel
	events, err := getEvents(baseURL, clientID.String())
	if err != nil {
		t.Fatalf(err.Error())
	}

	defer events.Close()

	expectEvent := func(t *testing.T, expected string) {
		t.Helper()

		ev := receiveEvent(t, events)
		if expectedEvent := expected + "\n"; ev != expectedEvent {
			t.Fatalf("expected %q, got %q", expectedEvent, ev)
		}
	}

	expectEvent(t, `: Beginning of the event stream`)
	expectEvent(t, `data: {"event":"keep-alive"}`)

	testEventPayload := struct{ Test int }{Test: 42}
	if err := handler.Send(clientID, "test", testEventPayload); err != nil {
		t.Fatalf("error sending event: %s", err)
	}

	expectEvent(t, `data: {"event":"test","payload":{"Test":42}}`)

	// 3. Receive message
	resultChan := make(chan interface{}, 1)
	go func() {
		defer close(resultChan)
		messageChan, err := handler.Listen(clientID)
		if err != nil {
			resultChan <- err
			return
		}
		resultChan <- <-messageChan
	}()

	testDataPayload := struct{ Hello string }{Hello: "World"}
	if err := postData(baseURL, clientID.String(), clientSecret.String(), testDataPayload); err != nil {
		t.Fatalf("error sending data payload: %s", err)
	}

	result := <-resultChan
	if err, ok := result.(error); ok {
		t.Fatalf("error listening on message: %s", err)
	}

	dataResult, ok := result.(json.RawMessage)
	if !ok {
		t.Fatalf("result is not a json.RawMessage (but a %T)", result)
	}

	if expectedData := `{"Hello":"World"}`; string(dataResult) != expectedData {
		t.Fatalf("expected %q, got %q", expectedData, string(dataResult))
	}
}

func postHello(baseURL, clientID, clientSecret string) (helloResult, error) {
	helloCommand := fmt.Sprintf(`{"name": "hello", "clientID":"%s", "secret":"%s"}`, clientID, clientSecret)
	res, err := http.Post(baseURL+"command", jsonContentType, strings.NewReader(helloCommand))
	if err != nil {
		return helloResult{}, fmt.Errorf("POST hello returned an error: %w", err)
	}

	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return helloResult{}, fmt.Errorf("unexpected status code, expected 200, got %d", res.StatusCode)
	}

	if contentType := res.Header.Get("Content-Type"); contentType != jsonContentType {
		return helloResult{}, fmt.Errorf("unexpected response content type, expected %q, got %q", jsonContentType, contentType)
	}

	var helloRes helloResult
	if err := json.NewDecoder(res.Body).Decode(&helloRes); err != nil {
		return helloResult{}, fmt.Errorf("error unmarshaling helloResult: %s", err)
	}

	return helloRes, nil
}

func getEvents(baseURL, clientID string) (io.ReadCloser, error) {
	res, err := http.Get(baseURL + "events/" + clientID)
	if err != nil {
		return nil, fmt.Errorf("GET events returned an error: %w", err)
	}

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code, expected 200, got %d", res.StatusCode)
	}

	if contentType := res.Header.Get("Content-Type"); contentType != eventStreamContentType {
		return nil, fmt.Errorf("unexpected response content type, expected %q, got %q", jsonContentType, contentType)
	}

	return res.Body, nil
}

func receiveEvent(t *testing.T, r io.Reader) string {
	for {
		line, err := bufio.NewReader(r).ReadString('\n')
		if err != nil {
			t.Fatalf("error reading event: %s", err)
		}

		if line == "\n" {
			continue
		}

		return line
	}
}

func postData(baseURL, clientID, clientSecret string, data interface{}) error {
	type clientDataCommand struct {
		Name     string      `json:"name"`
		ClientID string      `json:"clientId"`
		Secret   string      `json:"secret"`
		Payload  interface{} `json:"payload"`
	}

	var body bytes.Buffer
	cmd := clientDataCommand{Name: dataCommandName, ClientID: clientID, Secret: clientSecret, Payload: data}
	if err := json.NewEncoder(&body).Encode(cmd); err != nil {
		return fmt.Errorf("error encoding data command: %w", err)
	}

	res, err := http.Post(baseURL+"command", jsonContentType, bytes.NewReader(body.Bytes()))
	if err != nil {
		return fmt.Errorf("POST hello returned an error: %w", err)
	}

	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code, expected 200, got %d", res.StatusCode)
	}

	return nil
}

func TestClientID(t *testing.T) {
	validClientID := ClientID{0x26, 0xf1, 0xe1, 0x49, 0x53, 0x52, 0xe5, 0xc9, 0x63, 0x16, 0xeb, 0x6d, 0xa7, 0xcf, 0xa0, 0xdc}
	validClientIDString := "JvHhSVNS5cljFuttp8-g3A=="
	for _, tc := range []struct {
		Name     string
		Input    string
		Expected ClientID
	}{
		{
			Name:  "Invalid base64",
			Input: "this is not really base64",
		},
		{
			Name:  "Invalid length",
			Input: "UYm22c4yMsUJug==",
		},
		{
			Name:     "Valid ID",
			Input:    validClientIDString,
			Expected: validClientID,
		},
	} {
		t.Run(tc.Name, func(t *testing.T) {
			res, err := ClientIDFromString(tc.Input)
			if tc.Expected.IsZero() {
				if err == nil {
					t.Errorf("expected error")
				}
			} else {
				if res != tc.Expected {
					t.Errorf("expected %q, got %q", tc.Expected, res)
				}
			}
		})
	}

	t.Run("NewClientID", func(t *testing.T) {
		res, err := NewClientID()
		if err != nil {
			t.Errorf("NewClientID returned an error: %s", err)
		} else if res.IsZero() {
			t.Errorf("NewClientID returned a zero ID")
		}
	})

	t.Run("Marshal to string", func(t *testing.T) {
		if res := validClientID.String(); res != validClientIDString {
			t.Errorf("expected %q, got %q", validClientIDString, res)
		}
	})

	t.Run("Marshal to JSON", func(t *testing.T) {
		expected := `"` + validClientIDString + `"`
		res, err := json.Marshal(validClientID)
		if err != nil {
			t.Fatalf("failed to marshal to JSON: %s", err)
		}

		if string(res) != expected {
			t.Errorf("expected %q, got %q", expected, string(res))
		}
	})

	t.Run("Marshal to text", func(t *testing.T) {
		res, err := validClientID.MarshalText()
		if err != nil {
			t.Fatalf("failed to marshal to JSON: %s", err)
		}

		if string(res) != validClientIDString {
			t.Errorf("expected %q, got %q", validClientIDString, string(res))
		}
	})
}

func TestClientSecret(t *testing.T) {
	zeroClientSecret := ClientSecret{}
	validClientSecret := ClientSecret{0xae, 0x69, 0x29, 0x6c, 0x65, 0x7d, 0x73, 0xa9, 0x8c, 0xa3, 0x55, 0x17, 0x8a, 0x9e, 0xe3, 0x64, 0xb6, 0xb8, 0x84, 0x76, 0x18, 0xe7, 0x22, 0xe3, 0x72, 0x1e, 0x3f, 0x3e, 0xcd, 0xd6, 0x50, 0xf0, 0x0b, 0xef, 0x4d, 0x68, 0xed, 0xe2, 0xa3, 0x7a, 0xdb, 0x51, 0xea, 0x71, 0x3b, 0xfe, 0xa3, 0xcb, 0xcc, 0xd4, 0x9e, 0x98, 0xf3, 0xe7, 0x02, 0x5b, 0x19, 0xb3, 0xf0, 0x2a, 0x43, 0x9c, 0x7c, 0xe0}
	validClientSecretString := "rmkpbGV9c6mMo1UXip7jZLa4hHYY5yLjch4_Ps3WUPAL701o7eKjettR6nE7_qPLzNSemPPnAlsZs_AqQ5x84A=="

	for _, tc := range []struct {
		Name     string
		Input    string
		Expected ClientSecret
	}{
		{
			Name:  "Invalid base64",
			Input: "this is not really base64",
		},
		{
			Name:  "Invalid length",
			Input: "UYm22c4yMsUJug==",
		},
		{
			Name:     "Valid ID",
			Input:    validClientSecretString,
			Expected: validClientSecret,
		},
	} {
		t.Run(tc.Name, func(t *testing.T) {
			res, err := ClientSecretFromString(tc.Input)
			if tc.Expected == zeroClientSecret {
				if err == nil {
					t.Errorf("expected error")
				}
			} else {
				if res != tc.Expected {
					t.Errorf("expected %q, got %q", tc.Expected, res)
				}
			}
		})
	}

	t.Run("Marshal to string", func(t *testing.T) {
		if res := validClientSecret.String(); res != validClientSecretString {
			t.Errorf("expected %q, got %q", validClientSecretString, res)
		}
	})
}
