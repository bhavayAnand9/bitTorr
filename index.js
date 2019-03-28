//SOME NOTES
// Application is using UDP protocol because nearly all new torrents are.
//



'use strict'
const fs = require('fs');
const bencode = require('bencode');	//for encoding and decoding bencoded data

const dgram = require('dgram');	//nodejs dgram module for implementing UDP datagram sockets
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;	//nodejs module for URL resolution and parsing

const puppyFile = fs.readFileSync('puppy.torrent')
const torrent = bencode.decode(puppyFile);
// console.log(torrent.announce.toString('utf8'));

//takes a URL string, parses it, and returns a URL object.
const url = urlParse(torrent.announce.toString('utf8'));

//creates a UDP dataram socket using udp4(IPv4 address)
const socket = dgram.createSocket('udp4');

const myMsg = Buffer.from('hello?', 'utf8');

//callback only if an error occured
socket.send(myMsg, 0, myMsg.length, url.port, url.host, (err) => {
	console.log(`An error occured while sending data : ${myMsg}, to host : ${url.host} at port : ${url.port}`);
	socket.close();
});

//message event registered
//msg: The message
//rinfo: Remote address information
socket.on('message', (msg, rinfo) => {
	console.log(`message is, ${msg}`);
	console.log(`rinfo: ${rinfo}`);
});

