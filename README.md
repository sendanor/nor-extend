nor-extend
==========

Extend Q promises with methods from another object prototype.

Non-supported method names
--------------------------

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
