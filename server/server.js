const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const ExpressPeerServer = require('peer').ExpressPeerServer;

const server = app.listen(9000);

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
app.get('/contacts', (req, res) => {
    db.find({}, (err, docs) => {
        res.send(docs);
    })
});

app.post('/contacts', (req,res) => {
    db.insert({name: req.body.name, guid: req.body.guid }, (err, doc) => {
        res.send(doc);
    });
});

app.use('/remote', peerserver);