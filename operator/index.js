const {match, matchReciver} = require("./../lib/match");
const {clipboard} = require("electron");
const Peer = require("peerjs");
const Guid = require("guid");

const userId = Guid.raw();

const peerConfig = require('./config/peer-server');

const peer = new Peer(userId, peerConfig);
let connection = null;
let callConnection = null;

let clientScreenBounds = null;

peer.on("call", async call => {

    callConnection = call;

    callConnection.on("close", () => {
        callConnection = null;
    });
   
    call.answer(new MediaStream());

    call.on('stream', function(stream) {
        document.querySelector('video').src = URL.createObjectURL(stream);
        document.querySelector('video').style.display = "block";
    });
})

const handleMessage = recivedPackage => {
    const message = matchReciver(data => data.message)

    console.log(recivedPackage)

    return match(recivedPackage)
        .on(message.is("SOURCES_RESPONSE"), updateSourcesList)
        .on(message.is("SOURCE_PREVIEW"), ({image, source_id, bounds}) => {
            document.getElementById("preload").style.display = "none";

            try {
                document.getElementById(source_id).src = image;
            } catch(e) {
                const sourceItem = document.createElement("p");
                const sourcePreview = document.createElement("img");
                const container = document.createElement("div");
    
                sourceItem.innerText = "НЕИЗВЕСТНЫЙ ИСТОЧНИК";
                sourceItem.id = `${source_id}_caption`;
                sourcePreview.id = source_id;
                sourcePreview.className = "preview";
                sourcePreview.src = image;
                
                container.addEventListener("click", async function() {
                    connection.send({
                        message: "GET_STREAM_BY_ID",
                        source_id: source_id
                    });

                    console.log(bounds)
                    clientScreenBounds = JSON.parse(bounds);
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

        connection.send({
            message: "SOURCES_RESPONSE_OK"
        })

        sources = JSON.parse(sources);

        document.getElementById("preload").style.display = "none";

        sources.forEach(source => {      
            const undefinedSource = document.getElementById(`${source.id}_caption`);

            if (undefinedSource) {
                undefinedSource.innerText = source.name;
            } else {
                const sourceItem = document.createElement("p");
                const sourcePreview = document.createElement("img");
                const container = document.createElement("div");

                sourceItem.innerText = source.name;
                sourcePreview.id = source.id;
                sourcePreview.className = "preview";
                sourcePreview.src = "https://cdn.dribbble.com/users/597558/screenshots/1998465/comp-2.gif";
                
                container.addEventListener("click", async function() {
                    connection.send({
                        message: "GET_STREAM_BY_ID",
                        source_id: source.id,
                        width:  document.getElementById("video_width").value,
                        height: document.getElementById("video_height").value
                    });

                    clientScreenBounds = source.bounds;
                });
                
                container.append(sourceItem);
                container.append(sourcePreview);
                
                container.style.display = "flex";
                container.style.flexDirection = "column";

                sources_list.append(container);
            }
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

            document.getElementById("preload").style.display = "block";
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

    document.getElementById("sources_list").innerHTML = `<img style="display: none" id="preload" src="https://cubicleninjas.com/wp-content/uploads/2018/01/bestweb__design2018__.gif">`;
    document.getElementById("control").style.display = "none";
    document.getElementById("connection").style.display = "flex";
})

document.getElementById("lock_button").addEventListener("click", () => {
    if (connection) {
        connection.send({
            message: "FREEZE_MOUSE"
        });
    }
})

document.querySelector('video').addEventListener("mousemove", (event) => {
    if (connection) {
        connection.send({
            message: "MOUSE_MOVE",
            x: event.offsetX * (+document.querySelector('video').videoWidth / +document.querySelector('video').offsetWidth) + (clientScreenBounds.x || 0),
            y: event.offsetY * (+document.querySelector('video').videoHeight / +document.querySelector('video').offsetHeight) + (clientScreenBounds.y || 0)
        })
    }
})

document.querySelector('video').addEventListener("mousedown", (event) => {
    if (connection) {
        connection.send({
            message: "MOUSE_DOWN",
            button: event.button == 0 ? "left" : "right",
            x: event.offsetX * (+document.querySelector('video').videoWidth / +document.querySelector('video').offsetWidth) + (clientScreenBounds.x || 0),
            y: event.offsetY * (+document.querySelector('video').videoHeight / +document.querySelector('video').offsetHeight) + (clientScreenBounds.y || 0)
        });
    }
})

document.querySelector('video').addEventListener("mouseup", (event) => {
    if (connection) {
        connection.send({
            message: "MOUSE_UP",
            button: event.button == 0 ? "left" : "right",
            x: event.offsetX * (+document.querySelector('video').videoWidth / +document.querySelector('video').offsetWidth) + (clientScreenBounds.x || 0),
            y: event.offsetY * (+document.querySelector('video').videoHeight / +document.querySelector('video').offsetHeight) + (clientScreenBounds.y || 0)
        });
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

const apiConfig = require("./config/api-server");
var xhr = new XMLHttpRequest();

xhr.open(apiConfig.method, `${apiConfig.protocol}://${apiConfig.host}:${apiConfig.port}${apiConfig.path}`, false);

xhr.send();

if (xhr.status != 200) {
  alert( xhr.status + ': ' + xhr.statusText );
} else {
  const contacts = JSON.parse(xhr.responseText);
  
  const colors = ["blue", "red", "purple", "green"];

  contacts.forEach(contact => {
      const names = contact.name.split(' ');

      document.getElementById("contacts").innerHTML += `
    <div onclick="document.getElementById('client_id').value = '${contact.guid}'" class="contact" style="display:flex; flex-direction: row; padding: 10px; font-size: 12px;">
      <div class="avatar ${ colors[Math.floor(contact.name.length % 2 + contact.name.length % 3)] }">${(names.length > 1 ? names[0][0] + names[1][0] : names[0][0]).toUpperCase()}</div>
      <div>
          <p style="margin-top: 5px; padding-left: 10px; font-size: 16px;">${contact.name}</p>
          <p style="margin-top: 0px; padding-left: 10px; font-size: 10px;">${contact.guid}</p>
      </div>
    </div>
      `;
  })
}