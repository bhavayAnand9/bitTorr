//SOME NOTES
//UDP Tracker Protocol for BitTorrent http://www.bittorrent.org/beps/bep_0015.html

/*
	Some interesting theory stuff to understand the UDP tracker protocol : 
	
	CONNECT (to obtain a connection ID)

		connect request:

			Offset  Size            Name            Value
			0       64-bit integer  protocol_id     0x41727101980 // magic constant
			8       32-bit integer  action          0 // connect
			12      32-bit integer  transaction_id

			1. Choose a random transaction ID.
			2. Fill the connect request structure.
			3. Send the packet.

		connect response:
		
			Offset  Size            Name            Value
			0       32-bit integer  action          0 // connect
			4       32-bit integer  transaction_id
			8       64-bit integer  connection_id	

			1. Receive the packet.
			2. Check whether the packet is at least 16 bytes and trasaction ID is the one you chose.
			3. Check whether the action is connect.
			4. store the connection ID for future use.

	ANNOUNCE 

		IPv4 announce request:

			Offset  Size    Name    Value
			0       64-bit integer  connection_id
			8       32-bit integer  action          1 // announce
			12      32-bit integer  transaction_id
			16      20-byte string  info_hash
			36      20-byte string  peer_id
			56      64-bit integer  downloaded
			64      64-bit integer  left
			72      64-bit integer  uploaded
			80      32-bit integer  event           0 // 0: none; 1: completed; 2: started; 3: stopped
			84      32-bit integer  IP address      0 // default
			88      32-bit integer  key
			92      32-bit integer  num_want        -1 // default
			96      16-bit integer  port

			1. Choose a random transaction ID.
			2. Fill the announce req structure.
			3. Send the packet.

		IPv4 announce response:

			Offset      Size            Name            Value
			0           32-bit integer  action          1 // announce
			4           32-bit integer  transaction_id
			8           32-bit integer  interval
			12          32-bit integer  leechers
			16          32-bit integer  seeders
			20 + 6 * n  32-bit integer  IP address
			24 + 6 * n  16-bit integer  TCP port
				
			1. Receive the packet.
			2. Check packet is at least 20 bytes, trasaction ID is equal to the one you chose.
			3. Check action is announce.
			4. Do not announce until interval seconds.

	SCRAPE

		scrape request:

			Offset          Size            Name            Value
			0               64-bit integer  connection_id
			8               32-bit integer  action          2 // scrape
			12              32-bit integer  transaction_id
			16 + 20 * n     20-byte string  info_hash
		
			1. Choose a random transaction ID.
			2. Fill the scrape request structure.
			3. Send the packet.

		scrape response:
		
			Offset      Size            Name            Value
			0           32-bit integer  action          2 // scrape
			4           32-bit integer  transaction_id
			8 + 12 * n  32-bit integer  seeders
			12 + 12 * n 32-bit integer  completed
			16 + 12 * n 32-bit integer  leechers	

			If the tracker encounters an error, it might send an error packet.

			1. Receive the packet.
			2. Check whether the packet is at least 8 bytes.
			3. Check whether the transaction ID is equal to the one you chose.

	ERROR
		
		error response:
			Offset  Size            Name            Value
			0       32-bit integer  action          3 // error
			4       32-bit integer  transaction_id
			8       string  message		

Hope it helps
*/

const dgram = require('dgram'); //nodejs dgram module for implementing UDP datagram sockets
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse; //nodejs module for URL resolution and parsing
const crypto = require('crypto'); //to help us create a random number for our buffer

const torrentParser = require('./torrent-parser');
const util = require('./util');

module.exports.getPeers = (torrent, callback) => {

	const socket = dgram.createSocket('udp4'); //creates an UDP dataram socket using udp4(IPv4 address)
	const url = torrent.announce.toString('utf8');


	//1. send connect request

	//udpSend is just a convenience function that mostly just calls socket.send
	//respType will check if the response was for the connect or the announce request. Since both responses come through the same socket, we want a way to distinguish them.
	
	udpSend(socket, buildConnReq(), url, (err) => {
		console.log(`An error occured. ERROR: ${err}`);
		socket.close();
	});


	//message event registered
	//msg: The message
	//rinfo: Remote address information
	socket.on('message', (response, rinfo) => {
		if (respType(response) === 'connect') {
			//2. receive and parse connect response
			const connResp = parseConnResp(response);
			//3. send announce request
			const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
			udpSend(socket, announceReq, url);
		}
		else if (respType(response) === 'announce') {
			//4. parse announce response
			const announceResp = parseAnnounceResp(response);
			//5. pass peers to callback
			callback(announceResp.peers);
		}

	});

};

function udpSend(socket, message, rawUrl, callack) {
	const url = urlParse(rawUrl); //takes a URL string, parses it, and returns a URL object.

	//callback only if an error occured
	socket.send(message, 0, message.length, url.port, url.host, callback);
}

function respType(resp){
	//...
}

// Builds up a connect req structure (ln 9)
//writeUInt32BE writes unsigned 32 bit integer in big-endian format
function buildConnReq(){
	const buf = Buffer.alloc(16);

	//connection id
	buf.writeUInt32BE(0x417, 0);
	buf.writeUInt32BE(0x27101980, 4);

	//action
	buf.writeUInt32BE(0, 8);

	//transaction id
	crypto.randomBytes(4).copy(buf, 12);

	return buf;
}

//readUInt32BE can't read 64 bit connexID so we used slice to leave it as a buffer.
function parseConnResp(resp) {
	return {
		action: resp.readUInt32BE(0),
		transactionId: resp.readUInt32BE(4),
		connectionId: resp.slice(8)
	}
}


function buildAnnounceReq(connId, torrent, port=6881) {
	const buf = Buffer.allocUnsafe(98);

	//connection id
	connId.copy(buf, 0);

	//action
	buf.writeUInt32BE(1, 8);

	//transaction id
	crypto.randomBytes(4).copy(buf, 16);

	//info hash
	torrentParser.infoHash(torrent).copy(buf, 16);

	//peer id
	//used to uniquely identify your client. logic is in util file.
	util.genId().copy(buf, 36);

	//downloaded
	Buffer.alloc(8).copy(buf, 56);

	//left
	torrentParser.size(torrent).copy(buf, 64);

	//uploaded
	Buffer.alloc(8).copy(buf, 72);

	//event
	buf.writeUint32BE(0, 80);

	//ip address
	buf.writeUint32BE(0, 80);

	//key
	crypto.randomBytes(4).copy(buf, 88);

	//num want
	buf.writeInt32BE(-1, 92);

	//port range 6881-6889
	buf.writeUInt16BE(port, 96);

	return buf;
}

function parseAnnounceResp(resp) {
	function group(iterable, groupSize) {
	    let groups = [];
	    for (let i = 0; i < iterable.length; i += groupSize) {
	      groups.push(iterable.slice(i, i + groupSize));
	    }
	    return groups;
	}

	return {
	    action: resp.readUInt32BE(0),
	    transactionId: resp.readUInt32BE(4),
	    leechers: resp.readUInt32BE(8),
	    seeders: resp.readUInt32BE(12),
	    peers: group(resp.slice(20), 6).map(address => {
	      return {
	        ip: address.slice(0, 4).join('.'),
	        port: address.readUInt16BE(4)
	      }
	    })
	}
}