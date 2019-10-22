The demo website: [https://qhuy4119.herokuapp.com]( https://qhuy4119.herokuapp.com)

How this works:

- The signaling server is in server.js, implemented with socket.io, express, and http. We try to solve the problem ( The broadcaster sees everyone while  a student only sees himself and the broacaster) by leveraging the "room" functionality of socket.io. The signals broacaster and students emit will be sent to the server, then the server  can choose to distribute those signals anyway it wants (broacast to all or send to a specific user in the room). 

- The client code implements event handlers for custom messages received from the signaling server.

    If you are the **broadcaster** (by being the first person to join a room): 
    
        you will wait for a student to join the room. When a student joins the room and sets up his local media successfully, you will receive a "ready" message from the signaling server. By handling this message, you set up an RTCPeerConnection for that student, then create and send an offer to that student. You will also add the RTCPeerConnection to a dictionary of connections because you will need different `RTCPeerConnection`s for different students  After a while, you will receive an answer from the student and connect the stream from the answer with a `<video>` element.
        
        your client code also maintain an array of  students' streams' id, in order to help in generating the number of videos on your screen correctly 
    
    If you are the **student**: 
        After joining a room and successfully set up your local video, you will wait for an *offer* message from the server. On handling this event, you will create an `RTCPeerConnection` representing your connection with the broadcaster. You will also create an answer and send it to the broadcaster through the signaling server.  If connection success, you will receive the stream from the broacaster and connect it to the `remoteVideo` html element. 


Issues needs fixing: 

1. Remove videos on broadcaster screen when students disconnect
