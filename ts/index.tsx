/// <reference path='../typings/index.d.ts' />
/// <reference path='../typings/circular-buffer.d.ts' />

import React = require('react');
import CircularBuffer = require('circular-buffer');

const DEFAULT_FRAME_COUNT = 5 * 60; // five seconds at 60 Hz

// normally I'd say anything over 17ms is a dropped frame,
// but browsers have iffy timing.  so assume anything a bit under two
// frames is a dropped frame.  assumes 60 Hz is the target.
const DROPPED_FRAME_THRESHOLD_TIME = 30; // ms

interface RenderReason {
  when: number;
  component: string;
  reason: string;
}

function getNowFunction() {
  if (typeof performance === 'object' && performance !== null && typeof performance.now === 'function') {
    return () => performance.now();
  } else {
    // Not monotonic, but it probably doesn't matter.
    return () => Date.now();
  }
}

const getNow = getNowFunction();

// Metrics for diagnosing why renders are happening.
const renderCounts: {[name: string]: number} = Object.create(null);
const recentRenders = new CircularBuffer<RenderReason>(6);

export function recordRender(name: string, reason: string) {
  if (name in renderCounts) {
    renderCounts[name]++;
  } else {
    renderCounts[name] = 1;
  }

  recentRenders.enq({
    when: getNow(),
    component: name,
    reason,
  });
}

export interface FrameStatsOutput {
  update(elapsed: number, recorder: FrameRecorder);
}

export class DIVFrameStatsOutput implements FrameStatsOutput {
  _div: HTMLElement;

  constructor(div: HTMLElement) {
    this._div = div;
  }

  update(elapsed: number, recorder: FrameRecorder) {
    let render_count_array = [];
    for (let component in renderCounts) {
      render_count_array.push({component: component, render_count: renderCounts[component]});
    }
    render_count_array.sort((a, b) => b.render_count - a.render_count);

    let render_count_string = '';
    render_count_array.slice(0, 5).forEach(({component, render_count}) => {
      render_count_string += `  ${component}: ${render_count}\n`;
    });

    let recent_render_string = '';
    let rr = recentRenders.toarray();
    rr.forEach(({component, reason}) => {
      recent_render_string += `  ${component} because ${reason}\n`;
    });

    this._div.textContent = `Perf Panel
-----------
Slowest frame in:
  Last 1s: ${recorder.get_longest_in(1000)}
  Last 5s: ${recorder.get_longest_in(5000)}
Dropped frames in:
  Last 1s: ${recorder.get_dropped_in(1000)}
  Last 5s: ${recorder.get_dropped_in(5000)}
Render counts:
${render_count_string.replace(/\s+$/g, '')}
Recent renders:
${recent_render_string.replace(/\s+$/g, '')}`;
  }
}

export interface FrameRecorderOptions {
  frame_count?: number;
  output: FrameStatsOutput;
}

// While started, records frame times, up to the last N frames.
export class FrameRecorder {
  _frame_times: CircularBuffer<number>;
  _last_frame: number;
  _frame_request: number;
  _output: FrameStatsOutput;

  constructor({
    frame_count = DEFAULT_FRAME_COUNT,
    output,
  }: FrameRecorderOptions) {
    this._frame_times = new CircularBuffer<number>(frame_count);
    this._last_frame = null;
    this._frame_request = null;
    this._output = output;
  }

  start() {
    if (this._frame_request === null) {
      this._frame_request = window.requestAnimationFrame(() => {
        this._on_frame();
      });
    }
  }

  stop() {
    if (this._frame_request !== null) {
      window.cancelAnimationFrame(this._frame_request);
      this._frame_request = null;
    }
  }

  get_longest_in(period: number) {
    // TODO: allocation of this array produces some unnecessary garbage.
    // we could iterate directly across the circular buffer.
    let all_frames = this._frame_times.toarray();
    if (all_frames.length === 0) {
      return null;
    }

    let max = 0;
    let sum = 0;
    for (let i = 0; i < all_frames.length; ++i) {
      let t = all_frames[i];
      max = Math.max(max, t);
      sum += t;
      if (sum > period) {
        break;
      }
    }

    return max;
  }

  get_dropped_in(period: number) {
    // TODO: allocation of this array produces some unnecessary garbage.
    // we could iterate directly across the circular buffer.
    let all_frames = this._frame_times.toarray();
    if (all_frames.length === 0) {
      return 0;
    }

    let dropped = 0;
    let sum = 0;
    for (let i = 0; i < all_frames.length; ++i) {
      let t = all_frames[i];
      if (t > DROPPED_FRAME_THRESHOLD_TIME) {
        ++dropped;
      }
      sum += t;
      if (sum > period) {
        break;
      }
    }

    return dropped;
  }

  _on_frame() {
    // so much unnecessary temporary garbage created in this method...

    const now = getNow();
    let elapsed = null;
    if (this._last_frame !== null && now >= this._last_frame) {
      elapsed = now - this._last_frame;
      this._frame_times.enq(elapsed);
    }
    this._last_frame = now;

    this._frame_request = window.requestAnimationFrame(() => {
      this._on_frame();
    });

    this._output.update(elapsed, this);
  }
}

export class PerfPanel extends React.Component<{}, {}> {
  frame_recorder: FrameRecorder;

  constructor() {
    super();
    this.frame_recorder = null;
  }

  componentDidMount() {
    let div = this.refs['output_text'] as HTMLElement;
    let output = new DIVFrameStatsOutput(div);
    this.frame_recorder = new FrameRecorder({output});
    this.frame_recorder.start();
  }

  componentWillUnmount() {
    this.frame_recorder.stop();
    this.frame_recorder = null;
  }

  render() {
    return <div className='perf-panel'>
      <pre ref='output_text'></pre>
    </div>;
  }
}
