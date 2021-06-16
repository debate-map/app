# Debugging/Profiling Tools

### Main

* Chrome dev-tools -> Performance
* React dev-tools -> Profiler
* React dev tools -> component state -> @debug

### Console

* RR.GetChangedSubWatchers()
* RR.LogStoreAccessorRunTimes()
* RR.pathWatchTree
* RR.subWatchers
* RR.MyComp.renderCount (and compInstance.renderCount)
* RR.MyComp.lastRenderTime (and compInstance.lastRenderTime)

### Tests

Tests can be run using: `npm run cypress:open`

* The test "Should have all the nodes expanded" logs the loading time for its nodes.