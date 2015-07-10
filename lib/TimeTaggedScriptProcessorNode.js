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