import {Stream} from 'xstream';
import {Source as CallbagStream} from 'callbag';
import {setup as coreSetup, DisposeFunction, Drivers, GetValidInputs, Main, Sinks, Sources, WidenStream} from '@cycle/run';
import {setAdapt} from '@cycle/run/lib/adapt';

const fromObs = require('callbag-from-obs');

export type ToCallbagStream<S> = S extends Stream<infer T> ? CallbagStream<T> : S;
export type ToCallbagStreams<S> = {[k in keyof S]: ToCallbagStream<S[k]>};

export type MatchingMain<D extends Drivers, M extends Main> =
    | Main & {
    (so: ToCallbagStreams<Sources<D>>): Sinks<M>;
}
    | Main & {
    (): Sinks<M>;
};

export type ToStream<S> = S extends CallbagStream<infer T> ? Stream<T> : S;

export type MatchingDrivers<D extends Drivers, M extends Main> = Drivers &
    {
        [k in string & keyof Sinks<M>]:
        | (() => Sources<D>[k])
        | ((
        si: Stream<WidenStream<ToStream<Sinks<M>[k]>, GetValidInputs<D[k]>>>
    ) => Sources<D>[k])
    };

export interface CycleProgram<
    D extends MatchingDrivers<D, M>,
    M extends MatchingMain<D, M>
    > {
    sources: ToCallbagStream<Sources<D>>;
    sinks: Sinks<M>;
    run(): DisposeFunction;
}

export interface Engine<D extends Drivers> {
    sources: Sources<D>;
    run<M extends MatchingMain<D, M>>(sinks: Sinks<M>): DisposeFunction;
    dispose(): void;
}

setAdapt(function adaptXstreamToMost(stream: Stream<any>): CallbagStream<any> {
    return fromObs(stream as any);
});

export function run<
    D extends MatchingDrivers<D, M>,
    M extends MatchingMain<D, M>
    >(main: M, drivers: D): DisposeFunction {
    const program = coreSetup(main, drivers as any);
    return program.run();
}

export function setup<
    D extends MatchingDrivers<D, M>,
    M extends MatchingMain<D, M>
    >(main: M, drivers: D): CycleProgram<D, M> {
    return coreSetup(main, drivers as any) as any;
}

export default run;
