/** */

var extend = require('./extend.js');

/** Setup public actions */
function build_public_method(key) {
	//console.error('CALL: build_public_method('+ util.inspect(key) +') at ' + __filename + ':11');
	return function() {
		//console.error('CALL: unnamed() inside build_public_method('+ util.inspect(key) +') at ' + __filename + ':14');
		var self = this;
		var args = Array.prototype.slice.call(arguments);
		var p = self[key].apply(self, args).then(function(data) {
			return self._save( data );
		});
		return extend.promise(self.constructor, p);
	};
}

/** Base class for chainable action objects */
function ActionObject() {
	this._results = [];
}

/** Save result into the internal queue */
ActionObject.prototype._save = function(result){
	var self = this;
	this._results.push( result );
	return self;
};

/** Fetch all resources */
ActionObject.prototype.fetchAll = function(){
	var self = this;
	var all = this._results;
	this._results = [];
	return all;
};

/** Fetch next result from the internal result array */
ActionObject.prototype.fetch = function(){
	var self = this;
	return this._results.shift();
};

/** Setup new action */
ActionObject.setup = function(ChildType, key, func) {
	ChildType.prototype[key] = build_public_method('_'+key);
	ChildType.prototype['_'+key] = func;
};

// Exports
module.exports = ActionObject;

/* EOF */
