declare module 'circular-buffer' {
    class CircularBuffer<T> {
        constructor(capacity: number);
        size(): number;
        capacity(): number;
        enq(value: T): void;
        deq(): T;
        get(idx: number): T;
        get(start, end): T[];
        toarray(): T[];
    }
    export = CircularBuffer;
}
