const {match, matchReciver} = require("./../lib/match");
const {desktopCapturer} = require("electron");
const Robot = require("robotjs");
const Peer = require("peerjs");
const Guid = require("guid");

const userId = Guid.raw();

const peerConfig = {
    key: '8q4fi0nhuqt49529',
    config: {
        'iceServers': [
            { url: 'stun:stun.l.google.com:19302' }]
    }
};

const getMediaSources = (options = { types: ['screen'] }) => new Promise((resolve, reject) => {
    desktopCapturer.getSources(options, (error, sources) => error ? reject(error) : resolve(sources))
});

const getMediaStream = source_id => navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
        mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source_id,
            minWidth: 800,
            maxWidth: 1920,
            minHeight: 600,
            maxHeight: 1080
        }
    }
});

const peer = new Peer(userId, peerConfig);
let connection = null;

const handleMessage = recivedPackage => {
    const message = matchReciver(data => data.message);

    console.log(recivedPackage);

    return match(recivedPackage)
        .on(message.is("HANDSHAKE"),        setConnection)
        .on(message.is("GET_SOURCES"),      getSources)
        .on(message.is("GET_STREAM_BY_ID"), getStreamById)
        .on(message.is("MOUSE_MOVE"), ({x, y}) => { console.log("MOVE!"); Robot.moveMouse(x, y); })
        .otherwise(() => console.log("!NONE"));

    function setConnection({peer_id}) {
        connection = peer.connect(peer_id);

        connection.on("open", () => {
            console.log(connection)
            
            connection.on("data", handleMessage);
        });
    }

    async function getSources() {
        const sources = await getMediaSources();

        const sourcesResponse = {
            message: "SOURCES_RESPONSE",
            sources: JSON.stringify(sources)
        };

        connection.send(sourcesResponse);
    }

    async function getStreamById({source_id}) {
        const stream = await getMediaStream(source_id);

        peer.call(connection.peer, stream);
    }
};

peer.on("open", id => {
    peer.on("connection", primaryСonnection => {
        primaryСonnection.on("data", handleMessage);
    });
});

user_id.innerText = userId;