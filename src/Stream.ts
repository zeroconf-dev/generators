import { createIteratorState, destreamify, sleep } from '@zeroconf/generators/Util';

// prettier-ignore
export type AsyncPipeOperator<TInput = unknown, TResult = TInput>
	= (stream: AsyncIterable<TInput>) => AsyncIterable<TResult> | PromiseLike<AsyncIterable<TResult>>;

// prettier-ignore
export type AsyncPipeResult<TInput, TAsyncPipeOperators extends readonly any[]>
	= TAsyncPipeOperators extends { length: 0 }
		? AsyncIterable<TInput>
		: TAsyncPipeOperators extends [...infer _, infer TResult]
		? AsyncIterable<TResult>
		: never
		;

// prettier-ignore
type PreviousPipeOperator<TPipeOperators extends readonly any[], TKey, TInput>
	= TKey extends keyof [TInput, ...TPipeOperators]
		? [TInput, ...TPipeOperators][TKey]
		: never
		;

export type AsyncPipeOperators<TInput, TAsyncPipeOperators extends readonly any[]> = {
	[TKey in keyof TAsyncPipeOperators]: AsyncPipeOperator<
		PreviousPipeOperator<TAsyncPipeOperators, TKey, TInput>,
		TAsyncPipeOperators[TKey]
	>;
};

export function pipe<TInput, TAsyncPipeOperators extends readonly any[]>(
	stream: AsyncIterable<TInput>,
	...operators: AsyncPipeOperators<TInput, TAsyncPipeOperators>
): AsyncPipeResult<TInput, TAsyncPipeOperators> {
	const [firstOperator, ...restOperators] = operators;
	return (firstOperator == null
		? stream
		: restOperators.reduce(async function* (result, operator) {
				yield* await operator(await result);
		  }, firstOperator(stream))) as AsyncPipeResult<TInput, TAsyncPipeOperators>;
}

export async function* sequence(from = 0, to = Infinity, step = 1): AsyncIterable<number> {
	for (let i = from; i < to; i += step) {
		yield i;
	}
}

export async function* of<T>(value: T): AsyncIterable<T> {
	yield value;
}

export function delay<T>(millis: number) {
	return async function* (stream: AsyncIterable<T>): AsyncIterable<T> {
		for await (let value of stream) {
			await sleep(millis);
			yield value;
		}
	};
}

export function filter<T>(predicate: (value: T) => boolean | PromiseLike<boolean>) {
	return async function* (stream: AsyncIterable<T>): AsyncIterable<T> {
		for await (let value of stream) {
			if (await predicate(value)) {
				yield value;
			}
		}
	};
}

export function take<T>(amount: number) {
	return async function* (stream: AsyncIterable<T>): AsyncIterable<T> {
		let i = 0;
		for await (let value of stream) {
			if (i === amount) {
				return;
			}
			yield value;
			i++;
		}
	};
}

export function map<T, R = T>(mapFn: (value: T) => R) {
	return async function* (stream: AsyncIterable<T>): AsyncIterable<R> {
		for await (let value of stream) {
			yield mapFn(value);
		}
	};
}

export function mapTo<T, R>(value: R) {
	return async function* (stream: AsyncIterable<T>): AsyncIterable<R> {
		for await (let _ of stream) {
			yield value;
		}
	}
}

export function throttle<T>(millis: number) {
	return async function* (stream: AsyncIterable<T>): AsyncIterable<T> {
		let lastTime: number | null = null, thisTime: number;
		for await (let value of stream) {
			thisTime = Date.now();
			if (lastTime == null || thisTime - lastTime > millis) {
				lastTime = thisTime;
				yield value;
			}
		}
	};
}

export function debounce<T>(millis: number) {
	return async function* (stream: AsyncIterable<T>): AsyncIterable<T> {
		let deferred!: Promise<T>,
			lastValue: T | undefined = undefined,
			promiseResolve: (value: T) => void,
			timeId: ReturnType<typeof setTimeout> | undefined = undefined;

		const reset = () => {
			lastValue = undefined;
			deferred = new Promise(resolve => promiseResolve = resolve);
			if (timeId !== undefined) {
				clearInterval(timeId);
				timeId = undefined;
			}
		};

		const passValue = () => {
			if (timeId !== undefined) {
				clearTimeout(timeId);
			}

			timeId = setTimeout(() => {
				promiseResolve(lastValue!);
				reset();
			}, millis);
		};

		reset();

		destreamify(stream, (value) => {
			lastValue = value;
			passValue();
		});

		while (true) {
			yield deferred;
		}
	}
}

export function max() {
	return async function* (stream: AsyncIterable<number>): AsyncIterable<number> {
		const state = createIteratorState<number>();

		for await (let value of stream) {
			state.setValue(state.hasValue ? Math.max(state.value, value) : value);
		}

		if (state.hasValue) {
			yield state.value;
		}
	}
}

export function min() {
	return async function* (stream: AsyncIterable<number>): AsyncIterable<number> {
		const state = createIteratorState<number>();

		for await (let value of stream) {
			state.setValue(state.hasValue ? Math.min(state.value, value) : value);
		}

		if (state.hasValue) {
			yield state.value;
		}
	}
}

export function first<T>() {
	return async function* (stream: AsyncIterable<T>): AsyncIterable<T> {
		for await (let value of stream) {
			yield value;
			return;
		}
	}
}

export function last<T>() {
	return async function* (stream: AsyncIterable<T>): AsyncIterable<T> {
		const state = createIteratorState<T>();

		for await (let value of stream) {
			state.setValue(value);
		}

		if (state.hasValue) {
			yield state.value;
		}
	}
}

export async function* concat<S extends readonly AsyncIterable<any>[]>(...streams: S): AsyncIterable<S extends AsyncIterable<infer R>[] ? R : never> {
	for (let stream of streams) {
		yield* stream;
	}
}

export async function* interval(millis: number) {
	for (let i = 0;; i++) {
		await sleep(millis);
		yield i;
	}
}

type AsyncCombineResult<S extends readonly any[]>
	= S extends AsyncIterable<infer R>[]
		? R
		: never;

export async function* race<S extends readonly AsyncIterable<any>[]>(...streams: S): AsyncIterable<AsyncCombineResult<S>> {
	let promiseIndex: number | null = null;

	// fetch an async iterator per stream.
	const iterators = streams.map(stream => stream[Symbol.asyncIterator]());

	// pull an iterator result per async iterator,
	// store the index of the iterator that first succeeds.
	const promisedValues = iterators.map(
		(iterator, idx) =>
			iterator.next().then(value => {
				if (promiseIndex == null) {
					promiseIndex = idx;
				}
				return value;
			}),
	);

	// race for completion and find the iterator that won.
	let result = await Promise.race(promisedValues);
	if (promiseIndex == null) {
		throw new TypeError('First value found, but no promiseIndex was set.');
	}
	const iterator = iterators[promiseIndex];

	do {
		if (result.done) {
			return;
		}
		yield result.value;
	} while (result = await iterator.next());
}
