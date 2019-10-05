Issues needs fixing: 
1. Dynamically generate video on teacher's screen when a students join the room (currently generate too many videos because a new <video> element is created each time a track event is fired, and ontrack is fired twice, one for audio, one for video)
2. Connection problems when there are more than 2 people in a room (previously connected students seem to lost connection with teacher). This seems to originate from the fact that the 1st student receives the ICE broadcast from the 2nd student
3. Can't complete signaling when 2 peers are on different LANs (not sure whether it's because my network is slow). Runs smoothly when tested with 2 peers on the same LAN

