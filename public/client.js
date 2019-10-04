// getting dom elements
var divSelectRoom = document.getElementById("selectRoom");
var divConsultingRoom = document.getElementById("consultingRoom");
var inputRoomNumber = document.getElementById("roomNumber");
var btnGoRoom = document.getElementById("goRoom");
var localVideo = document.getElementById("localVideo");
var remoteVideo = document.getElementById("remoteVideo");

// variables
var roomNumber;
var localStream;
var broadcasterStream;
var studentStreams = [];
// A STUDENT ONLY NEED ONE RTCPeerConnection to connect with the only teacher in the room. If a student can see
// many teachers then this logic need to change
var rtcPeerConnection; 
var rtcPeerConnections = [] // REALLY IMPORTANT: THE BROADCASTER NEEDS A DISTINCT RTCPeerConnection FOR EACH STUDENT
var currentStudentIndex = 0 // To access elements in rtcPeerConnections. How to improve: store each connection
// with a student as key:value pair with key is the id of the student, value is the rtcPeerConnection

// TO SUM UP: THE WHOLE PROCESS OF MANAGING RTCPeerConnection ABOVE IS A MESS. NEED FIXING IF HAVE TIME !!!

var iceServers = {
    'iceServers': [
        { 'urls': 'stun:stun.services.mozilla.com' },
        { 'urls': 'stun:stun.l.google.com:19302' }
    ]
}
var streamConstraints = { audio: true, video: true };
var isBroadcaster;

// Let's do this
var socket = io();

btnGoRoom.onclick = function () {
    if (inputRoomNumber.value === '') {
        alert("Please type a room number")
    } else {
        roomNumber = inputRoomNumber.value;
        socket.emit('create or join', roomNumber);
        divSelectRoom.style = "display: none;";
        divConsultingRoom.style = "display: block;";
    }
};

// message handlers
socket.on('created', function (room) {
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        localStream = stream;
        localVideo.srcObject = stream;
        isBroadcaster = true;
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
    });
    console.log(socket.id, '(me) is the broadcaster');
});

socket.on('joined', function (room) {
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        localStream = stream;
        localVideo.srcObject = stream;
        isBroadcaster = false;
        socket.emit('ready', roomNumber);
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
    });
    console.log(socket.id, '(me) is a student');
});

socket.on('candidate', function (event) {
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    if (!isBroadcaster){
        rtcPeerConnection.addIceCandidate(candidate);
    }
    else{
        rtcPeerConnections[currentStudentIndex].addIceCandidate(candidate);
    }
    
});

socket.on('ready', function () {
    if (isBroadcaster) {
        let rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.ontrack = onAddStream;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        rtcPeerConnections.push(rtcPeerConnection);
        console.log(rtcPeerConnections);
        rtcPeerConnection.createOffer()
            .then(sessionDescription => {
                
                rtcPeerConnection.setLocalDescription(sessionDescription);
                socket.emit('offer', {
                    type: 'offer',
                    sdp: sessionDescription,
                    room: roomNumber
                });
            })
            .catch(error => {
                console.log(error)
            })
        
        console.log(socket.id, " is handling the ready event (so I'm supposed to be the teacher)"
                    + " which means I'm creating offer")
    }
    
});

socket.on('offer', function (event) {
    if (!isBroadcaster) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.ontrack = onAddStream;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
        rtcPeerConnection.createAnswer()
            .then(sessionDescription => {
                rtcPeerConnection.setLocalDescription(sessionDescription);
                socket.emit('answer', {
                    type: 'answer',
                    sdp: sessionDescription,
                    room: roomNumber
                });
            })
            .catch(error => {
                console.log(error)
            })
            console.log(socket.id, " is handling the offer event (so I'm supposed to be a student)"
                        + " which means I'm creating answer")
    }
});

socket.on('answer', function (event) {
    if(isBroadcaster){
        rtcPeerConnections[currentStudentIndex].setRemoteDescription(new RTCSessionDescription(event));
        console.log(socket.id, " is handling the answer event (so I'm supposed to be a teacher)"
                    + " which means I'm setting remote description");
        currentStudentIndex++;

    }
    
    
})

// handler functions
function onIceCandidate(event) {
    if (event.candidate) {
        console.log('sending ice candidate');
        socket.emit('candidate', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room: roomNumber
        })
    }
}

function onAddStream(event) {
    if(!isBroadcaster){
        remoteVideo.srcObject = event.streams[0];
        broadcasterStream = event.stream;
    }
    else {
        studentStreams.push(event.stream)
        if (!remoteVideo.srcObject){
            remoteVideo.srcObject = event.streams[0];
        }
        else {
            let video = document.createElement("video");
            video.srcObject = event.streams[0];
            video.autoplay = true;
            divConsultingRoom.appendChild(video)
        }
    }
}