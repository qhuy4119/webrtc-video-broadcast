The demo website: [https://qhuy4119.herokuapp.com]( https://qhuy4119.herokuapp.com)

How this works:

- The signaling server is in server.js, implemented with socket.io, express, and http. We try to solve the problem ( The broadcaster sees everyone while  a student only sees himself and the broacaster) by leveraging the "room" functionality of socket.io. The signals broacaster and students emit will be sent to the server, then the server  can choost to distribute those anyway it wants (broacast to all or send to a specific user in the room). 

- The client code implements event handlers for custom messages received from the signaling server.

    If you are the **broadcaster** (by being the first person to join a room): you will wait for a student to join the room. When a student joins the room and sets up his local media successfully, you will receive a "ready" message from the signaling server. By handling this message, you set up an RTCPeerConnection for that student, then create and send an offer to that student. You will also add the RTCPeerConnection to a dictionary of connections because you will need different `RTCPeerConnection`s for different students  After a while, you will receive an answer from the student and connect the stream from the answer with a `<video>` element.
    
    If you are the **student**: After joining a room and successfully set up your local video, you will wait for an *offer* message from the server. On handling this event, you will create an `RTCPeerConnection` representing your connection with the broadcaster. You will also create an answer and send it to the broadcaster through the signaling server.  If connection success, you will receive the stream from the broacaster and connect it to the `remoteVideo` html element. 


Issues needs fixing: 
1. Dynamically generate video on teacher's screen when a students join the room (currently generate too many videos because a new <video> element is created each time a track event is fired, and ontrack is fired twice, one for audio, one for video)
    
    Update: A fix has been implemented but not tested. It may or may not work.
    
2. Connection problems when there are more than 2 people in a room (previously connected students seem to lost connection with teacher). This seems to originate from the fact that the 1st student receives the ICE broadcast from the 2nd student

    Update: A fix has been implemented but not tested. This is the same as the 1st issue. I don't have the resource to test (strong internet connection and different physical devices). The fix failed when I tested on my machine but after investigating, I think it **may** have been the limitation of my resources (can't broadcast when the broadcaster and students are on the same physical machine, and are different tabs on the same browser window ??) that caused the fix to fail.
    
3. Can't complete signaling when 2 peers are on different LANs (not sure whether it's because my network is slow, REMEMBER TO CHECK IF PORT IS OPEN FOR CONNECTION WITH ICE SERVERS). Runs smoothly when tested with 2 peers on the same LAN

    Update: Even if tested on the tutorial app on which this repo is based, with 2 computers on different LAN, callee only receives audio while caller receives neither audio nor video. So hopefully the client code here isn't the issue
