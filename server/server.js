const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const ExpressPeerServer = require('peer').ExpressPeerServer;
const fs = require('fs');

const host = process.env.host || "0.0.0.0";
const port = process.env.port || 9000;

const contactsPath = '/contacts';
const remotePath = '/remote';

const server = app.listen(port, host, err => {
	if (err) {
		return console.err(err);
	}

	console.log(`Server started on ${host}:${port}`);

	require('dns').lookup(require('os').hostname(), function (err, add, fam) {

		console.log(`http://${add}:${port}/`);

		const apiConfig = {
			host: add,
			port,
			path: contactsPath,
			protocol: "http",
			method: "POST"
		};

		const peerConfig = {
			host: add,
			port,
			path: remotePath,
			config: {
				iceServers: [
					{ urls: "stun:stun.sip.us:3478" }
				]
			}
		};

		fs.writeFile('api-server.json', JSON.stringify(apiConfig), err => {
			if (err) {
				return console.error(err);
			}

			console.log('API Server config wrote!');
		});
		fs.writeFile('peer-server.json', JSON.stringify(peerConfig), err => {
			if (err) {
				return console.error(err);
			}

			console.log('Peer Server config wrote!');
		});
	});
});

const options = {
    debug: true
}

const peerserver = ExpressPeerServer(server, options);

const Datastore = require('nedb');
const db = new Datastore({filename : 'database/contacts'});

db.loadDatabase();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res, next) { res.send('IT-Resource API server'); });
app.get(contactsPath, (req, res) => {
    db.find({}, (err, docs) => {
        res.send(docs);
    })
});

app.get('/config/api', (req, res) => {
	res.download('api-server.json');
})

app.get('/config/peer', (req, res) => {
	res.download('peer-server.json');
})

app.post(contactsPath, (req,res) => {
    db.insert({name: req.body.name, guid: req.body.guid }, (err, doc) => {
	console.log(`Insert { name: ${req.body.name}, guid: ${req.body.guid} }`);
        res.send(doc);
    });
});

app.use(remotePath, peerserver);
