var assert = require('assert')
  , utils = require('waatest').utils
  , testHelpers = require('./testHelpers')
  , TimeTaggedScriptProcessorNode = require('../lib/TimeTaggedScriptProcessorNode')


var nodes = []
  , audioContext = null


describe('TimeTaggedScriptProcessorNode', function() {
  
  afterEach(function() {
    testHelpers.cleanNodes(nodes)
    nodes = []
    audioContext = null
  })

  beforeEach(function() {
    audioContext = new AudioContext
  })

  describe('time tagging', function() {

    this.timeout(20000)

    it('should record the desired length starting at the desired time', function(done) {      
      var timeTaggedNode = new TimeTaggedScriptProcessorNode(audioContext, 1024, 1)
        , bufferSourceNode = audioContext.createBufferSource()
        , collectedTimes = []
        , buffer = audioContext.createBuffer(1, audioContext.sampleRate * 1.5, audioContext.sampleRate)
      buffer.getChannelData(0)[0] = 999

      nodes.push(timeTaggedNode)
      nodes.push(bufferSourceNode)

      bufferSourceNode.buffer = buffer
      bufferSourceNode.loop = true
      bufferSourceNode.start(1.5)

      timeTaggedNode.receiveConnection(bufferSourceNode)
      timeTaggedNode.connect(audioContext.destination)
      timeTaggedNode.onaudioprocess = function(event, time) {
        var array = event.inputBuffer.getChannelData(1)
          , i
        for (i = 0; i < array.length; i++) {
          if (array[i] !== 0) {
            assert.equal(array[i], 999)
            time = time + i / audioContext.sampleRate
            collectedTimes.push(time)
            console.log(time)
            if (time >= 15) {
              assert.deepEqual(
                collectedTimes.map(function(n) { return utils.round(n, 4) }), 
                [1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5, 15]
              )
              bufferSourceNode.stop()
              done()
            }
          }
        }
      }

    })

  })

  describe('numberOfChannels', function() {

    this.timeout(4000)

    it('should handle multi-channel properly', function(done) {
      audioContext = new AudioContext()
      var timeTaggedNode = new TimeTaggedScriptProcessorNode(audioContext, 1024, 3)
        , bufferSourceNode = audioContext.createBufferSource()
        , collectedTimes = []
        , buffer = audioContext.createBuffer(3, audioContext.sampleRate * 1.5, audioContext.sampleRate)
      buffer.getChannelData(0)[0] = 789
      buffer.getChannelData(1)[0] = 456
      buffer.getChannelData(2)[0] = 123

      nodes.push(timeTaggedNode)
      nodes.push(bufferSourceNode)

      bufferSourceNode.buffer = buffer
      bufferSourceNode.start(1.1)

      timeTaggedNode.receiveConnection(bufferSourceNode)
      timeTaggedNode.connect(audioContext.destination)
      timeTaggedNode.onaudioprocess = function(event, time) {
        var i, val
        // Verify that the pulse in the buffer comes at expected time
        for (i = 0; i < event.inputBuffer.length; i++) { 
          val = event.inputBuffer.getChannelData(1)[i]
          if (val !== 0)
            assert.equal(Math.round((1.1 - time) * audioContext.sampleRate), i)
        }
        
        // Verify that we got the expected value at the pulse time
        if (time + 1024 / audioContext.sampleRate > 1.1) {
          var index = Math.round((1.1 - time) * audioContext.sampleRate)
            , values = [
              event.inputBuffer.getChannelData(1)[index],
              event.inputBuffer.getChannelData(2)[index],
              event.inputBuffer.getChannelData(3)[index]
            ]
          assert.deepEqual(values, [789, 456, 123])
          done()
        }
      }

    })

  })

})