//SOME NOTES
// Application is using UDP protocol because nearly all new torrents are.


'use strict';

const fs = require('fs');
const bencode = require('bencode');  //for encoding and decoding bencoded data
const tracker = require('./tracker');
const torrentParser = require('./torrent-parser');

const torrent = torrentParser.open('puppy.torrent');

tracker.getPeers(torrent, peers => {
  console.log('list of peers: ', peers);
});