const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');

let baseUrl = process.env.SMOKE_URL || null;
let managedServer = null;
let managedServerOutput = '';
const START_TIMEOUT_MS = 10_000;

function encodeQuery(params) {
  return new URLSearchParams(params).toString();
}

function splitPackets(payload) {
  if (!payload) return [];
  return payload.split('\x1e').filter(Boolean);
}

class SocketIoProbe {
  constructor(label) {
    this.label = label;
    this.sid = null;
    this.events = [];
  }

  async connect() {
    const openPayload = await this.get({
      EIO: '4',
      transport: 'polling',
      t: Date.now().toString(36)
    });
    const openPacket = splitPackets(openPayload).find((packet) => packet.startsWith('0'));
    assert(openPacket, `${this.label}: missing Engine.IO open packet`);

    const openData = JSON.parse(openPacket.slice(1));
    this.sid = openData.sid;
    assert(this.sid, `${this.label}: missing Engine.IO sid`);

    await this.post('40');
    await this.waitForPacket((packet) => packet.startsWith('40'), 5_000);
  }

  async emit(eventName, data) {
    await this.post(`42${JSON.stringify([eventName, data])}`);
  }

  async waitForEvent(eventName, predicate = () => true, timeoutMs = START_TIMEOUT_MS) {
    const existing = this.events.find((event) => event.name === eventName && predicate(event.data));
    if (existing) return existing.data;

    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      await this.pollOnce();
      const found = this.events.find((event) => event.name === eventName && predicate(event.data));
      if (found) return found.data;
    }

    const seen = this.events.map((event) => event.name).join(', ') || 'none';
    throw new Error(`${this.label}: timed out waiting for ${eventName}; saw ${seen}`);
  }

  async waitForAny(eventNames, timeoutMs = START_TIMEOUT_MS) {
    const wanted = new Set(eventNames);
    const existing = this.events.find((event) => wanted.has(event.name));
    if (existing) return existing;

    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      await this.pollOnce();
      const found = this.events.find((event) => wanted.has(event.name));
      if (found) return found;
    }

    const seen = this.events.map((event) => event.name).join(', ') || 'none';
    throw new Error(`${this.label}: timed out waiting for ${eventNames.join(' or ')}; saw ${seen}`);
  }

  async waitForPacket(predicate, timeoutMs) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const packets = splitPackets(await this.get({
        EIO: '4',
        transport: 'polling',
        sid: this.sid,
        t: Date.now().toString(36)
      }));

      for (const packet of packets) {
        this.handlePacket(packet);
        if (predicate(packet)) return packet;
      }
    }

    throw new Error(`${this.label}: timed out waiting for packet`);
  }

  async pollOnce() {
    const packets = splitPackets(await this.get({
      EIO: '4',
      transport: 'polling',
      sid: this.sid,
      t: Date.now().toString(36)
    }));

    for (const packet of packets) {
      this.handlePacket(packet);
    }
  }

  handlePacket(packet) {
    if (packet === '2') {
      this.post('3').catch((error) => {
        console.error(`${this.label}: failed to pong`, error);
      });
      return;
    }

    if (!packet.startsWith('42')) {
      return;
    }

    const [name, data] = JSON.parse(packet.slice(2));
    this.events.push({ name, data });
  }

  async get(params) {
    const response = await fetch(`${baseUrl}/socket.io/?${encodeQuery(params)}`);
    assert(response.ok, `${this.label}: GET failed ${response.status}`);
    return response.text();
  }

  async post(body) {
    const response = await fetch(`${baseUrl}/socket.io/?${encodeQuery({
      EIO: '4',
      transport: 'polling',
      sid: this.sid
    })}`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body
    });
    assert(response.ok, `${this.label}: POST failed ${response.status}`);
    return response.text();
  }
}

async function createRoom(gameType, roomCode) {
  const client = new SocketIoProbe(`${gameType}:${roomCode}`);
  await client.connect();
  await client.emit('createRoom', { roomCode, gameType });
  const created = await client.waitForEvent('roomCreated');
  assert.strictEqual(created.roomId, roomCode, `${gameType}: room id mismatch`);
  return client;
}

async function addBots(client, roomCode, count) {
  let players = [];
  for (let i = 0; i < count; i += 1) {
    await client.emit('addBot', { roomId: roomCode });
    players = await client.waitForEvent('playersUpdated', (updatedPlayers) => updatedPlayers.length >= i + 2);
  }
  return players;
}

async function startGame(client, roomCode, expectedEvent) {
  await client.emit('startGame', roomCode);
  return client.waitForAny(Array.isArray(expectedEvent) ? expectedEvent : [expectedEvent]);
}

async function smokeTruco(suffix) {
  const roomCode = `T${suffix}`;
  const client = await createRoom('truco', roomCode);
  await addBots(client, roomCode, 3);
  const started = await startGame(client, roomCode, 'gameStart');
  assert.strictEqual(started.data.hands.length, 4, 'Truco should deal four hands');
  assert(started.data.hands.every((hand) => hand.length === 3), 'Truco should deal three cards per player');
  await client.emit('playCard', { roomCode, playerIndex: 0, cardIndex: 0 });
  await client.waitForEvent('cardPlayed');
}

async function smokeGoFish(suffix) {
  const roomCode = `G${suffix}`;
  const client = await createRoom('go-fish', roomCode);
  await addBots(client, roomCode, 1);
  const started = await startGame(client, roomCode, 'gameStarted');
  assert.strictEqual(started.data.players.length, 2, 'Go Fish should start with two players');
  assert(started.data.players[0].hand.length > 0, 'Go Fish should send the local hand');
}

async function smokePoker(suffix) {
  const roomCode = `P${suffix}`;
  const client = await createRoom('poker', roomCode);
  await addBots(client, roomCode, 1);
  const started = await startGame(client, roomCode, 'gameStarted');
  assert.strictEqual(started.data.gamePhase, 'preflop', 'Poker should start preflop');
  assert.strictEqual(started.data.players.length, 2, 'Poker should start with two players');
  assert(started.data.pot > 0, 'Poker blinds should seed the pot');
}

async function smokeBlackjack(suffix) {
  const roomCode = `B${suffix}`;
  const client = await createRoom('blackjack', roomCode);
  const started = await startGame(client, roomCode, 'gameStarted');
  assert.strictEqual(started.data.gamePhase, 'betting', 'Blackjack should start in betting phase');
  await client.emit('placeBet', { roomId: roomCode, playerIndex: 0, amount: 5 });
  await client.waitForEvent('betPlaced');
  await client.waitForAny(['cardsDealt', 'gameState', 'turnChanged'], 15_000);
}

async function smokeWar(suffix) {
  const roomCode = `W${suffix}`;
  const client = await createRoom('war', roomCode);
  await addBots(client, roomCode, 1);
  const started = await startGame(client, roomCode, 'gameStarted');
  assert.strictEqual(started.data.gamePhase, 'playing', 'War should start in playing phase');
  await client.emit('startBattle', { roomId: roomCode });
  await client.waitForAny(['battleStarted', 'battleResolved', 'warStarted', 'gameOver'], 15_000);
}

async function smokeBattleship(suffix) {
  const roomCode = `S${suffix}`;
  const client = await createRoom('battleship', roomCode);
  await addBots(client, roomCode, 1);
  await client.emit('battleshipGameStart', { roomId: roomCode.toLowerCase() });
  const started = await client.waitForEvent('battleshipGameStart');
  assert.strictEqual(started.roomId, roomCode, 'Battleship should normalize room ids');
  assert.strictEqual(started.players.length, 2, 'Battleship should start with two players');
}

async function startManagedServer() {
  if (baseUrl) return;

  const port = process.env.SMOKE_PORT || String(3400 + Math.floor(Math.random() * 1000));
  baseUrl = `http://127.0.0.1:${port}`;
  const root = path.resolve(__dirname, '..');

  managedServer = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: port,
      NODE_ENV: 'test'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  managedServer.stdout.on('data', (chunk) => {
    managedServerOutput += chunk.toString();
  });
  managedServer.stderr.on('data', (chunk) => {
    managedServerOutput += chunk.toString();
  });

  const started = Date.now();
  while (Date.now() - started < 10_000) {
    if (managedServer.exitCode !== null) {
      throw new Error(`Managed smoke server exited early:\n${managedServerOutput}`);
    }

    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // Server is still booting.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out waiting for managed smoke server:\n${managedServerOutput}`);
}

function stopManagedServer() {
  if (managedServer && managedServer.exitCode === null) {
    managedServer.kill();
  }
}

async function main() {
  await startManagedServer();
  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  const tests = [
    smokeTruco,
    smokeGoFish,
    smokePoker,
    smokeBlackjack,
    smokeWar,
    smokeBattleship
  ];

  for (const test of tests) {
    await test(suffix);
    console.log(`OK ${test.name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => {
  stopManagedServer();
});
