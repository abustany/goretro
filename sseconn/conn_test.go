package sseconn

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestHelloKeepaliveGoodbye(t *testing.T) {
	keepAliveInterval = 200 * time.Millisecond

	handler := NewHandler("api")
	server := httptest.NewServer(handler)
	defer server.Close()

	baseURL := server.URL + "/api/"
	clientID, err := ClientIDFromString("VHUFS_CXZf1rn4IFPRY7fA==")
	if err != nil {
		t.Fatalf("error parsing client ID: %s", err)
	}

	clientSecret, err := ClientSecretFromString("R0sxpQUrf7Yc2_uqbQi6E_YJUXUbKqXM-v7dm_m9qe-LuEAtR-ST9IUvwn31_dgSFMeJf51XVhZA-1XhytCnjg==")
	if err != nil {
		t.Fatalf("error parsing client secret: %s", err)
	}

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
