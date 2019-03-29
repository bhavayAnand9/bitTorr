'use strict';

const crypto = require('crypto');

let id = null;

// A peer id is random 20-byte string. Basically BT is the name of my client (bhavay-torrent), and 0001 is the version number.

module.exports.genId = () => {
	if(!id) {
		id = crypto.randomBytes(20);
		Buffer.from('-AT0001-').copy(id, 0);
	}
	return id;
};