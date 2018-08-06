const {match, matchReciver} = require("./../lib/match");
const {desktopCapturer, clibpboard} = require("electron");
const Robot = require("robotjs");
const Peer = require("peerjs");
const Guid = require("guid");

const userId = localStorage.UID || Guid.raw();

localStorage.UID = userId;

const peerConfig = {
    key: '8q4fi0nhuqt49529',
    config: {
        'iceServers': [
            { urls: 'stun:stun.sip.us:3478' }]
    }
};

const getMediaSources = (options = { types: ['screen'] }) => new Promise((resolve, reject) => {
    desktopCapturer.getSources(options, (error, sources) => error ? reject(error) : resolve(sources))
});

const getMediaStream = (source_id, width = 1920, height = 1080) => navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
        mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source_id,
            minWidth: width,
            maxWidth: width,
            minHeight: height,
            maxHeight: height
        }
    }
});

const peer = new Peer(userId, peerConfig);
let connection = null;
let callConnection = null;
let primaryСonnection = null;

const handleMessage = recivedPackage => {
    const message = matchReciver(data => data.message);

    console.log(recivedPackage);

    return match(recivedPackage)
        .on(message.is("HANDSHAKE"),            setConnection)
        .on(message.is("GET_SOURCES"),          getSources)
        .on(message.is("GET_STREAM_BY_ID"),     getStreamById)
        .on(message.is("MOUSE_MOVE"),           ({x, y}) => { Robot.moveMouse(x, y); })
        .on(message.is("MOUSE_DOWN"),           ({x, y, button}) => { Robot.moveMouse(x, y); Robot.mouseToggle("down", button); })
        .on(message.is("MOUSE_UP"),             ({x, y, button}) => { Robot.moveMouse(x, y); Robot.mouseToggle("up", button); })
        .on(message.is("MOUSE_SCROLL"),         ({deltaX, deltaY}) => { Robot.scrollMouse(deltaX, deltaY); })
        .on(message.is("KEY_UP"),               ({keyCode}) => { Robot.keyToggle(keyCode, "up"); })
        .on(message.is("KEY_DOWN"),             ({keyCode}) => { Robot.keyToggle(keyCode, "down"); })
        .on(message.is("INSERT_TO_CLIBPBOARD"), ({content}) => { clibpboard.writeText(content) })
        .on(message.is("CLOSE_CONNECTION"),     () => { 
            connection.close();
            callConnection.close();
            primaryСonnection.close();
        })
        .otherwise(() => console.log("!NONE"));

    function setConnection({peer_id}) {
        if (connection) {
            connection.close();
        }

        connection = peer.connect(peer_id);

        connection.on("close", () => {
            connection = null;
        });

        connection.on("open", () => {
            console.log(connection)
            
            connection.on("data", handleMessage);
            connection.on("close", () => {
                alert("Connection lost!");
                connection = null;
            })
        });
    }

    async function getSources() {
        const sources = await getMediaSources();

        const sourcesResponse = {
            message: "SOURCES_RESPONSE",
            sources: JSON.stringify(sources)
        };

        console.log(sourcesResponse);
        connection.send(sourcesResponse);

        getSourcesPreview(sources);

    }

    async function getStreamById({source_id, width, height}) {
        const stream = await getMediaStream(source_id, width, height);

        callConnection = peer.call(connection.peer, stream);

        callConnection.on("close", () => {
            callConnection = null;
        });
    }

    async function getSourcesPreview(sources) {
        sources.forEach(source => {
            const canvas = document.createElement("canvas");
            const video = document.createElement("video");
    
            getMediaStream(source.id).then(stream => {
                video.srcObject = stream;
                video.play();
    
                video.onloadedmetadata = () => {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
    
                    canvas.getContext("2d").drawImage(video, 0, 0);
                    video.remove();
    
                    const preview = canvas.toDataURL("image/png");
    
                    connection.send({
                        message: "SOURCE_PREVIEW",
                        image: preview,
                        source_id: source.id
                    })
                };
            }).catch(console.error)
        })
    }
};

peer.on("open", id => {
    peer.on("connection", conn => {
        primaryСonnection = conn;

        primaryСonnection.on("data", handleMessage);

        primaryСonnection.on("close", () => {
            primaryСonnection = null;
        });
    });
});

user_id.innerText = userId;