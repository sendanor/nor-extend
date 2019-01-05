/* Extends promises with custom methods from another object
 * Copyright 2014-2019 Jaakko-Heikki Heusala <jheusala@iki.fi>
 */

"use strict";

import is from '@norjs/is';

const PRIVATE = {
	promise: Symbol('_promise')
};

const PROMISE_METHODS = [
	'then',
	'catch',
	'fail',
	'finally',
	'done',
	'fin'
];

/** Copy object */
function extendCopy (obj) {
	return JSON.parse(JSON.stringify(obj));
}

/** Get method names from an object's constructor
 * @returns {Array} Method names
 * @param args
 */
function getMethodNamesFromConstructor (...args) {
	let ret = [];
	args.forEach(fun => {
		if (is.array(fun)) {
			fun.forEach(x => {
				const retPushArgs = getMethodNamesFromConstructor(x);
				ret.push(...retPushArgs);
			});
			return;
		}
		if (fun && fun.prototype) {
			const retPushArgs = Object.getOwnPropertyNames(fun.prototype);
			ret.push(...retPushArgs);
		}
	});
	return ret;
}

/** Parse array of constructor functions
 *
 * @param arr {Array}
 * @returns {*}
 */
function getAllMethods (arr) {
	return arr.map(m => getMethodNamesFromConstructor(m)).reduce(( prev, current ) => prev.concat(current), [] );
}

/** Setup function
 *
 * @param warnings {boolean}
 * @param useFunctionPromises {boolean}
 */
function setup ({
    warnings = false,
    useFunctionPromises = false
} = {}) {

	let extend = {};
	extend.setup = setup;
	extend.warnings = warnings;
	extend.useFunctionPromises = useFunctionPromises;
	extend.getMethodNamesFromConstructor = getMethodNamesFromConstructor;

	/** Extended promise constructor */
	class ExtendedPromise {

		/** Creates extended promise
		 *
		 * @returns {*}
		 */
		static create () {

			if (!extend.useFunctionPromises) {
				return new ExtendedPromise();
			}

			let p = new ExtendedPromise();
			let f = ( ...args ) => f.then(ff => ff.apply(f, args));
			f[PRIVATE.promise] = p;
			return f;
		}

		/** Returns `true` if argument is extended promise
		 *
		 * @param f
		 * @returns {boolean}
		 */
		static test (f) {
			if (extend.useFunctionPromises) {
				return !!(f && (f[PRIVATE.promise] instanceof ExtendedPromise));
			} else {
				return f instanceof ExtendedPromise;
			}
		}

	}

	extend.Promise = ExtendedPromise;
	extend.ExtendedPromise = ExtendedPromise;

	/** Get method names from an object's prototype
	 * @param obj {object} where to get method names
	 * @returns {array} Method names
	 */
	extend.getMethodNamesFromObject = obj => {
		if (obj && obj.constructor) {
			return extend.getMethodNamesFromConstructor(obj.constructor);
		}
		return [];
	};

	/** Extend an object with our methods from other object
	 * @param self2 {Object} Original object
	 * @param methods {Array} Which method names to extend
	 * @param obj {Object} Object where we set proxy functions which will call methods from self2
	 * @returns {Object} extended object
	 * @todo Returned new object should be complete new object so parameter `obj` WOULD NOT BE CHANGED!
	 */
	extend.object = ( self2, methods, obj ) => { // original extend_obj()

		// Enable auto detection of optional methods parameter
		if (obj === undefined) {
			return extend.object(self2, extend.getMethodNamesFromObject(self2), methods);
		}

		// Implement style extend.object(foo, [Foobar, Array], bar)
		if (is.array(methods) && is.callable(methods[0])) {
			return extend.object(self2, getAllMethods(methods) , obj);
		}

		// Implement style extend.object(foo, Array, obj)
		if (is.callable(methods)) {
			return extend.object(self2, extend.getMethodNamesFromConstructor(methods) , obj);
		}

		//
		methods.forEach(key => {
			if (obj['$'+key] !== undefined) {
				if (extend.warnings) { console.warn("Warning! Ignored `$"+key+"` since it is defined already!"); }
				return;
			}
			if (self2[key] === undefined) {
				if (extend.warnings) { console.warn("Warning! Ignored method `"+key+"` since it is not defined in the target object!"); }
				return;
			}
			obj['$'+key] = self2[key].bind(self2);

			if (obj[key] === undefined) {
				obj[key] = obj['$'+key];
			} else {
				if (extend.warnings) { console.warn("Warning! Ignored method `"+key+"` since it is defined already!"); }
			}
		});
		return obj;
	};

	/** Extend promises with our custom methods
	 * @param methods {Function|Array} The custom method names as array of strings or constructor function where to read them
	 * @param p {Promise} The generic promise object
	 * @returns {object} An object which has methods from both the Promise and all custom methods.
	 */
	extend.promise = ( methods, p ) => { // original extend_promise
		//debug_call('extend.promise(', Array.prototype.slice.call(arguments) );

		// Implement style extend.promise([Foobar, Array], p)
		if (is.array(methods) && is.callable(methods[0])) {
			return extend.promise( getAllMethods(methods) , p);
		}

		// Implement style extend.promise(Array, p)
		if (is.callable(methods)) {
			return extend.promise( extend.getMethodNamesFromConstructor(methods) , p);
		}

		/** Extend the value if it's a promise, otherwise just return it instead.
		 * @returns the extended promise or the value itself.
		 */
		function extendIfPromise (methods, ret) {
			if (ExtendedPromise.test(ret)) {
				return ret;
			}
			if (ret && ret.then) {                                 // Check if return value is promise compatible
				return extend.promise(methods, ret);              // ..and if so, extend it, too.
			}
			return ret;                                           // ..and if not, return the same value.
		}

		let p2 = ExtendedPromise.create();

		// Setup proxy methods for Promise type
		PROMISE_METHODS.forEach(key => {

			// Ignore this method if it has been defined already
			if (p2[key] !== undefined) {
				if (extend.warnings) { console.warn("Warning! Ignored method `"+key+"` since it was already defined! (#2)"); }
				return;
			}

			// Setups a proxy method that will call p[key] with same arguments as the proxy function was called.
			// If that call returns a promise, we'll extend it too, otherwise it returns the same value.
			if (is.callable(p[key])) {
				p2[key] = ( ...args ) => {
					const ret = p[key](...args);
					return extendIfPromise( methods, ret );
				};
			}

		});

		// Setup other custom proxy methods
		methods.forEach(key => {

			// Ignore this method if it has been defined already
			if (p2['$'+key] !== undefined) {
				if (extend.warnings) { console.warn("Warning! Ignored method `$"+key+"` since it was already defined!"); }
				return;
			}

			/* Setups a proxy method that will call `p.then(function(obj) { obj[key](...) }` with same arguments as the proxy function was called.
			 * Returns a promise which also will be extended recursively.
			 */
			p2['$'+key] = ( ...args ) => {
				//debug_call('extend.promise: p2.$'+key, Array.prototype.slice.call(arguments) );

				let ret = p.then(obj => {                   // Get a promise of calling obj[key] with same arguments as the proxy
					if (obj && is.callable(obj[key]) ) {            // Check if obj[key] is callable
						return extendIfPromise( extend.getMethodNamesFromObject(obj), obj[key](...args) );          // ...and if so, call obj[key] with same arguments
					} else if (obj && (typeof obj[key] !== "undefined")) {
						return obj[key];                           // ...otherwise just return obj[key]
					} else {
						throw new ReferenceError("Cannot call property "+key+" of "+obj);
					}
				});

				// Returned promise will be extended, too.
				return extendIfPromise(methods, ret);
			};

			// Ignore alias if it's already set, otherwise set it
			if (p2[key] !== undefined) {
				if (extend.warnings) { console.warn("Warning! Ignored alias method `"+key+"` for `$'+key+'` since it was already defined!"); }
			} else {
				p2[key] = p2['$'+key];
			}

		});

		return p2;
	};

	/** Copy object */
	extend.copy = extendCopy;

	return extend;
}

const extend = setup();

export default extend;
