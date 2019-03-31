'use strict';

const net = require('net');
const Buffer = require('buffer').Buffer;
const tracker = require('./tracker');
const Pieces = require('./pieces')

module.exports = torrent => {
  const requested = [];	
  tracker.getPeers(torrent, peers => {
    // 1
    const pieces = new Pieces(torrent.info.pieces.length/20);
    peers.forEach(peer => download(peer, torrent, requested));
  });
};

function download(peer, torrent) {
  const queue = [];	
  const socket = new net.Socket();
  socket.on('error', console.log);
  socket.connect(peer.port, peer.ip, () => {
    // 1
    socket.write(message.buildHandshake(torrent));
  });
  // 2
  const queue = {choked: true, queue: []};
  onWholeMsg(socket, msg => msgHandler(msg, socket, requested, queue));
}

// 2
function msgHandler(msg, socket, pieces, queue) {
  if (isHandshake(msg)) {
    socket.write(message.buildInterested());
  } else {
    const m = message.parse(msg);

    if (m.id === 0) chokeHandler();
    if (m.id === 1) unchokeHandler(socket, pieces, queue);
    if (m.id === 4) haveHandler(m.payload, socket, requested, queue);
    if (m.id === 5) bitfieldHandler(m.payload);
    if (m.id === 7) pieceHandler(m.payload, socket, requested, queue);
  }
}

// 3
function isHandshake(msg) {
  return msg.length === msg.readUInt8(0) + 49 &&
         msg.toString('utf8', 1) === 'BitTorrent protocol';
}

function onWholeMsg(socket, callback) {
  let savedBuf = Buffer.alloc(0);
  let handshake = true;

  socket.on('data', recvBuf => {
    // msgLen calculates the length of a whole message
    const msgLen = () => handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
    savedBuf = Buffer.concat([savedBuf, recvBuf]);

    while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
      callback(savedBuf.slice(0, msgLen()));
      savedBuf = savedBuf.slice(msgLen());
      handshake = false;
    }
  });
}

function chokeHandler() { ... }

function unchokeHandler() {
	queue.choked = false;
	requestPiece(socket, pieces, queue);
}

function haveHandler(payload) {
  const pieceIndex = payload.readUInt32BE(0);
  queue.push(pieceIndex);
  if(queue.length === 1){
  	requestPiece(socket, requested, queue);
  } 
}

function bitfieldHandler(payload) { ... }

function pieceHandler(payload, socket, requested, queue) {
  queue.shift();
  requestPiece(socket, requested, queue);
}

function requestPiece(socket, pieces, queue) {
  //2
  if (queue.choked) return null;

  while (queue.queue.length) {
    const pieceIndex = queue.shift();
    if (pieces.needed(pieceIndex)) {
      // need to fix this
      socket.write(message.buildRequest(pieceIndex));
      pieces.addRequested(pieceIndex);
      break;
    }
  }
}
