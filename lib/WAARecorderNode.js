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