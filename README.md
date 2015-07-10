WAAWire
==============

More flexible audio node connections and disconnections.

```javascript
var context = new AudioContext()
  , wire = new WAAWire(context)
```


**Disconnect a single connection**, providing the same possibilities as the [newly specified syntax](http://webaudio.github.io/web-audio-api/#widl-AudioNode-disconnect-void-unsigned-long-output) for `AudioNode.disconnect`.

```javascript
var osc = context.createOscillator()
  , delay = context.createDelay()
  , wireDelay = new WAAWire(context), wireDry = new WAAWire(context)
wireDelay.connect(osc, delay)
wireDry.connect(osc, context.destination)
wireDry.close()
```


**Connect / disconnect a node at a precise time in the future**

```javascript
wire.atTime(5).connect(source, destination)
wire.atTime(12).close()
```


**swap a source and / or a destination**

```javascript
wire.atTime(5).connect(source1, destination1)
wire.atTime(12).swapSource(source2)
wire.atTime(20).swapSource(destination2)
```


API
----

##WAAWire(context)

An instance of `WAAWire` represents a single connection between two `AudioNodes`, from a single `output` of the source node and a single `input` of the destination node.


###connect(source, destination, output=0, input=0)

Connects the wire. Can be called only once.


###swapSource(source, output=0)

Swaps the current source of the wire with a new `source` / `output`.


###swapDestination(destination, input=0)

Swaps the current destination of the wire with a new `destination` / `input`.


###close()

Closes the connection.


###atTime(time)

Schedules an operation to happen at a given time. All the `WAAWire` methods can be chained with this and therefore scheduled in the future. If `time` is older than `context.currentTime`, the operation will be executed immediately. For example :

```javascript
// Will connect the nodes at time = 5s and close the connection at time = 12s
wire.atTime(5).connect(source, destination)
wire.atTime(12).close()
```
