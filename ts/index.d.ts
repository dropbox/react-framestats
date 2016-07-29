/// <reference path="../typings/index.d.ts" />
/// <reference path="../typings/circular-buffer.d.ts" />
import React = require('react');
import CircularBuffer = require('circular-buffer');
export declare function recordRender(name: string, reason: string): void;
export interface FrameStatsOutput {
    update(elapsed: number, recorder: FrameRecorder): any;
}
export declare class DIVFrameStatsOutput implements FrameStatsOutput {
    _div: HTMLElement;
    constructor(div: HTMLElement);
    update(elapsed: number, recorder: FrameRecorder): void;
}
export interface FrameRecorderOptions {
    frame_count?: number;
    output: FrameStatsOutput;
}
export declare class FrameRecorder {
    _frame_times: CircularBuffer<number>;
    _last_frame: number;
    _frame_request: number;
    _output: FrameStatsOutput;
    constructor({frame_count, output}: FrameRecorderOptions);
    start(): void;
    stop(): void;
    get_longest_in(period: number): number;
    get_dropped_in(period: number): number;
    _on_frame(): void;
}
export default class PerfPanel extends React.Component<{}, {}> {
    frame_recorder: FrameRecorder;
    constructor();
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): any;
}
