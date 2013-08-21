/* Generic Node.js Database Library */
"use strict";

var Q = require('q');
var is = require('nor-is');

var extend = module.exports = {};

/** Get method names from an object's constructor
 * @param {function} Object constructor function
 * @returns {array} Method names
 */
extend.getMethodNamesFromConstructor = function(fun) {
	if(fun && fun.prototype) {
		return Object.getOwnPropertyNames(fun.prototype).filter(function(x) { return (( (x === 'constructor') || (x === 'toString') ) ? false : true); });
	}
	return [];
};

/** Get method names from an object's prototype
 * @param {object} Object where to get method names
 * @returns {array} Method names
 */
extend.getMethodNamesFromObject = function(obj) {
	return extend.getMethodNamesFromConstructor(obj.constructor);
};

/** Extend an object with our methods from other object
 * @param self2 {Object} Original object
 * @param methods {Array} Which method names to extend
 * @param obj {Object} Object where we set proxy functions which will call methods from self2
 * @returns {Object} extended object
 */
extend.object = function(self2, methods, obj) { // original extend_obj()
	methods.forEach(function(key) {
		if(obj[key] !== undefined) { return; }
		obj[key] = self2[key].bind(self2);
	});
	return obj;
};

/** Extend promises with our custom methods
 * @param methods {array} The custom method names as array of strings
 * @param p {Promise} The generic promise object
 * @returns {object} An object which has methods from both the Promise and all custom methods.
 */
extend.promise = function(methods, p) { // original extend_promise

	/** Extend the value if it's a promise, otherwise just return it instead.
	 * @returns the extended promise or the value itself.
	 */
	function extend_if_promise(methods, ret) {
		if(ret && ret.then) {                                 // Check if return value is promise compatible
			return extend.promise(methods, ret);              // ..and if so, extend it, too.
		}
		return ret;                                           // ..and if not, return the same value.
	}

	var promise_methods = extend.getMethodNamesFromConstructor(Q.makePromise);

	var p2 = {};
	
	// Setup proxy methods for Promise type
	promise_methods.forEach(function(key) {

		// Ignore this method if it has been defined already
		if(p2[key] !== undefined) {
			console.warn("Warning! Ignored method `"+key+"` since it was already defined! (#2)");
			return;
		}

		/* Setups a proxy method that will call p[key] with same arguments as the proxy function was called.
		 * If that call returns a promise, we'll extend it too, otherwise it returns the same value.
		 */
		p2[key] = function() {
			var args = Array.prototype.slice.call(arguments);

			// Call p[key] with same arguments and extend the result if it's a promise.
			//return extend_if_promise( methods, p[key].apply(p, args) );
			var ret = p[key].apply(p, args);
			return extend_if_promise( methods, ret );

		};
	});
	
	// Setup other custom proxy methods
	methods.forEach(function(key) {

		// Ignore this method if it has been defined already
		if(p2[key] !== undefined) {
			console.warn("Warning! Ignored method `"+key+"` since it was already defined!");
			return;
		}

		/* Setups a proxy method that will call `p.then(function(obj) { obj[key](...) }` with same arguments as the proxy function was called.
		 * Returns a promise which also will be extended recursively.
		 */
		p2[key] = function() {
			var args = Array.prototype.slice.call(arguments);

			var ret = p.then(function(obj) {                   // Get a promise of calling obj[key] with same arguments as the proxy
				if(obj && is.callable(obj[key]) ) {            // Check if obj[key] is callable
					return extend_if_promise( extend.getMethodNamesFromObject(obj), obj[key].apply(obj, args));          // ...and if so, call obj[key] with same arguments
				} else {
					return obj[key];                           // ...otherwise just return obj[key]
				}
			});
			
			// Returned promise will be extended, too.
			return extend_if_promise(methods, ret);
		};
	});

	return p2;
};

/* EOF */
