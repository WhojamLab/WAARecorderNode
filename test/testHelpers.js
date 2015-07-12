exports.cleanNodes = function(nodes) {
  nodes.forEach(function(node) {
    if (node.disconnect) node.disconnect()
    if (node.onaudioprocess) node.onaudioprocess = null
  })
}