'use strict';

const net = require('net');
const Buffer = require('buffer').Buffer;
const tracker = require('./tracker');

module.exports = torrent => {
	tracker.getPeers(torrent, peers => {
		
	});
};