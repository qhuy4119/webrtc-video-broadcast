'use strict'
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
var studentStreamsId = [];

// A STUDENT ONLY NEED ONE RTCPeerConnection to connect with the only teacher in the room. If a student can see
// many teachers then this logic need to change
var rtcPeerConnection; 
var rtcPeerConnections = {}; // REALLY IMPORTANT: THE BROADCASTER NEEDS A DISTINCT RTCPeerConnection FOR EACH STUDENT
var tempConnection;

var iceServers = {
    serverList: [
        { 'urls': 'stun:stun.services.mozilla.com' },
        { 'urls': 'stun:stun.l.google.com:19302' },
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
        localVideo.srcObject = stream;
        localStream = stream;
        isBroadcaster = true;
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
        alert("Having error opening your camera and/or microphone: ", err.message);
    });
    //alert("You are the broadcaster of room " + String(room));
    console.log(socket.id, ' (me) is the broadcaster');
});

socket.on('ready', function (student_id) {
    if (isBroadcaster) {
        console.log("Student_id: ", student_id, " has just joined the room. Let's start connecting with him/her")
        tempConnection = new RTCPeerConnection(iceServers);

        tempConnection.oniceconnectionstatechange = () => {
                console.log("*** ICE connection state changed to " + String(rtcPeerConnections[student_id].iceConnectionState));
        }
        tempConnection.onicecandidate = onIceCandidate;
        // The local ICE layer calls your icecandidate event handler
        // when it needs you to transmit an ICE candidate to the other peer,
        // through your signaling server

        tempConnection.ontrack = onTrackHandler;
        // /This handler for the track event is called by the local WebRTC layer when a track is 
        // added to the connection. This lets you connect the incoming media to an element to display it  

        tempConnection.onnegotiationneeded = () => {
            tempConnection.createOffer().then(sessionDescription => {
                tempConnection.setLocalDescription(sessionDescription);
                socket.emit('offer', {
                    type: 'offer',
                    sdp: sessionDescription,
                    room: roomNumber
                }, student_id);
            })
            .catch(error => {
                console.log(error)
            })                                                                                                                                                                                                  
        }                                                                                                             
        localStream.getTracks().forEach(track => tempConnection.addTrack(track, localStream));        
        // adds a new media track to the set of tracks which will be transmitted to the other peer.                             
        // Adding a track to a connection triggers renegotiation by firing a negotiationneeded event                            
        
        rtcPeerConnections[student_id] = tempConnection;

        console.log("The current student ids: ",Object.keys(rtcPeerConnections));
        console.log("The number of students in the room: ", Object.keys(rtcPeerConnections).length);  
        console.log(socket.id, " is handling the ready event (so I'm supposed to be the teacher)")
    }   
});

socket.on('answer', function (event, student_id) {
    if(isBroadcaster){
        rtcPeerConnections[student_id].setRemoteDescription(new RTCSessionDescription(event)).catch(
            ()=>{ console.log("The error occured while processing the answer of student: ", student_id) }
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

socket.on('offer', function (event) {
    if (!isBroadcaster) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.ontrack = onTrackHandler;
        rtcPeerConnection.oniceconnectionstatechange = () => {
                console.log("*** ICE connection state changed to " + String(rtcPeerConnection.iceConnectionState));
        }

        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
        .then(function() {
            localStream.getTracks().forEach(track => rtcPeerConnection.addTrack(track, localStream));
          })
          .then(function() {
            return rtcPeerConnection.createAnswer();
          })
          .then(function(answer) {
            return rtcPeerConnection.setLocalDescription(answer);
          })
          .then(function() {
            socket.emit('answer', {
                type: 'answer',
                sdp: rtcPeerConnection.localDescription,
                room: roomNumber
            }, socket.id);
            }
          )
          .catch(error => {
            console.log(error)
            })
        console.log(socket.id, " is handling the offer event (so I'm supposed to be a student)"
                    + " which means I'm creating answer")
    }
});



// Handlers of both roles

// When receiving ICE candidate from the other end
socket.on('candidate', function (event, sender_id) {
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    console.log(console.log(JSON.stringify(event)));
    if (isBroadcaster){
        rtcPeerConnections[sender_id].addIceCandidate(candidate).then(function() {
            console.log("added ICE candidate from: " + String(sender_id));
        })
        .catch(e => {
            console.log("Failure during addIceCandidate(): " + e.name);
        }
        )
    }   
    else{
            rtcPeerConnection.addIceCandidate(candidate).then(function() {
                console.log("added ICE candidate from: " + String(sender_id));
            })
            .catch(e => {
                console.log("Failure during addIceCandidate(): " + e.name);
            }
            )
    }
    
    
});


// handler functions

// when icecandidate event is fired after a call of setLocalDescription(). This handler will send ice candidate 
// to the other end of the call
function onIceCandidate(event) {
    if (event.candidate) {
        console.log('Broadcaster is sending ice candidate; (onIceCandidateBroadcaster() called)');
        socket.emit('candidate', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room: roomNumber
        }, socket.id)
    }
    // else if(event.candidate && !isBroadcaster){
    //     console.log('Student is sending ice candidate; (onIceCandidateBroadcaster() called)');
    //     socket.emit('candidate', {
    //         type: 'candidate',
    //         label: event.candidate.sdpMLineIndex,
    //         id: event.candidate.sdpMid,
    //         candidate: event.candidate.candidate,
    //         room: roomNumber
    //     }, socket.id)
    // }

}

function onTrackHandler(event) {
    if(!isBroadcaster){
        remoteVideo.srcObject = event.streams[0];
        broadcasterStream = event.streams[0];
    }
    else {
        if (!remoteVideo.srcObject){
            remoteVideo.srcObject = event.streams[0];
        }
        else if (!studentStreamsId.includes(event.streams[0].id)) {
            let video = document.createElement("video");
            video.srcObject = event.streams[0];
            video.autoplay = true;
            divConsultingRoom.appendChild(video)   
        }
        if (!studentStreamsId.includes(event.streams[0].id)){
            studentStreamsId.push(event.streams[0].id);
        }
        console.log("studentStreamsId: ", studentStreamsId);
    }
    
    console.log("onTrackHandler() called");
}

socket.on('user_leave', function(leaver_id){
    console.log(String(leaver_id) + " has left the room");
    //TODO: clean up, delete video on the screen,....
});