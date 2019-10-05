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
var rtcPeerConnections = {}; // REALLY IMPORTANT: THE BROADCASTER NEEDS A DISTINCT RTCPeerConnection FOR EACH STUDENT

var iceServers = {
    'iceServers': [
        { 'urls': 'stun:stun.services.mozilla.com' },
        { 'urls': 'stun:stun.5sn.com:3478' },
        { 'urls': 'stun:stun.stunprotocol.org' }
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


///////////////////////////////// Broadcaster only message handlers
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

socket.on('ready', function (student_id) {
    if (isBroadcaster) {
        console.log("Student_id: ", student_id)
        let rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.ontrack = onAddStream;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        rtcPeerConnections[student_id] = rtcPeerConnection;
        console.log("The object keys: ",Object.keys(rtcPeerConnections));
        console.log("The number of properties in rtcPeerConnections: ", Object.keys(rtcPeerConnections).length);
        rtcPeerConnection.createOffer()
            .then(sessionDescription => {
                rtcPeerConnection.setLocalDescription(sessionDescription);
                socket.emit('offer', {
                    type: 'offer',
                    sdp: sessionDescription,
                    room: roomNumber
                }, socket.id);
            })
            .catch(error => {
                console.log(error)
            })
        
        console.log(socket.id, " is handling the ready event (so I'm supposed to be the teacher)"
                    + " which means I'm creating offer")
    }
    
});
socket.on('answer', function (event, student_id) {
    if(isBroadcaster){
        rtcPeerConnections[student_id].setRemoteDescription(new RTCSessionDescription(event)).catch(
            ()=>{ console.log("The error occured on answer") }
        );
        console.log(socket.id, " is handling the answer event (so I'm supposed to be a teacher)"
                    + " which means I'm setting remote description");
    }   
})


/////////////////////////// Student only message handlers
socket.on('joined', function (room) {
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        localStream = stream;
        localVideo.srcObject = stream;
        isBroadcaster = false;
        socket.emit('ready', roomNumber, socket.id);
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
    });
    console.log(socket.id, '(me) is a student');
});

socket.on('offer', function (event, broadcaster_id) {
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
                }, socket.id);
            })
            .catch(error => {
                console.log(error)
            })
            console.log(socket.id, " is handling the offer event (so I'm supposed to be a student) from " +String(broadcaster_id)
                        + " which means I'm creating answer")
    }
});



// Handlers of both roles
socket.on('candidate', function (event, student_id) {
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    if (!isBroadcaster){
        if (rtcPeerConnection.signalingState !== "stable"){
            rtcPeerConnection.addIceCandidate(candidate);
        }
        
    }
    else{
        rtcPeerConnections[student_id].addIceCandidate(candidate);
    }
    console.log("candidate called");
    
});



// handler functions
function onIceCandidate(event) {
    if (event.candidate) {
        console.log('sending ice candidate (onIceCandidate() called)');
        socket.emit('candidate', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room: roomNumber
        }, socket.id)
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
    console.log("onAddStream() called");
}