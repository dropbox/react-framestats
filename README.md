# React Frame Stats

react-framestats is a performance monitoring tool for React applications.
Drop a `PerfPanel` component into your application and it will measure
the duration of each frame and display:

- the number of dropped frames in the last five seconds and
- the longest frame over the same period.

In addition, if you call `recordRender(componentName: string, reason: string)`
in your appropriate `shouldComponentUpdate`, the perf panel will display:

- how many times the top components have been rendered,
- and the six most recent rerenders.

```
import {PerfPanel, recordRender} from 'react-framestats';

...

render() {
    return (
        <YourApplication>
            <PerfPanel />
        </YourApplication>
    );
}
```
