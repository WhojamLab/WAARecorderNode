var assert = require('assert')
  , utils = require('waatest').utils
  , WAARecorderNode = require('../index')

var generateBuffer = function(context, numberOfChannels, length) {
  var buffer = context.createBuffer(numberOfChannels, length, context.sampleRate)
  for (var ch = 0; ch < buffer.numberOfChannels; ch++)
    for (var i = 0; i < buffer.length; i++)
      buffer.getChannelData(ch)[i] = (ch + 1) * i
  return buffer
}

describe('WAARecorderNode', function() {
  
  describe('record', function() {

    this.timeout(5000)

    it('should record the desired length starting at the desired time', function(done) {
      var context = new AudioContext()
        , bufferSourceNode = context.createBufferSource()
        , recorderNode = new WAARecorderNode(context)
        , playStart = 1.5, recStart = 2, recDuration = 1.5
        , playedBuffer = generateBuffer(context, 2, context.sampleRate * 4)

      bufferSourceNode.buffer = playedBuffer
      bufferSourceNode.start(playStart)
      
      recorderNode.receiveConnection(bufferSourceNode)
      recorderNode.record(recStart, recDuration) // <rec start>, <rec duration>
      recorderNode.onended = function() {
        playedBuffer
        var recordedBuffer = recorderNode.getAudioBuffer()
          , startInd = (recStart - playStart) * context.sampleRate
          , stopInd = startInd + recDuration * context.sampleRate

        assert.equal(recordedBuffer.duration, recDuration)
        assert.equal(recordedBuffer.numberOfChannels, 2)
        
        assert.deepEqual(
          recordedBuffer.getChannelData(0), 
          playedBuffer.getChannelData(0).subarray(startInd, stopInd)
        )
        assert.deepEqual(
          recordedBuffer.getChannelData(1), 
          playedBuffer.getChannelData(1).subarray(startInd, stopInd)
        )

        done()
      }
    })

  })

})