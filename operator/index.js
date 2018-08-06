const {match, matchReciver} = require("./../lib/match");
const {clipboard} = require("electron");
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
let callConnection = null;

peer.on("call", async call => {

    callConnection = call;

    callConnection.on("close", () => {
        callConnection = null;
    });

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
            try {
                document.getElementById(source_id).src = image;
            } catch(e) {
                const sourceItem = document.createElement("p");
                const sourcePreview = document.createElement("img");
                const container = document.createElement("div");
    
                sourceItem.innerText = "НЕИЗВЕСТНЫЙ ИСТОЧНИК";
                sourcePreview.id = source_id;
                sourcePreview.className = "preview";
                sourcePreview.src = image;
                
                container.addEventListener("click", async function() {
                    connection.send({
                        message: "GET_STREAM_BY_ID",
                        source_id: source_id
                    });
                });
                
                container.append(sourceItem);
                container.append(sourcePreview);
                
                container.style.display = "flex";
                container.style.flexDirection = "column";
    
                sources_list.append(container);
            }
        })
        .otherwise(() => console.log(recivedPackage, "NONE"))

    function updateSourcesList({sources}) {
        console.log(sources);
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
                    source_id: source.id,
                    width:  document.getElementById("video_width").value,
                    height: document.getElementById("video_height").value
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
    if (connection) {
        connection.close();
    }
    
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

        document.getElementById("connection").style.display = "none";
        document.getElementById("control").style.display = "flex";
        document.getElementById("control").style.flexDirection = "column"; 
        document.getElementById("control").style.alignItems = "center";

        connection.on("close", () => {
            alert("Connection closed!");
            connection = null;
        });
    })
})

document.getElementById("disconnect_button").addEventListener("click", () => {
    if (connection) {
        connection.send({
            message: "CLOSE_CONNECTION"
        });
    }
})

document.querySelector('video').addEventListener("mousemove", (event) => {
    if (connection) {
        connection.send({
            message: "MOUSE_MOVE",
            x: event.offsetX * (+document.querySelector('video').videoWidth / +document.querySelector('video').offsetWidth),
            y: event.offsetY * (+document.querySelector('video').videoHeight / +document.querySelector('video').offsetHeight)
        })
    }
})

document.querySelector('video').addEventListener("mousedown", (event) => {
    if (connection) {
        connection.send({
            message: "MOUSE_DOWN",
            button: event.button == 0 ? "left" : "right",
            x: event.offsetX * (+document.querySelector('video').videoWidth / +document.querySelector('video').offsetWidth),
            y: event.offsetY * (+document.querySelector('video').videoHeight / +document.querySelector('video').offsetHeight)
        });
    }
})

document.querySelector('video').addEventListener("mouseup", (event) => {
    if (connection) {
        connection.send({
            message: "MOUSE_UP",
            button: event.button == 0 ? "left" : "right",
            x: event.offsetX * (+document.querySelector('video').videoWidth / +document.querySelector('video').offsetWidth),
            y: event.offsetY * (+document.querySelector('video').videoHeight / +document.querySelector('video').offsetHeight)
        });

        connection.close();
        callConnection.close();
    }
})

document.querySelector('video').addEventListener("keydown", keyDown);
document.body.addEventListener("keydown", keyDown);

document.querySelector('video').addEventListener("wheel", event => {
    if (connection) {
        connection.send({
            message: "MOUSE_SCROLL",
            deltaX: event.deltaX,
            deltaY: event.deltaY
        });
    }
});

document.querySelector('video').addEventListener("keyup", keyUp);
document.body.addEventListener("keyup", keyUp);

function keyDown(event) {
    if (connection) {
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
}

function keyUp(event) {
    if (connection) {
        connection.send({
            message: "KEY_UP",
            keyCode: event.key.toLowerCase().replace("arrow", "")
        })
    }
}
