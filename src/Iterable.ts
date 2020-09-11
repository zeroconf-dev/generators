import { createIteratorState } from '@zeroconf/generators/Util';

// prettier-ignore
export type PipeOperator<TInput = unknown, TResult = TInput>
	= (iterable: Iterable<TInput>) => Iterable<TResult>;

// prettier-ignore
export type PipeResult<TInput, TPipeOperators extends readonly any[]>
	= TPipeOperators extends { length: 0 }
		? Iterable<TInput>
		: TPipeOperators extends [...infer _, infer TResult]
		? Iterable<TResult>
		: never
		;

// prettier-ignore
type PreviousPipeOperator<TPipeOperators extends readonly any[], TKey, TInput>
	= TKey extends keyof [TInput, ...TPipeOperators]
		? [TInput, ...TPipeOperators][TKey]
		: never
		;

export type PipeOperators<TInput, TPipeOperators extends readonly any[]> = {
	[TKey in keyof TPipeOperators]: PipeOperator<
		PreviousPipeOperator<TPipeOperators, TKey, TInput>,
		TPipeOperators[TKey]
	>;
};

export function pipe<TInput, TPipeOperators extends readonly any[]>(
	iterable: Iterable<TInput>,
	...operators: PipeOperators<TInput, TPipeOperators>
): PipeResult<TInput, TPipeOperators> {
	const [firstOperator, ...restOpreators] = operators;
	return (firstOperator == null
		? iterable
		: restOpreators.reduce((result, operator) => operator(result), firstOperator(iterable))) as PipeResult<
		TInput,
		TPipeOperators
	>;
}

export function* sequence(from = 0, to = Infinity, step = 1): Iterable<number> {
	for (let i = from; i < to; i += step) {
		yield i;
	}
}

export function* of<T>(value: T): Iterable<T> {
	yield value;
}

export function filter<T>(predicate: (value: T) => boolean) {
	return function* (iterable: Iterable<T>): Iterable<T> {
		for (let element of iterable) {
			if (predicate(element)) {
				yield element;
			}
		}
	};
}

export function take<T>(amount: number) {
	return function* (iterable: Iterable<T>): Iterable<T> {
		let i = 0;
		for (let element of iterable) {
			if (i == amount) {
				return;
			}
			yield element;
			i++;
		}
	};
}

export function takeUntil<T>(predicate: (value: T) => boolean) {
	return function* (iterable: Iterable<T>): Iterable<T> {
		for (let element of iterable) {
			if (!predicate(element)) {
				return;
			}
			yield element;
		}
	};
}

export function first<T>() {
	return function* (iterable: Iterable<T>): Iterable<T> {
		for (let element of iterable) {
			yield element;
			return;
		}
	};
}

export function last<T>() {
	return function* (iterable: Iterable<T>): Iterable<T> {
		const state = createIteratorState<T>();

		for (let value of iterable) {
			state.setValue(value);
		}

		if (state.hasValue) {
			yield state.value;
		}
	};
}

export function min() {
	return function* (iterable: Iterable<number>): Iterable<number> {
		const state = createIteratorState<number>();

		for (let value of iterable) {
			state.setValue(state.hasValue ? Math.min(state.value, value) : value);
		}

		if (state.hasValue) {
			yield state.value;
		}
	};
}

export function max() {
	return function* (iterable: Iterable<number>): Iterable<number> {
		const state = createIteratorState<number>();

		for (let value of iterable) {
			state.setValue(state.hasValue ? Math.max(state.value, value) : value);
		}

		if (state.hasValue) {
			yield state.value;
		}
	};
}

export function map<T, R = T>(mapFn: (value: T) => R) {
	return function* (iterable: Iterable<T>): Iterable<R> {
		for (let element of iterable) {
			yield mapFn(element);
		}
	};
}
