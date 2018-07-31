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

const handleMessage = recivedPackage => {
    const message = matchReciver(data => data.message)

    console.log(recivedPackage)

    return match(recivedPackage)
        .on(message.is("SOURCES_RESPONSE"), updateSourcesList)
        .on(message.is("SOURCE_PREVIEW"), ({image, source_id}) => {
            document.getElementById(source_id).src = image;
        })
        .otherwise(() => console.log(recivedPackage, "NONE"))

    function updateSourcesList({sources}) {
        sources = JSON.parse(sources);

        sources.forEach(source => {      
            const sourceItem = document.createElement("p");
            const sourcePreview = document.createElement("img");
            const container = document.createElement("div");

            sourceItem.innerText = source.name;
            sourcePreview.id = source.id;
            sourcePreview.className = "preview";
            
            container.addEventListener("click", async function() {
                connection.send({
                    message: "GET_STREAM_BY_ID",
                    source_id: source.id
                });
            });
            
            container.append(sourceItem);
            container.append(sourcePreview);
            
            container.style.display = "flex";
            container.style.flexDirection = "column";

            sources_list.append(container);
        });
    }
};

document.getElementById("connect_button").addEventListener("click", function() {
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

document.querySelector('video').addEventListener("mousemove", (event) => {
    connection.send({
        message: "MOUSE_MOVE",
        x: event.offsetX * (+document.querySelector('video').videoWidth / +document.querySelector('video').offsetWidth),
        y: event.offsetY * (+document.querySelector('video').videoHeight / +document.querySelector('video').offsetHeight)
    })
})

document.querySelector('video').addEventListener("mousedown", (event) => {
    connection.send({
        message: "MOUSE_DOWN",
        button: event.button == 0 ? "left" : "right",
        x: event.offsetX * (+document.querySelector('video').videoWidth / +document.querySelector('video').offsetWidth),
        y: event.offsetY * (+document.querySelector('video').videoHeight / +document.querySelector('video').offsetHeight)
    })
})

document.querySelector('video').addEventListener("mouseup", (event) => {
    connection.send({
        message: "MOUSE_UP",
        button: event.button == 0 ? "left" : "right",
        x: event.offsetX * (+document.querySelector('video').videoWidth / +document.querySelector('video').offsetWidth),
        y: event.offsetY * (+document.querySelector('video').videoHeight / +document.querySelector('video').offsetHeight)
    })
})

document.querySelector('video').addEventListener("keydown", keyDown);
document.body.addEventListener("keydown", keyDown);

document.querySelector('video').addEventListener("wheel", event => {
    connection.send({
        message: "MOUSE_SCROLL",
        deltaX: event.deltaX,
        deltaY: event.deltaY
    })
});

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
        keyCode: event.key.toLowerCase().replace("arrow", "")
    })
}

function keyUp(event) {
    connection.send({
        message: "KEY_UP",
        keyCode: event.key.toLowerCase().replace("arrow", "")
    })
}

(async function() {

    const li = document.createElement("p");
    li.innerText = source.name;

    const container = document.createElement("div");

    container.append(li);
    container.append(canvas);

    container.style.display = "flex";
    container.style.flexDirection = "column";

    sources_list.append(container);

})()