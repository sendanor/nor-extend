[![Build Status](https://secure.travis-ci.org/Sendanor/nor-extend.png?branch=master)](http://travis-ci.org/Sendanor/nor-extend)

nor-extend
==========

Extend Q promises with methods from another object prototype.

Installation
------------

The lib can be installed from the NPM by `npm install nor-extend`.

Projects using `nor-extend`
---------------------------

* [nor-fs](https://github.com/Sendanor/nor-fs#nor-fs)
* [nor-db](https://github.com/Sendanor/nor-db#nor-db)

Example usage
-------------

Let's say you have a `Foobar` constructor which has methods that are 
returning promises and you want to extend these promises so that you can chain 
your own asynchronous methods directly.

Normally you would need to use it like this: 

	var p = Foobar.start().then(function(foobar) {
		return foobar.insert({id:100});
	}).then(function(foobar) {
		return foobar.commit();
	});

With extended promises you can use it like this:

	var p = Foobar.start().insert({id:100}).commit();

Please note, this is not the simplest example but it shows most features. Check our tests for all supported features.

Here is how you implement your custom `Foobar`:

	function Foobar(conn) {
		this._conn = conn;
	}
	
	Foobar.start = function() {
		var p = DB.start().then(function(conn) {
			return new Foobar(conn);
		});
		return extend.promise( [Foobar, Array], p);
	};
	
	Foobar.commit = function() {
		return extend.promise( [Foobar, Array], this._conn.commit() );
	};
	
	Foobar.rollback = function() {
		return extend.promise( [Foobar, Array], this._conn.rollback() );
	};
	
	Foobar.prototype.getByID = function(id) {
		return extend.promise( Array, this._conn.query("SELECT * FROM foobar WHERE id=?", [id]));
	};
	
	Foobar.prototype.insert = function(obj) {
		var self = this;
		return extend.promise( [Foobar, Array], this._conn.query("INSERT INTO foobar SET ?", [obj]).then(function() { return self; }) );
	};

Here is how you can use `Foobar` now:

	var p = Foobar.start();
	p.$getByID(100).$shift().then(function(row) {
		if(row) {
			console.log( row );
			return p.$rollback();
		} else {
			return p.$insert({id:100}).$commit();
		}
	}).fail(function(err) {
		console.error('Error: ' + err);
		p.$rollback();
	}).done();

You don't actually need to use $-prefixes in methods unless they overlap with methods from `Object.prototype` or `Q.makePromise.prototype`. The library will create 
aliases for both styles, so `p.getById(100).shift()` probably works, too.

Non-supported method names when using without $ prefix
------------------------------------------------------

Please note that some method names in your own objects cannot be supported and 
will be ignored when merged with Q promises.

These method names from `Object.prototype` will not be work:

	> Object.getOwnPropertyNames({}.constructor.prototype);
	[ 'constructor',
	  'toString',
	  'toLocaleString',
	  'valueOf',
	  'hasOwnProperty',
	  'isPrototypeOf',
	  'propertyIsEnumerable',
	  '__defineGetter__',
	  '__lookupGetter__',
	  '__defineSetter__',
	  '__lookupSetter__' ]

Also these following method names from `Q.makePromise.prototype` are obviously 
not supported in your extended promise object since these are used by Q 
promises:

	> Object.getOwnPropertyNames(Q.makePromise.prototype)
	[ 'constructor',
	  'then',
	  'thenResolve',
	  'thenReject',
	  'isFulfilled',
	  'isRejected',
	  'isPending',
	  'dispatch',
	  'when',
	  'spread',
	  'get',
	  'set',
	  'del',
	  'delete',
	  'post',
	  'send',
	  'mapply',
	  'invoke',
	  'mcall',
	  'keys',
	  'fapply',
	  'fcall',
	  'fbind',
	  'all',
	  'allResolved',
	  'timeout',
	  'delay',
	  'catch',
	  'finally',
	  'fail',
	  'fin',
	  'progress',
	  'done',
	  'nfcall',
	  'nfapply',
	  'nfbind',
	  'denodeify',
	  'nbind',
	  'npost',
	  'nsend',
	  'nmapply',
	  'ninvoke',
	  'nmcall',
	  'nodeify',
	  'toSource',
	  'toString' ]

Of course you can still call these methods with your extended promises but they 
will not call the merged object methods, instead they will do the same action 
as normal Q promises would do.

However Q promise methods will be extended to support your methods, so you can 
chain like `obj.foo(1).bar(2).then(function(x) { x.something(); return x; }).x()`. 
Please remember to return the instance which you will be calling, obviously 
otherwise it will not work.
