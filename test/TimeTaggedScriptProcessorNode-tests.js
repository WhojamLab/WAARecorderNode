var assert = require('assert')
  , utils = require('waatest').utils
  , TimeTaggedScriptProcessorNode = require('../lib/TimeTaggedScriptProcessorNode')


describe('TimeTaggedScriptProcessorNode', function() {
  
  describe('time tagging', function() {

    this.timeout(20000)

    it('should record the desired length starting at the desired time', function(done) {
      var context = new AudioContext()
        , collectedTimes = []
        , timeTaggedNode = new TimeTaggedScriptProcessorNode(context, 1024, 1)
        , bufferSourceNode = context.createBufferSource()
        , buffer = context.createBuffer(1, context.sampleRate * 1.5, context.sampleRate)
      buffer.getChannelData(0)[0] = 1

      bufferSourceNode.buffer = buffer
      bufferSourceNode.loop = true
      bufferSourceNode.start(1.5)

      timeTaggedNode.receiveConnection(bufferSourceNode)
      timeTaggedNode.connect(context.destination)
      timeTaggedNode.onaudioprocess = function(event, time) {
        var array = event.inputBuffer.getChannelData(1)
          , i
        for (i = 0; i < array.length; i++) {
          if (array[i] === 1) {
            time = time + i / context.sampleRate
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

    this.timeout(10000)

    it('should handle multi-channel properly', function(done) {
      var context = new AudioContext()
        , collectedTimes = []
        , timeTaggedNode = new TimeTaggedScriptProcessorNode(context, 1024, 3)
        , bufferSourceNode = context.createBufferSource()
        , buffer = context.createBuffer(3, context.sampleRate * 1.5, context.sampleRate)
      buffer.getChannelData(0)[0] = 789
      buffer.getChannelData(1)[0] = 456
      buffer.getChannelData(2)[0] = 123

      bufferSourceNode.buffer = buffer
      bufferSourceNode.start(1.1)

      timeTaggedNode.receiveConnection(bufferSourceNode)
      timeTaggedNode.connect(context.destination)
      timeTaggedNode.onaudioprocess = function(event, time) {
        if (time + 1024 / context.sampleRate > 1.1) {
          var index = Math.round((1.1 - time) * context.sampleRate)
            , values = [
              event.inputBuffer.getChannelData(1)[index],
              event.inputBuffer.getChannelData(2)[index],
              event.inputBuffer.getChannelData(3)[index]
            ]
          assert.deepEqual(values, [789, 456, 123])
          timeTaggedNode.disconnect()
          done()
        }
      }

    })

  })

})