type IterableStateValue<T> = {
	value: T;
	hasValue: true;
	setValue: (value: T) => void;
};
type IterableStatePending<T> = {
	value: undefined;
	hasValue: false;
	setValue: (value: T) => void;
};

type IterableState<T> = IterableStateValue<T> | IterableStatePending<T>;

export function createIteratorState<T>(): IterableState<T> {
	const result: IterableState<T> = {
		hasValue: false,
		value: undefined,
		setValue: (value: T) => {
			result.value = value;
			result.hasValue = true;
		},
	};

	return result;
}

export async function destreamify<T>(stream: AsyncIterable<T>, callback: (value: T) => void): Promise<void> {
	for await (let value of stream) {
		callback(value);
	}
}

export const sleep = (millis: number) => new Promise((resolve) => millis === 0 ? process.nextTick(resolve) : setTimeout(resolve, millis));
