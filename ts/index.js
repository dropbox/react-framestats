/// <reference path='../typings/index.d.ts' />
/// <reference path='../typings/circular-buffer.d.ts' />
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var React = require('react');
var CircularBuffer = require('circular-buffer');
var DEFAULT_FRAME_COUNT = 5 * 60; // five seconds at 60 Hz
// normally I'd say anything over 17ms is a dropped frame,
// but browsers have iffy timing.  so assume anything a bit under two
// frames is a dropped frame.  assumes 60 Hz is the target.
var DROPPED_FRAME_THRESHOLD_TIME = 30; // ms
function getNowFunction() {
    if (typeof performance === 'object' && performance !== null && typeof performance.now === 'function') {
        return function () { return performance.now(); };
    }
    else {
        // Not monotonic, but it probably doesn't matter.
        return function () { return Date.now(); };
    }
}
var getNow = getNowFunction();
// Metrics for diagnosing why renders are happening.
var renderCounts = Object.create(null);
var recentRenders = new CircularBuffer(6);
function recordRender(name, reason) {
    if (name in renderCounts) {
        renderCounts[name]++;
    }
    else {
        renderCounts[name] = 1;
    }
    recentRenders.enq({
        when: getNow(),
        component: name,
        reason: reason
    });
}
exports.recordRender = recordRender;
var DIVFrameStatsOutput = (function () {
    function DIVFrameStatsOutput(div) {
        this._div = div;
    }
    DIVFrameStatsOutput.prototype.update = function (elapsed, recorder) {
        var render_count_array = [];
        for (var component in renderCounts) {
            render_count_array.push({ component: component, render_count: renderCounts[component] });
        }
        render_count_array.sort(function (a, b) { return b.render_count - a.render_count; });
        var render_count_string = '';
        render_count_array.slice(0, 5).forEach(function (_a) {
            var component = _a.component, render_count = _a.render_count;
            render_count_string += "  " + component + ": " + render_count + "\n";
        });
        var recent_render_string = '';
        var rr = recentRenders.toarray();
        rr.forEach(function (_a) {
            var component = _a.component, reason = _a.reason;
            recent_render_string += "  " + component + " because " + reason + "\n";
        });
        this._div.textContent = "Perf Panel\n-----------\nSlowest frame in:\n  Last 1s: " + recorder.get_longest_in(1000) + "\n  Last 5s: " + recorder.get_longest_in(5000) + "\nDropped frames in:\n  Last 1s: " + recorder.get_dropped_in(1000) + "\n  Last 5s: " + recorder.get_dropped_in(5000) + "\nRender counts:\n" + render_count_string.replace(/\s+$/g, '') + "\nRecent renders:\n" + recent_render_string.replace(/\s+$/g, '');
    };
    return DIVFrameStatsOutput;
}());
exports.DIVFrameStatsOutput = DIVFrameStatsOutput;
// While started, records frame times, up to the last N frames.
var FrameRecorder = (function () {
    function FrameRecorder(_a) {
        var _b = _a.frame_count, frame_count = _b === void 0 ? DEFAULT_FRAME_COUNT : _b, output = _a.output;
        this._frame_times = new CircularBuffer(frame_count);
        this._last_frame = null;
        this._frame_request = null;
        this._output = output;
    }
    FrameRecorder.prototype.start = function () {
        var _this = this;
        if (this._frame_request === null) {
            this._frame_request = window.requestAnimationFrame(function () {
                _this._on_frame();
            });
        }
    };
    FrameRecorder.prototype.stop = function () {
        if (this._frame_request !== null) {
            window.cancelAnimationFrame(this._frame_request);
            this._frame_request = null;
        }
    };
    FrameRecorder.prototype.get_longest_in = function (period) {
        // TODO: allocation of this array produces some unnecessary garbage.
        // we could iterate directly across the circular buffer.
        var all_frames = this._frame_times.toarray();
        if (all_frames.length === 0) {
            return null;
        }
        var max = 0;
        var sum = 0;
        for (var i = 0; i < all_frames.length; ++i) {
            var t = all_frames[i];
            max = Math.max(max, t);
            sum += t;
            if (sum > period) {
                break;
            }
        }
        return max;
    };
    FrameRecorder.prototype.get_dropped_in = function (period) {
        // TODO: allocation of this array produces some unnecessary garbage.
        // we could iterate directly across the circular buffer.
        var all_frames = this._frame_times.toarray();
        if (all_frames.length === 0) {
            return 0;
        }
        var dropped = 0;
        var sum = 0;
        for (var i = 0; i < all_frames.length; ++i) {
            var t = all_frames[i];
            if (t > DROPPED_FRAME_THRESHOLD_TIME) {
                ++dropped;
            }
            sum += t;
            if (sum > period) {
                break;
            }
        }
        return dropped;
    };
    FrameRecorder.prototype._on_frame = function () {
        // so much unnecessary temporary garbage created in this method...
        var _this = this;
        var now = getNow();
        var elapsed = null;
        if (this._last_frame !== null && now >= this._last_frame) {
            elapsed = now - this._last_frame;
            this._frame_times.enq(elapsed);
        }
        this._last_frame = now;
        this._frame_request = window.requestAnimationFrame(function () {
            _this._on_frame();
        });
        this._output.update(elapsed, this);
    };
    return FrameRecorder;
}());
exports.FrameRecorder = FrameRecorder;
var PerfPanel = (function (_super) {
    __extends(PerfPanel, _super);
    function PerfPanel() {
        _super.call(this);
        this.frame_recorder = null;
    }
    PerfPanel.prototype.componentDidMount = function () {
        var div = this.refs['output_text'];
        var output = new DIVFrameStatsOutput(div);
        this.frame_recorder = new FrameRecorder({ output: output });
        this.frame_recorder.start();
    };
    PerfPanel.prototype.componentWillUnmount = function () {
        this.frame_recorder.stop();
        this.frame_recorder = null;
    };
    PerfPanel.prototype.render = function () {
        return React.createElement("div", {className: 'perf-panel'}, React.createElement("pre", {ref: 'output_text'}));
    };
    return PerfPanel;
}(React.Component));
exports.__esModule = true;
exports["default"] = PerfPanel;
