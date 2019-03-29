'use strict';

const fs = require('fs');
const bencode = require('bencode'); //for encoding and decoding bencoded data

module.exports.open = (filepath) => {
  return bencode.decode(fs.readFileSync(filepath));
};

module.exports.size = torrent => {
  // ...
};

module.exports.infoHash = torrent => {
  // ...
};