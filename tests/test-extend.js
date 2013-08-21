"use strict";

var extend = require('../lib/extend.js');
var assert = require('assert');
var Q = require('q');

function get_names(obj) {
	return Object.getOwnPropertyNames(obj).filter(function(x) { return (['constructor', 'toString', 'toLocaleString'].indexOf(x) >= 0) ? false : true; });
}

/* */
describe('extend', function(){

	// extend.getMethodNamesFromConstructor(fun)
	describe('.getMethodNamesFromConstructor()', function(){
		it('should return properties of Array', function(){
			assert.deepEqual( extend.getMethodNamesFromConstructor(Array), get_names(Array.prototype) );
		});
		it('should return properties of String', function(){
			assert.deepEqual( extend.getMethodNamesFromConstructor(String), get_names(String.prototype) );
		});
		it('should return properties of Number', function(){
			assert.deepEqual( extend.getMethodNamesFromConstructor(Number), get_names(Number.prototype) );
		});
		it('should return empty array', function(){
			assert.strictEqual( extend.getMethodNamesFromConstructor().length, 0);
		});
	});

	// extend.getMethodNamesFromObject(obj)
	describe('.getMethodNamesFromObject()', function(){
		it('should return properties of ["foo", "bar"]', function(){
			assert.deepEqual( extend.getMethodNamesFromObject(["foo", "bar"]), get_names(Array.prototype) );
		});
		it('should return properties of "hello"', function(){
			assert.deepEqual( extend.getMethodNamesFromObject("hello"), get_names(String.prototype) );
		});
		it('should return properties of 123', function(){
			assert.deepEqual( extend.getMethodNamesFromObject(123), get_names(Number.prototype) );
		});
		it('should return empty array', function(){
			assert.strictEqual( extend.getMethodNamesFromObject().length, 0);
		});
	});

	// extend.object(self2, methods, obj)
	describe('.object()', function(){
		it('should extend ["hello", "world"] with methods from Foo', function(){
			function Foo() {
			}
			Foo.prototype.foo = function() { return 1; }
			Foo.prototype.bar = function() { return 2; }
			var foo = new Foo();
			var obj = ["hello", "world"];
			var extended_obj = extend.object(foo, extend.getMethodNamesFromObject(foo), obj);
			assert.strictEqual( extended_obj[0], "hello" );
			assert.strictEqual( extended_obj[1], "world" );
			assert.strictEqual( extended_obj.foo(), 1 );
			assert.strictEqual( extended_obj.bar(), 2 );
		});
	});

	// extend.promise(methods, p)
	describe('.promise()', function(){

		it('should extend Q promise with methods from Foobar', function(done){
			function Foobar() {
			}
			Foobar.prototype.foo = function(x) { return x+1; }
			Foobar.prototype.bar = function(x) { return x+2; }

			var defer = Q.defer();
			setTimeout(function() {
				defer.resolve( new Foobar() );
			}, 200);
			var p = defer.promise;

			var methods = extend.getMethodNamesFromConstructor(Foobar);
			var extended_p = extend.promise( methods, p);

			assert.strictEqual( typeof extended_p, 'object' );
			assert.strictEqual( typeof extended_p.foo, 'function' );
			assert.strictEqual( typeof extended_p.bar, 'function' );

			extended_p.foo(1).then(function(x) {
				assert.strictEqual( x, 2 );
				done();
			}).fail(function(err) {
				done(err);
			}).done();
		});

		it('should extend Q promise with methods from Array', function(done){

			var defer = Q.defer();
			setTimeout(function() {
				defer.resolve( ["hello", "world", "foo", "bar"] );
			}, 200);
			var p = defer.promise;

			var methods = extend.getMethodNamesFromConstructor(Array);
			var extended_p = extend.promise( methods, p);

			assert.strictEqual( typeof extended_p, 'object' );
			assert.strictEqual( typeof extended_p.shift, 'function' );

			extended_p.shift().then(function(x) {
				assert.strictEqual( x, "hello" );
				done();
			}).fail(function(err) {
				done(err);
			}).done();
		});


		it('should extend Q promise with methods from Foobar and support method call chaining', function(done){
			function Foobar(x) {
				assert.strictEqual(typeof x, 'number');
				this.x = x;
				assert.strictEqual(typeof this.x, 'number');
				assert.ok(this.x);
			}

			Foobar.prototype.inc = function(x) { 
				assert.strictEqual(typeof this.x, 'number');
				assert.strictEqual(typeof x, 'number');
				this.x += x; 
				assert.ok(this.x);
				return this;
			};

			Foobar.prototype.dec = function(x) {
				assert.strictEqual(typeof this.x, 'number');
				assert.strictEqual(typeof x, 'number');
				this.x -= x; 
				assert.ok(this.x);
				return this;
			};

			Foobar.prototype.getx = function() {
				assert.strictEqual(typeof this.x, 'number');
				assert.ok(this.x);
				return this.x;
			};

			var defer = Q.defer();
			setTimeout(function() {
				defer.resolve( new Foobar(1000) );
			}, 200);
			var p = defer.promise;

			var methods = extend.getMethodNamesFromConstructor(Foobar);
			var extended_p = extend.promise( methods, p);

			assert.strictEqual( typeof extended_p, 'object' );
			assert.strictEqual( typeof extended_p.inc, 'function' );
			assert.strictEqual( typeof extended_p.dec, 'function' );
			assert.strictEqual( typeof extended_p.get, 'function' );

			assert.strictEqual( new Foobar(1000).inc(500).dec(750).getx(), 1000 + 500 - 750);

			extended_p.inc(500).dec(750).getx().then(function(x) {
				assert.strictEqual( x, 1000 + 500 - 750 );
				done();
			}).fail(function(err) {
				done(err);
			}).done();
		});


		it('should extend Q promise with async methods from Foobar and support method call chaining', function(done){
			function Foobar(x) {
				assert.strictEqual(typeof x, 'number');
				this.x = x;
				assert.strictEqual(typeof this.x, 'number');
				assert.ok(this.x);
			}

			Foobar.create = function(x) {
				var defer = Q.defer();
				setTimeout(function() {
					try {
						defer.resolve( new Foobar(x) );
					} catch(e) {
						defer.reject(e);
					}
				}, 50);
				return defer.promise;
			};

			Foobar.prototype.inc = function(x) {
				var self = this;
				var defer = Q.defer();
				setTimeout(function() {
					try {
						assert.strictEqual(typeof self.x, 'number');
						assert.strictEqual(typeof x, 'number');
						self.x += x; 
						assert.ok(self.x);
						defer.resolve(self);
					} catch(e) {
						defer.reject(e);
					}
				}, 50);
				return defer.promise;
			};

			Foobar.prototype.dec = function(x) {
				var self = this;
				var defer = Q.defer();
				setTimeout(function() {
					try {
						assert.strictEqual(typeof self.x, 'number');
						assert.strictEqual(typeof x, 'number');
						self.x -= x; 
						assert.ok(self.x);
						defer.resolve(self);
					} catch(e) {
						defer.reject(e);
					}
				}, 50);
				return defer.promise;
			};

			Foobar.prototype.getx = function() {
				var self = this;
				var defer = Q.defer();
				setTimeout(function() {
					try {
						assert.strictEqual(typeof self.x, 'number');
						assert.ok(self.x);
						defer.resolve(self.x);
					} catch(e) {
						defer.reject(e);
					}
				}, 50);
				return defer.promise;
			};

			var p = Foobar.create(1000);

			var methods = extend.getMethodNamesFromConstructor(Foobar);
			var extended_p = extend.promise( methods, p);

			assert.strictEqual( typeof extended_p, 'object' );
			assert.strictEqual( typeof extended_p.inc, 'function' );
			assert.strictEqual( typeof extended_p.dec, 'function' );
			assert.strictEqual( typeof extended_p.get, 'function' );

			extended_p.inc(500).dec(750).getx().then(function(x) {
				assert.strictEqual( x, 1000 + 500 - 750 );
				done();
			}).fail(function(err) {
				done(err);
			}).done();
		});


		it('should extend Q promise with async methods from Foobar (style 2) and support method call chaining', function(done){
			function Foobar(x) {
				assert.strictEqual(typeof x, 'number');
				this.x = x;
				assert.strictEqual(typeof this.x, 'number');
				assert.ok(this.x);
			}

			Foobar.create = function(x) {
				var defer = Q.defer();
				setTimeout(function() {
					try {
						defer.resolve( new Foobar(x) );
					} catch(e) {
						defer.reject(e);
					}
				}, 50);
				return extend.promise( extend.getMethodNamesFromConstructor(Foobar), defer.promise);
			};

			Foobar.prototype.inc = function(x) {
				var self = this;
				var defer = Q.defer();
				setTimeout(function() {
					try {
						assert.strictEqual(typeof self.x, 'number');
						assert.strictEqual(typeof x, 'number');
						self.x += x; 
						assert.ok(self.x);
						defer.resolve(self);
					} catch(e) {
						defer.reject(e);
					}
				}, 50);
				return extend.promise( extend.getMethodNamesFromConstructor(Foobar), defer.promise);
			};

			Foobar.prototype.dec = function(x) {
				var self = this;
				var defer = Q.defer();
				setTimeout(function() {
					try {
						assert.strictEqual(typeof self.x, 'number');
						assert.strictEqual(typeof x, 'number');
						self.x -= x; 
						assert.ok(self.x);
						defer.resolve(self);
					} catch(e) {
						defer.reject(e);
					}
				}, 50);
				return extend.promise( extend.getMethodNamesFromConstructor(Foobar), defer.promise);
			};

			Foobar.prototype.getx = function() {
				var self = this;
				var defer = Q.defer();
				setTimeout(function() {
					try {
						assert.strictEqual(typeof self.x, 'number');
						assert.ok(self.x);
						defer.resolve(self.x);
					} catch(e) {
						defer.reject(e);
					}
				}, 50);
				return extend.promise( extend.getMethodNamesFromConstructor(Foobar), defer.promise);
			};

			var p = Foobar.create(1000);

			assert.strictEqual( typeof p, 'object' );
			assert.strictEqual( typeof p.inc, 'function' );
			assert.strictEqual( typeof p.dec, 'function' );
			assert.strictEqual( typeof p.get, 'function' );

			p.inc(500).then(function(foobar) {
				assert.strictEqual(foobar.x, 1000 + 500);
				return foobar;
			}).dec(750).then(function(foobar) {
				assert.strictEqual(foobar.x, 1000 + 500 - 750);
				return foobar;
			}).getx().then(function(x) {
				assert.strictEqual( x, 1000 + 500 - 750 );
				done();
			}).fail(function(err) {
				done(err);
			}).done();
		});

	});


});

/* EOF */
