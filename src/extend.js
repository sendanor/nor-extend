/* Generic Node.js Database Library */
"use strict";

var ARRAY = require('nor-array');
var Q = require('q');
var is = require('nor-is');

/** Copy object */
function extend_copy(obj) {
	return JSON.parse(JSON.stringify(obj));
}

/** Get method names from an object's constructor
 * @param {function} Object constructor function
 * @returns {array} Method names
 */
function get_method_names_from_constructor() {
	var ret = [];
	var args = Array.prototype.slice.call(arguments);
	ARRAY(args).forEach(function(fun) {
		if(is.array(fun)) {
			ARRAY(fun).forEach(function(x) { ret.push.apply(ret, get_method_names_from_constructor(x)); });
			return;
		}
		if(fun && fun.prototype) {
			ret.push.apply(ret, Object.getOwnPropertyNames(fun.prototype));
		}
	});
	return ret;
}

/* Parse array of constructor functions */
function get_all_methods(arr) {
	return ARRAY(arr).map(function(m) {
		return get_method_names_from_constructor(m);
	}).reduce(function(prev, current) {
		return prev.concat(current);
	}, ARRAY([]) ).valueOf();
}

/** Setup function */
function setup(opts) {
	opts = opts || {};

	var extend = {};
	extend.setup = setup;
	extend.warnings = opts.warnings || false;
	extend.useFunctionPromises = opts.useFunctionPromises || false;
	extend.getMethodNamesFromConstructor = get_method_names_from_constructor;

	/** Extended promise constructor */
	function ExtendedPromise() {
		//debug_call('ExtendedPromise', Array.prototype.slice.call(arguments) );
	}

	/** Creates extended promise */
	ExtendedPromise.create = function() {
		if(!extend.useFunctionPromises) {
			return new ExtendedPromise();
		}

		var p = new ExtendedPromise();
		var f = function() {
			var args = Array.prototype.slice.call(arguments);
			return f.then(function(ff) {
				return ff.apply(f, args);
			});
		};
		f._promise = p;
		return f;
	};

	/** Returns `true` if argument is extended promise */
	ExtendedPromise.test = function(f) {
		if(extend.useFunctionPromises) {
			return (f && (f._promise instanceof ExtendedPromise)) ? true : false;
		} else {
			return (f instanceof ExtendedPromise) ? true : false;
		}
	};

	extend.Promise = ExtendedPromise;
	extend.ExtendedPromise = ExtendedPromise;

	/** Get method names from an object's prototype
	 * @param {object} Object where to get method names
	 * @returns {array} Method names
	 */
	extend.getMethodNamesFromObject = function(obj) {
		//debug_call('extend.getMethodNamesFromObject', Array.prototype.slice.call(arguments) );
		if(obj && obj.constructor) {
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
	extend.object = function(self2, methods, obj) { // original extend_obj()
		//debug_call('extend.object', Array.prototype.slice.call(arguments) );

		// Enable auto detection of optional methods parameter
		if(obj === undefined) {
			return extend.object(self2, extend.getMethodNamesFromObject(self2), methods);
		}

		// Implement style extend.object(foo, [Foobar, Array], bar)
		if(is.array(methods) && is.callable(methods[0])) {
			return extend.object(self2, get_all_methods(methods) , obj);
		}

		// Implement style extend.object(foo, Array, obj)
		if(is.callable(methods)) {
			return extend.object(self2, extend.getMethodNamesFromConstructor(methods) , obj);
		}

		//
		ARRAY(methods).forEach(function(key) {
			if(obj['$'+key] !== undefined) {
				if(extend.warnings) { console.warn("Warning! Ignored `$"+key+"` since it is defined already!"); }
				return;
			}
			if(self2[key] === undefined) {
				if(extend.warnings) { console.warn("Warning! Ignored method `"+key+"` since it is not defined in the target object!"); }
				return;
			}
			obj['$'+key] = self2[key].bind(self2);

			if(obj[key] === undefined) {
				obj[key] = obj['$'+key];
			} else {
				if(extend.warnings) { console.warn("Warning! Ignored method `"+key+"` since it is defined already!"); }
			}
		});
		return obj;
	};

	/** Extend promises with our custom methods
	 * @param methods {Function|Array} The custom method names as array of strings or constructor function where to read them
	 * @param p {Promise} The generic promise object
	 * @returns {object} An object which has methods from both the Promise and all custom methods.
	 */
	extend.promise = function(methods, p) { // original extend_promise
		//debug_call('extend.promise(', Array.prototype.slice.call(arguments) );

		// Implement style extend.promise([Foobar, Array], p)
		if(is.array(methods) && is.callable(methods[0])) {
			return extend.promise( get_all_methods(methods) , p);
		}

		// Implement style extend.promise(Array, p)
		if(is.callable(methods)) {
			return extend.promise( extend.getMethodNamesFromConstructor(methods) , p);
		}

		/** Extend the value if it's a promise, otherwise just return it instead.
		 * @returns the extended promise or the value itself.
		 */
		function extend_if_promise(methods, ret) {
			//debug_call('extend.promise: extend_if_promise', Array.prototype.slice.call(arguments) );
			if(ExtendedPromise.test(ret)) {
				return ret;
			}
			if(ret && ret.then) {                                 // Check if return value is promise compatible
				return extend.promise(methods, ret);              // ..and if so, extend it, too.
			}
			return ret;                                           // ..and if not, return the same value.
		}

		var promise_methods = extend.getMethodNamesFromConstructor(Q.makePromise);

		var p2 = ExtendedPromise.create();

		// Setup proxy methods for Promise type
		ARRAY(promise_methods).forEach(function(key) {

			// Ignore this method if it has been defined already
			if(p2[key] !== undefined) {
				if(extend.warnings) { console.warn("Warning! Ignored method `"+key+"` since it was already defined! (#2)"); }
				return;
			}

			/* Setups a proxy method that will call p[key] with same arguments as the proxy function was called.
			 * If that call returns a promise, we'll extend it too, otherwise it returns the same value.
			 */
			p2[key] = function() {
				//debug_call('extend.promise: p2.'+key, Array.prototype.slice.call(arguments) );
				var args = Array.prototype.slice.call(arguments);

				// Call p[key] with same arguments and extend the result if it's a promise.
				//return extend_if_promise( methods, p[key].apply(p, args) );

				//var ret = p[key].apply(p, args);

				var ret;
				ret = p[key].apply(p, args);
				return extend_if_promise( methods, ret );
			};

		});

		// Setup other custom proxy methods
		ARRAY(methods).forEach(function(key) {

			// Ignore this method if it has been defined already
			if(p2['$'+key] !== undefined) {
				if(extend.warnings) { console.warn("Warning! Ignored method `$"+key+"` since it was already defined!"); }
				return;
			}

			/* Setups a proxy method that will call `p.then(function(obj) { obj[key](...) }` with same arguments as the proxy function was called.
			 * Returns a promise which also will be extended recursively.
			 */
			p2['$'+key] = function() {
				//debug_call('extend.promise: p2.$'+key, Array.prototype.slice.call(arguments) );

				var args = Array.prototype.slice.call(arguments);

				var ret = p.then(function(obj) {                   // Get a promise of calling obj[key] with same arguments as the proxy
					//debug_call('extend.promise: p2.$'+key+': p.then', Array.prototype.slice.call(arguments) );
					if(obj && is.callable(obj[key]) ) {            // Check if obj[key] is callable
						return extend_if_promise( extend.getMethodNamesFromObject(obj), obj[key].apply(obj, args));          // ...and if so, call obj[key] with same arguments
					} else if(obj && (typeof obj[key] !== "undefined")) {
						return obj[key];                           // ...otherwise just return obj[key]
					} else {
						throw new ReferenceError("Cannot call property "+key+" of "+obj);
					}
				});

				// Returned promise will be extended, too.
				return extend_if_promise(methods, ret);
			};

			// Ignore alias if it's already set, otherwise set it
			if(p2[key] !== undefined) {
				if(extend.warnings) { console.warn("Warning! Ignored alias method `"+key+"` for `$'+key+'` since it was already defined!"); }
			} else {
				p2[key] = p2['$'+key];
			}

		});

		return p2;
	};

	/** Copy object */
	extend.copy = extend_copy;

	return extend;
}

module.exports = setup();

/* EOF */