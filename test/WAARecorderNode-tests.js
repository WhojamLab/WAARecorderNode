var assert = require('assert')
  , utils = require('waatest').utils
  , testHelpers = require('./testHelpers')
  , WAARecorderNode = require('../index')


var nodes = []
  , audioContext = null


var generateBuffer = function(numberOfChannels, length) {
  var buffer = audioContext.createBuffer(numberOfChannels, length, audioContext.sampleRate)
  for (var ch = 0; ch < buffer.numberOfChannels; ch++)
    for (var i = 0; i < buffer.length; i++)
      buffer.getChannelData(ch)[i] = (ch + 1) * i
  return buffer
}

describe('WAARecorderNode', function() {
  
  afterEach(function() {
    testHelpers.cleanNodes(nodes)
    nodes = []
    audioContext = null
  })

  beforeEach(function() {
    audioContext = new AudioContext
  })

  describe('record', function() {

    this.timeout(5000)

    it('should record the desired length starting at the desired time', function(done) {
      var bufferSourceNode = audioContext.createBufferSource()
        , recorderNode = new WAARecorderNode(audioContext)
        , playStart = 1.5, recStart = 2, recDuration = 1.5
        , playedBuffer = generateBuffer(2, audioContext.sampleRate * 4)

      nodes.push(bufferSourceNode)
      nodes.push(recorderNode)

      bufferSourceNode.buffer = playedBuffer
      bufferSourceNode.start(playStart)
      
      recorderNode.recordFrom(bufferSourceNode)
      recorderNode.record(recStart, recDuration) // <rec start>, <rec duration>
      recorderNode.onended = function() {
        playedBuffer
        var recordedBuffer = recorderNode.getAudioBuffer()
          , startInd = (recStart - playStart) * audioContext.sampleRate
          , stopInd = startInd + recDuration * audioContext.sampleRate

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