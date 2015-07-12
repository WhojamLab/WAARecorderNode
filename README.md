WAARecorderNode
================

`WAARecorderNode` is a simple, lightweight Web Audio API recorder node, with **precise scheduling methods**. It gives you perfect control over when your recording starts and stops, therefore allowing perfect synchronization with the rest of the audio graph. 

To use, first grab the latest build [here](./dist) and add it to your web page.

Then to record some audio do ...

1) Create a `WAARecorderNode`, and connect the source you want to record from. Any Web Audio API `AudioNode` will work.

```
var recorderNode = new WAARecorderNode(audioContext)
recorderNode.recordFrom(audioNode)
```

2) Start the recording at a given time in the future, using for time reference `AudioContext.currentTime`.

```
// start the recording in exactly one second from now, record a duration of maximum 15 seconds
recorderNode.record(audioContext.currentTime + 1, 15)
```

or

```
// start the recording at audioContext.currentTime == 10
recorderNode.record(10, 15)
```

3) Add a callback to handle your recording when it will be complete

```
recorderNode.onended = function() {
  // getAudioBuffer returns the full recording as a Web Audio API AudioBuffer
  var myRecording = recorderNode.getAudioBuffer()
}
```