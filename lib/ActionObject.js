/** */

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

/** Fetch next result from the internal result array */
ActionObject.prototype.fetch = function(){
	var self = this;
	return this._results.shift();
};

// Exports
module.exports = ActionObject;

/* EOF */
