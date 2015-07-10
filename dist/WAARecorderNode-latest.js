(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var WAARecorderNode = require('./lib/WAARecorderNode')
module.exports = WAARecorderNode
if (typeof window !== 'undefined') window.WAARecorderNode = WAARecorderNode
},{"./lib/WAARecorderNode":3}],2:[function(require,module,exports){
// This is a small wrapper around ScriptProcessorNode that lets
// the callback `onaudioprocess` know at which time the audio 
// from `event.inputBuffer` was generated.
// It works by creating a looping `BufferSourceNode` which acts as a metronome
// and is connected to the ScriptProcessorNode to be able to "time-tag" the incoming
// audio.

// TODO : only one metronome for all recorders?
module.exports = TimeTaggedScriptProcessorNode = function(context, samplesPerBlock, numberOfChannels) {

  var metroLoopTime = 10 // approximative, in seconds
    , metroTickSampleCount = 0.5 * samplesPerBlock
    , metroTickTime = metroTickSampleCount / context.sampleRate
    , metroLoopTickCount = Math.ceil(metroLoopTime / (metroTickSampleCount / context.sampleRate))
    , metroLoopSampleCount = metroLoopTickCount * metroTickSampleCount
    , metroBuffer = context.createBuffer(1, metroLoopSampleCount, context.sampleRate)
    , metroArray = metroBuffer.getChannelData(0)
    , loopCounter = 0
    , onaudioprocess = function() {}
    , metroStartTime, i, currentTimeTag, previousTimeTag
  metroLoopTime = metroTickTime * metroLoopTickCount

  // Fill-in the metronome buffer
  for (i = 0; i < metroLoopTickCount; i++)
    metroArray[i * metroTickSampleCount] = i

  Object.defineProperty(this, 'onaudioprocess', {
    get: function() { return onaudioprocess },
    set: function(cb) { onaudioprocess = cb } 
  })

  this._scriptProcessor = context.createScriptProcessor(samplesPerBlock, 1 + numberOfChannels, 1 + numberOfChannels)
  this._scriptProcessor.onaudioprocess = function(event) {
    var timeTagsArray = event.inputBuffer.getChannelData(0)
    for (i = 0; i < samplesPerBlock; i++)
      if ((currentTimeTag = timeTagsArray[i]) != 0) break
    if (currentTimeTag < previousTimeTag) loopCounter++
    previousTimeTag = currentTimeTag
    onaudioprocess(event, metroStartTime 
      + loopCounter * metroLoopTime 
      + currentTimeTag * metroTickTime
      - i / context.sampleRate)
  }

  this._channelMergerNode = context.createChannelMerger(1 + numberOfChannels)
  this._channelMergerNode.connect(this._scriptProcessor)
  this._channelSplitterNode = context.createChannelSplitter(numberOfChannels)
  for (i = 0; i < numberOfChannels; i++)
    this._channelSplitterNode.connect(this._channelMergerNode, i, 1 + i)

  this._metroNode = context.createBufferSource()
  this._metroNode.buffer = metroBuffer
  this._metroNode.loop = true
  metroStartTime = Math.ceil(context.currentTime)
  this._metroNode.start(metroStartTime)
  this._metroNode.connect(this._channelMergerNode, 0, 0)
}

TimeTaggedScriptProcessorNode.prototype.receiveConnection = function(source, output, input) { 
  source.connect(this._channelSplitterNode, output, input)
}

TimeTaggedScriptProcessorNode.prototype.connect = function() { 
  this._scriptProcessor.connect.apply(this._scriptProcessor, arguments)
}

TimeTaggedScriptProcessorNode.prototype.disconnect = function() { 
  this._scriptProcessor.disconnect.apply(this._scriptProcessor, arguments)
}
},{}],3:[function(require,module,exports){
var TimeTaggedScriptProcessorNode = require('./TimeTaggedScriptProcessorNode')

var WAARecorderNode = module.exports = function(context, opts) {
  opts = opts || {}
  var self = this

  this.context = context
  this.numberOfChannels = opts.numberOfChannels || 2
  this.samplesPerBlock = opts.samplesPerBlock || 16384

  this.state = 'idle'
  this.onended = null

  this._muteGain = context.createGain()
  this._muteGain.gain = 0
  this._muteGain.connect(context.destination)

  this._timeTaggedScriptProcessor = new TimeTaggedScriptProcessorNode(context, this.samplesPerBlock, 
    this.numberOfChannels)
  this._timeTaggedScriptProcessor.connect(this._muteGain)
}

WAARecorderNode.prototype.record = function(startTime, recDuration) {
  var self = this
    , sampleRate = self.context.sampleRate
    , currentSampleCount = 0
    , targetSampleCount = Math.ceil(recDuration * sampleRate)
    , startSample = startTime * sampleRate
    , recordedAudio = []
    , ch

  for (ch = 0; ch < this.numberOfChannels; ch++) 
    recordedAudio.push(new Float32Array(targetSampleCount))

  this.state = 'recording'

  this._timeTaggedScriptProcessor.onaudioprocess = function(event, blockTime) {
    var currentSample = blockTime * sampleRate

    if (self.state === 'idle') return

    else if ((currentSample + self.samplesPerBlock) > startSample) {
      var startInd = Math.max(startSample - currentSample, 0)
        , stopInd = Math.min(
          startInd + targetSampleCount - currentSampleCount, 
          event.inputBuffer.length
        )

      for (ch = 0; ch < self.numberOfChannels; ch++)
        recordedAudio[ch].set(event.inputBuffer.getChannelData(ch + 1)
          .subarray(startInd, stopInd), currentSampleCount)

      currentSampleCount += (stopInd - startInd)
      console.log('rec', Math.round(currentSample), currentSampleCount, startSample, startInd, stopInd) 
        //event.inputBuffer.getChannelData(1).subarray(startInd, startInd + 10),
        //event.inputBuffer.getChannelData(2).subarray(startInd, startInd + 10))

      if (currentSampleCount >= targetSampleCount) {
        console.log('ENDED')
        self.state = 'idle'
        if (self.onended) self.onended()
      }
    }
  }

  this.getAudioBuffer = function() {
    var audioBuffer = this.context.createBuffer(
        this.numberOfChannels, targetSampleCount, this.context.sampleRate)
      , ch

    for (ch = 0; ch < this.numberOfChannels; ch++)
      audioBuffer.getChannelData(ch).set(recordedAudio[ch])

    return audioBuffer
  }

  this.getCurrentRecordDuration = function() {
    return Math.max(0, this.context.currentTime - startTime)
  }

}

WAARecorderNode.prototype.receiveConnection = function() { 
  this._timeTaggedScriptProcessor.receiveConnection.apply(
    this._timeTaggedScriptProcessor, arguments) 
}

WAARecorderNode.prototype.stop = function() { this.state = 'idle' }

WAARecorderNode.prototype.getBuffer = function() { return null }

WAARecorderNode.prototype.getCurrentRecordDuration = function() { return 0 }
},{"./TimeTaggedScriptProcessorNode":2}]},{},[1]);
