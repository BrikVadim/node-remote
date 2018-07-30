const {match, matchReciver} = require("./../lib/match");
const {desktopCapturer, clipboard} = require("electron");
const Peer = require("peerjs");
const Guid = require("guid");

const userId = Guid.raw();

const peerConfig = {
    key: '8q4fi0nhuqt49529',
    config: {
        'iceServers': [
            {'urls': 'stun:stun.sip.us:3478'},
        ]
    }
};

const peer = new Peer(userId, peerConfig);
let connection = null;

peer.on("call", async call => {

    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
    }).then(stream => {
        call.answer(stream);

        call.on('stream', function(stream) {
            document.querySelector('video').src = URL.createObjectURL(stream);
        });
    }).catch(console.error)

})

const getMediaSources = (options = { types: ['screen'] }) => new Promise((resolve, reject) => {
    desktopCapturer.getSources(options, (error, sources) => error ? reject(error) : resolve(sources))
});

const handleMessage = recivedPackage => {
    const message = matchReciver(data => data.message)

    console.log(recivedPackage)

    return match(recivedPackage)
        .on(message.is("SOURCES_RESPONSE"), updateSourcesList)
        .otherwise(() => console.log(recivedPackage, "NONE"))

    function updateSourcesList({sources}) {
        sources = JSON.parse(sources);

        sources.forEach(source => {
            const sourceItem = document.createElement("li");

            sourceItem.innerText = source.name;

            sourceItem.addEventListener("click", async function() {
                connection.send({
                    message: "GET_STREAM_BY_ID",
                    source_id: source.id
                });
            });

            sources_list.append(sourceItem);
        });
    }
};

connect_button.addEventListener("click", function() {
    connection = peer.connect(client_id.value);

    connection.on("open", function() {
        peer.on('connection', function(duplexConnection) { 
            duplexConnection.on("data", handleMessage);

            connection.send({
                message: "GET_SOURCES"
            });
         });

        connection.send({
            message: "HANDSHAKE",
            peer_id: userId
        });
    })
})

user_id.innerText = userId;

document.querySelector('video').addEventListener("mousemove", (event) => {
    connection.send({
        message: "MOUSE_MOVE",
        x: event.offsetX,
        y: event.offsetY
    })
})

document.querySelector('video').addEventListener("mousedown", (event) => {
    connection.send({
        message: "MOUSE_DOWN",
        button: event.button == 0 ? "left" : "right",
        x: event.offsetX,
        y: event.offsetY
    })
})

document.querySelector('video').addEventListener("mouseup", (event) => {
    connection.send({
        message: "MOUSE_UP",
        button: event.button == 0 ? "left" : "right",
        x: event.offsetX,
        y: event.offsetY
    })
})

document.querySelector('video').addEventListener("keydown", keyDown);
document.body.addEventListener("keydown", keyDown);

document.querySelector('video').addEventListener("keyup", keyUp);
document.body.addEventListener("keyup", keyUp);

function keyDown(event) {

    if (event.ctrlKey && event.which == 86) {
        connection.send({
            message: "INSERT_TO_CLIPBOARD",
            content: clipboard.readText()
        })

        return;
    }

    connection.send({
        message: "KEY_DOWN",
        keyCode: event.key
    })
}

function keyUp(event) {
    connection.send({
        message: "KEY_UP",
        keyCode: event.key
    })
}