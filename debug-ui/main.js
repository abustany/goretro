"use strict";

const logArea = document.getElementById('log');

const nicknameInput = document.getElementById('nickname');
const identifyButton = document.getElementById('identify');

const roomNameInput = document.getElementById('room-name');
const createRoomButton = document.getElementById('create-room');
const joinRoomButton = document.getElementById('join-room');

function log(msg) {
    logArea.innerHTML += msg;
    logArea.innerHTML += '<br>';
}

function main() {
    log('Starting up');

    const clientId = generateID(16);
    const secret = generateID(64)
    log('Client ID is ' + clientId);

    identifyButton.addEventListener('click', () => onIdentify(clientId, secret));
    createRoomButton.addEventListener('click', () => onCreateRoom(clientId, secret));
    joinRoomButton.addEventListener('click', () => onJoinRoom(clientId, secret));

    rawCommand({name: 'hello', clientId: clientId, secret: secret}).
        then(res => connected(clientId, res.eventsUrl)).
        catch(err => log('Error while connecting: ' + err.message));
}

function rawCommand(command) {
    return fetch('/api/command', {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
    }).then(res => {
        if (res.status !== 200) {
            throw new Error('Unexpected status code: ' + res.status);
        }

        return res.json()
    }).catch(e => {
        log('API command error: ' + e.message);
        throw e;
    });
}

function dataCommand(clientId, secret, payload) {
    return rawCommand({name: 'data', clientId: clientId, secret: secret, payload: payload})
}

function connected(clientId, eventsUrl) {
    log('Connected, events URL: ' + eventsUrl);

    const eventSource = new EventSource(eventsUrl);
    eventSource.onerror = function(err) {
        console.error('event source error', err);
        log('Event source error: ' + JSON.stringify(err));
    }
    eventSource.onopen = function() {
        log('Event source connected');

        identifyButton.removeAttribute('disabled');
        createRoomButton.removeAttribute('disabled');
        joinRoomButton.removeAttribute('disabled');
    }
    eventSource.onmessage = function(evt) {
        log('Received event: ' + evt.data);

        const parsed = JSON.parse(evt.data);

        if (parsed.event === 'keep-alive') {
            return;
        }
    }
}

function onIdentify(clientId, secret) {
    log('Setting nickname')
    dataCommand(clientId, secret, {name: 'identify', nickname: nicknameInput.value});
}

function onCreateRoom(clientId, secret) {
    log('Creating room')
    dataCommand(clientId, secret, {name: 'create-room', roomName: roomNameInput.value});
}

function onJoinRoom(clientId, secret) {
    log('Joining room')
    dataCommand(clientId, secret, {name: 'join-room', roomId: roomNameInput.value});
}

function generateID(length) {
    const data = new Uint8Array(length);
    window.crypto.getRandomValues(data);
    return btoa(String.fromCharCode.apply(null, data)).replace(/\+/g, '-').replace(/\//g, '_');
}

window.onload = main;
