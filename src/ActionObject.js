/*
 * ActionObject for nor-extend, with events
 */

"use strict";

import events from "events";
import extend from "./extend.js";

const PRIVATE = {
	save: Symbol('_save'),
	results: Symbol('_results')
};

/** Setup public actions
 *
 * @param key {string|symbol}
 * @returns {function(...[*]=): (*|*)}
 */
function buildPublicMethod (key) {
	return function (...args) {
		const p = this[key](...args).then(data => this[PRIVATE.save](data));
		return extend.promise(this.constructor, p);
	};
}

/**
 *
 */
export default class ActionObject extends events.EventEmitter {

	/** Base class for chainable action objects
	 *
	 */
	constructor () {
		super();
		this[PRIVATE.results] = [];
	}

	/** Save result into the internal queue
	 *
	 * @param result
	 * @returns {ActionObject}
	 * @private
	 */
	[PRIVATE.save] (result) {
		this[PRIVATE.results].push( result );
		return this;
	}

	/** Fetch all resources
	 *
	 * @returns {Array}
	 */
	fetchAll () {
		const all = this[PRIVATE.results];
		this[PRIVATE.results] = [];
		return all;
	}

	/** Fetch next result from the internal result array
	 *
	 * @returns {*}
	 */
	fetch () {
		return this[PRIVATE.results].shift();
	}

	/** Setup new action
	 *
	 * @param ChildType
	 * @param key
	 * @param func
	 */
	static setup (ChildType, key, func) {
		const privateSymbol = Symbol(key);
		ChildType.prototype[key] = buildPublicMethod(privateSymbol);
		ChildType.prototype[privateSymbol] = func;
		return privateSymbol;
	}

}
