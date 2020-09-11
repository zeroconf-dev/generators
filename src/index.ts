// import * as sync from './sync';
import * as async from '@zeroconf/generators/Stream';

// const sequence100 = sync.sequence(0, 100);
// const even = sync.filter<number>((x) => x % 2 === 0);
// const double = sync.map<number>((x) => x * 2);
// const take10 = sync.take<number>(10);
// const _toString = sync.map<unknown, string>((x) => String(x));

// console.log('Sync pipe\n');
// // prettier-ignore
// const pipe = sync.pipe(
// 	sequence100,
// 	even,
// 	take10,
// 	double,
// 	_toString,
// );

// for (let e of pipe) {
// 	console.log(e);
// } // 0 4 8 12 16 20 24 28 32 36

//for (let e of sync.pipe(
//	sequence100,
//	even,
//	take10,
//	_toString,
//	double, // Error: PipeOperator<number> is not assignable to PipeOperator<unknown, string>
//)) {
//	console.log(e);
//} // ERROR

// for (let e of sync.pipe(sync.of(2))) {
// 	console.log(e);
// } // 2

console.log('\n\nAsync pipe\n');
async function main(): Promise<void> {
	// const sequence100 = async.sequence(0, 100); // 0...100
	// // const delay100 = async.delay<number>(50);
	// // const debounce100 = async.debounce<number>(100);
	// const take6 = async.take<number>(6);
	// const triple = async.map<number>((x) => x * 3);
	// const toString = async.map<number, string>((x) => String(x));
	// const zeroPad = async.map<string>((x) => x.padStart(2, '0'));

	// // prettier-ignore
	// const pipe = async.pipe(
	// 	sequence100,
	// 	take6,
	// 	// delay100,
	// 	// debounce100,
	// 	async.min(),
	// 	triple,
	// 	toString,
	// 	zeroPad,
	// );

	const pipe =
		async.pipe(
			async.interval(0),
			async.take<number>(1000000000),
		);

	for await (let element of pipe) {
		console.log(element);
	}
}

main(); // 00... 03... 06... 09... 12... 15
