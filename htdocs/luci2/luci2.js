/*
	LuCI2 - OpenWrt Web Interface

	Copyright 2013-2014 Jo-Philipp Wich <jow@openwrt.org>

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at

		http://www.apache.org/licenses/LICENSE-2.0
*/

String.prototype.format = function()
{
	var html_esc = [/&/g, '&#38;', /"/g, '&#34;', /'/g, '&#39;', /</g, '&#60;', />/g, '&#62;'];
	var quot_esc = [/"/g, '&#34;', /'/g, '&#39;'];

	function esc(s, r) {
		for( var i = 0; i < r.length; i += 2 )
			s = s.replace(r[i], r[i+1]);
		return s;
	}

	var str = this;
	var out = '';
	var re = /^(([^%]*)%('.|0|\x20)?(-)?(\d+)?(\.\d+)?(%|b|c|d|u|f|o|s|x|X|q|h|j|t|m))/;
	var a = b = [], numSubstitutions = 0, numMatches = 0;

	while ((a = re.exec(str)) != null)
	{
		var m = a[1];
		var leftpart = a[2], pPad = a[3], pJustify = a[4], pMinLength = a[5];
		var pPrecision = a[6], pType = a[7];

		numMatches++;

		if (pType == '%')
		{
			subst = '%';
		}
		else
		{
			if (numSubstitutions < arguments.length)
			{
				var param = arguments[numSubstitutions++];

				var pad = '';
				if (pPad && pPad.substr(0,1) == "'")
					pad = leftpart.substr(1,1);
				else if (pPad)
					pad = pPad;

				var justifyRight = true;
				if (pJustify && pJustify === "-")
					justifyRight = false;

				var minLength = -1;
				if (pMinLength)
					minLength = parseInt(pMinLength);

				var precision = -1;
				if (pPrecision && pType == 'f')
					precision = parseInt(pPrecision.substring(1));

				var subst = param;

				switch(pType)
				{
					case 'b':
						subst = (parseInt(param) || 0).toString(2);
						break;

					case 'c':
						subst = String.fromCharCode(parseInt(param) || 0);
						break;

					case 'd':
						subst = (parseInt(param) || 0);
						break;

					case 'u':
						subst = Math.abs(parseInt(param) || 0);
						break;

					case 'f':
						subst = (precision > -1)
							? ((parseFloat(param) || 0.0)).toFixed(precision)
							: (parseFloat(param) || 0.0);
						break;

					case 'o':
						subst = (parseInt(param) || 0).toString(8);
						break;

					case 's':
						subst = param;
						break;

					case 'x':
						subst = ('' + (parseInt(param) || 0).toString(16)).toLowerCase();
						break;

					case 'X':
						subst = ('' + (parseInt(param) || 0).toString(16)).toUpperCase();
						break;

					case 'h':
						subst = esc(param, html_esc);
						break;

					case 'q':
						subst = esc(param, quot_esc);
						break;

					case 'j':
						subst = String.serialize(param);
						break;

					case 't':
						var td = 0;
						var th = 0;
						var tm = 0;
						var ts = (param || 0);

						if (ts > 60) {
							tm = Math.floor(ts / 60);
							ts = (ts % 60);
						}

						if (tm > 60) {
							th = Math.floor(tm / 60);
							tm = (tm % 60);
						}

						if (th > 24) {
							td = Math.floor(th / 24);
							th = (th % 24);
						}

						subst = (td > 0)
							? '%dd %dh %dm %ds'.format(td, th, tm, ts)
							: '%dh %dm %ds'.format(th, tm, ts);

						break;

					case 'm':
						var mf = pMinLength ? parseInt(pMinLength) : 1000;
						var pr = pPrecision ? Math.floor(10*parseFloat('0'+pPrecision)) : 2;

						var i = 0;
						var val = parseFloat(param || 0);
						var units = [ '', 'K', 'M', 'G', 'T', 'P', 'E' ];

						for (i = 0; (i < units.length) && (val > mf); i++)
							val /= mf;

						subst = val.toFixed(pr) + ' ' + units[i];
						break;
				}

				subst = (typeof(subst) == 'undefined') ? '' : subst.toString();

				if (minLength > 0 && pad.length > 0)
					for (var i = 0; i < (minLength - subst.length); i++)
						subst = justifyRight ? (pad + subst) : (subst + pad);
			}
		}

		out += leftpart + subst;
		str = str.substr(m.length);
	}

	return out + str;
}

function LuCI2()
{
	var L = this;

	var Class = function() { };

	Class.extend = function(properties)
	{
		Class.initializing = true;

		var prototype = new this();
		var superprot = this.prototype;

		Class.initializing = false;

		$.extend(prototype, properties, {
			callSuper: function() {
				var args = [ ];
				var meth = arguments[0];

				if (typeof(superprot[meth]) != 'function')
					return undefined;

				for (var i = 1; i < arguments.length; i++)
					args.push(arguments[i]);

				return superprot[meth].apply(this, args);
			}
		});

		function _class()
		{
			this.options = arguments[0] || { };

			if (!Class.initializing && typeof(this.init) == 'function')
				this.init.apply(this, arguments);
		}

		_class.prototype = prototype;
		_class.prototype.constructor = _class;

		_class.extend = Class.extend;

		return _class;
	};

	this.defaults = function(obj, def)
	{
		for (var key in def)
			if (typeof(obj[key]) == 'undefined')
				obj[key] = def[key];

		return obj;
	};

	this.isDeferred = function(x)
	{
		return (typeof(x) == 'object' &&
		        typeof(x.then) == 'function' &&
		        typeof(x.promise) == 'function');
	};

	this.deferrable = function()
	{
		if (this.isDeferred(arguments[0]))
			return arguments[0];

		var d = $.Deferred();
		    d.resolve.apply(d, arguments);

		return d.promise();
	};

	this.i18n = {

		loaded: false,
		catalog: { },
		plural:  function(n) { return 0 + (n != 1) },

		init: function() {
			if (L.i18n.loaded)
				return;

			var lang = (navigator.userLanguage || navigator.language || 'en').toLowerCase();
			var langs = (lang.indexOf('-') > -1) ? [ lang, lang.split(/-/)[0] ] : [ lang ];

			for (var i = 0; i < langs.length; i++)
				$.ajax('%s/i18n/base.%s.json'.format(L.globals.resource, langs[i]), {
					async:    false,
					cache:    true,
					dataType: 'json',
					success:  function(data) {
						$.extend(L.i18n.catalog, data);

						var pe = L.i18n.catalog[''];
						if (pe)
						{
							delete L.i18n.catalog[''];
							try {
								var pf = new Function('n', 'return 0 + (' + pe + ')');
								L.i18n.plural = pf;
							} catch (e) { };
						}
					}
				});

			L.i18n.loaded = true;
		}

	};

	this.tr = function(msgid)
	{
		L.i18n.init();

		var msgstr = L.i18n.catalog[msgid];

		if (typeof(msgstr) == 'undefined')
			return msgid;
		else if (typeof(msgstr) == 'string')
			return msgstr;
		else
			return msgstr[0];
	};

	this.trp = function(msgid, msgid_plural, count)
	{
		L.i18n.init();

		var msgstr = L.i18n.catalog[msgid];

		if (typeof(msgstr) == 'undefined')
			return (count == 1) ? msgid : msgid_plural;
		else if (typeof(msgstr) == 'string')
			return msgstr;
		else
			return msgstr[L.i18n.plural(count)];
	};

	this.trc = function(msgctx, msgid)
	{
		L.i18n.init();

		var msgstr = L.i18n.catalog[msgid + '\u0004' + msgctx];

		if (typeof(msgstr) == 'undefined')
			return msgid;
		else if (typeof(msgstr) == 'string')
			return msgstr;
		else
			return msgstr[0];
	};

	this.trcp = function(msgctx, msgid, msgid_plural, count)
	{
		L.i18n.init();

		var msgstr = L.i18n.catalog[msgid + '\u0004' + msgctx];

		if (typeof(msgstr) == 'undefined')
			return (count == 1) ? msgid : msgid_plural;
		else if (typeof(msgstr) == 'string')
			return msgstr;
		else
			return msgstr[L.i18n.plural(count)];
	};

	this.setHash = function(key, value)
	{
		var h = '';
		var data = this.getHash(undefined);

		if (typeof(value) == 'undefined')
			delete data[key];
		else
			data[key] = value;

		var keys = [ ];
		for (var k in data)
			keys.push(k);

		keys.sort();

		for (var i = 0; i < keys.length; i++)
		{
			if (i > 0)
				h += ',';

			h += keys[i] + ':' + data[keys[i]];
		}

		if (h.length)
			location.hash = '#' + h;
		else
			location.hash = '';
	};

	this.getHash = function(key)
	{
		var data = { };
		var tuples = (location.hash || '#').substring(1).split(/,/);

		for (var i = 0; i < tuples.length; i++)
		{
			var tuple = tuples[i].split(/:/);
			if (tuple.length == 2)
				data[tuple[0]] = tuple[1];
		}

		if (typeof(key) != 'undefined')
			return data[key];

		return data;
	};

	this.toArray = function(x)
	{
		switch (typeof(x))
		{
		case 'number':
		case 'boolean':
			return [ x ];

		case 'string':
			var r = [ ];
			var l = x.split(/\s+/);
			for (var i = 0; i < l.length; i++)
				if (l[i].length > 0)
					r.push(l[i]);
			return r;

		case 'object':
			if ($.isArray(x))
			{
				var r = [ ];
				for (var i = 0; i < x.length; i++)
					r.push(x[i]);
				return r;
			}
			else if ($.isPlainObject(x))
			{
				var r = [ ];
				for (var k in x)
					if (x.hasOwnProperty(k))
						r.push(k);
				return r.sort();
			}
		}

		return [ ];
	};

	this.toObject = function(x)
	{
		switch (typeof(x))
		{
		case 'number':
		case 'boolean':
			return { x: true };

		case 'string':
			var r = { };
			var l = x.split(/\x+/);
			for (var i = 0; i < l.length; i++)
				if (l[i].length > 0)
					r[l[i]] = true;
			return r;

		case 'object':
			if ($.isArray(x))
			{
				var r = { };
				for (var i = 0; i < x.length; i++)
					r[x[i]] = true;
				return r;
			}
			else if ($.isPlainObject(x))
			{
				return x;
			}
		}

		return { };
	};

	this.filterArray = function(array, item)
	{
		if (!$.isArray(array))
			return [ ];

		for (var i = 0; i < array.length; i++)
			if (array[i] === item)
				array.splice(i--, 1);

		return array;
	};

	this.toClassName = function(str, suffix)
	{
		var n = '';
		var l = str.split(/[\/.]/);

		for (var i = 0; i < l.length; i++)
			if (l[i].length > 0)
				n += l[i].charAt(0).toUpperCase() + l[i].substr(1).toLowerCase();

		if (typeof(suffix) == 'string')
			n += suffix;

		return n;
	};

	this.toColor = function(str)
	{
		if (typeof(str) != 'string' || str.length == 0)
			return '#CCCCCC';

		if (str == 'wan')
			return '#F09090';
		else if (str == 'lan')
			return '#90F090';

		var i = 0, hash = 0;

		while (i < str.length)
			hash = str.charCodeAt(i++) + ((hash << 5) - hash);

		var r = (hash & 0xFF) % 128;
		var g = ((hash >> 8) & 0xFF) % 128;

		var min = 0;
		var max = 128;

		if ((r + g) < 128)
			min = 128 - r - g;
		else
			max = 255 - r - g;

		var b = min + (((hash >> 16) & 0xFF) % (max - min));

		return '#%02X%02X%02X'.format(0xFF - r, 0xFF - g, 0xFF - b);
	};

	this.parseIPv4 = function(str)
	{
		if ((typeof(str) != 'string' && !(str instanceof String)) ||
		    !str.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/))
			return undefined;

		var num = [ ];
		var parts = str.split(/\./);

		for (var i = 0; i < parts.length; i++)
		{
			var n = parseInt(parts[i], 10);
			if (isNaN(n) || n > 255)
				return undefined;

			num.push(n);
		}

		return num;
	};

	this.parseIPv6 = function(str)
	{
		if ((typeof(str) != 'string' && !(str instanceof String)) ||
		    !str.match(/^[a-fA-F0-9:]+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})?$/))
			return undefined;

		var parts = str.split(/::/);
		if (parts.length == 0 || parts.length > 2)
			return undefined;

		var lnum = [ ];
		if (parts[0].length > 0)
		{
			var left = parts[0].split(/:/);
			for (var i = 0; i < left.length; i++)
			{
				var n = parseInt(left[i], 16);
				if (isNaN(n))
					return undefined;

				lnum.push((n / 256) >> 0);
				lnum.push(n % 256);
			}
		}

		var rnum = [ ];
		if (parts.length > 1 && parts[1].length > 0)
		{
			var right = parts[1].split(/:/);

			for (var i = 0; i < right.length; i++)
			{
				if (right[i].indexOf('.') > 0)
				{
					var addr = L.parseIPv4(right[i]);
					if (!addr)
						return undefined;

					rnum.push.apply(rnum, addr);
					continue;
				}

				var n = parseInt(right[i], 16);
				if (isNaN(n))
					return undefined;

				rnum.push((n / 256) >> 0);
				rnum.push(n % 256);
			}
		}

		if (rnum.length > 0 && (lnum.length + rnum.length) > 15)
			return undefined;

		var num = [ ];

		num.push.apply(num, lnum);

		for (var i = 0; i < (16 - lnum.length - rnum.length); i++)
			num.push(0);

		num.push.apply(num, rnum);

		if (num.length > 16)
			return undefined;

		return num;
	};

	this.isNetmask = function(addr)
	{
		if (!$.isArray(addr))
			return false;

		var c;

		for (c = 0; (c < addr.length) && (addr[c] == 255); c++);

		if (c == addr.length)
			return true;

		if ((addr[c] == 254) || (addr[c] == 252) || (addr[c] == 248) ||
			(addr[c] == 240) || (addr[c] == 224) || (addr[c] == 192) ||
			(addr[c] == 128) || (addr[c] == 0))
		{
			for (c++; (c < addr.length) && (addr[c] == 0); c++);

			if (c == addr.length)
				return true;
		}

		return false;
	};

	this.globals = {
		timeout:  15000,
		resource: '/luci2',
		sid:      '00000000000000000000000000000000'
	};

	this.rpc = {

		_id: 1,
		_batch: undefined,
		_requests: { },

		_call: function(req, cb)
		{
			return $.ajax('/ubus', {
				cache:       false,
				contentType: 'application/json',
				data:        JSON.stringify(req),
				dataType:    'json',
				type:        'POST',
				timeout:     L.globals.timeout,
				_rpc_req:   req
			}).then(cb, cb);
		},

		_list_cb: function(msg)
		{
			var list = msg.result;

			/* verify message frame */
			if (typeof(msg) != 'object' || msg.jsonrpc != '2.0' || !msg.id || !$.isArray(list))
				list = [ ];

			return $.Deferred().resolveWith(this, [ list ]);
		},

		_call_cb: function(msg)
		{
			var data = [ ];
			var type = Object.prototype.toString;
			var reqs = this._rpc_req;

			if (!$.isArray(reqs))
			{
				msg = [ msg ];
				reqs = [ reqs ];
			}

			for (var i = 0; i < msg.length; i++)
			{
				/* fetch related request info */
				var req = L.rpc._requests[reqs[i].id];
				if (typeof(req) != 'object')
					throw 'No related request for JSON response';

				/* fetch response attribute and verify returned type */
				var ret = undefined;

				/* verify message frame */
				if (typeof(msg[i]) == 'object' && msg[i].jsonrpc == '2.0')
					if ($.isArray(msg[i].result) && msg[i].result[0] == 0)
						ret = (msg[i].result.length > 1) ? msg[i].result[1] : msg[i].result[0];

				if (req.expect)
				{
					for (var key in req.expect)
					{
						if (typeof(ret) != 'undefined' && key != '')
							ret = ret[key];

						if (typeof(ret) == 'undefined' || type.call(ret) != type.call(req.expect[key]))
							ret = req.expect[key];

						break;
					}
				}

				/* apply filter */
				if (typeof(req.filter) == 'function')
				{
					req.priv[0] = ret;
					req.priv[1] = req.params;
					ret = req.filter.apply(L.rpc, req.priv);
				}

				/* store response data */
				if (typeof(req.index) == 'number')
					data[req.index] = ret;
				else
					data = ret;

				/* delete request object */
				delete L.rpc._requests[reqs[i].id];
			}

			return $.Deferred().resolveWith(this, [ data ]);
		},

		list: function()
		{
			var params = [ ];
			for (var i = 0; i < arguments.length; i++)
				params[i] = arguments[i];

			var msg = {
				jsonrpc: '2.0',
				id:      this._id++,
				method:  'list',
				params:  (params.length > 0) ? params : undefined
			};

			return this._call(msg, this._list_cb);
		},

		batch: function()
		{
			if (!$.isArray(this._batch))
				this._batch = [ ];
		},

		flush: function()
		{
			if (!$.isArray(this._batch))
				return L.deferrable([ ]);

			var req = this._batch;
			delete this._batch;

			/* call rpc */
			return this._call(req, this._call_cb);
		},

		declare: function(options)
		{
			var _rpc = this;

			return function() {
				/* build parameter object */
				var p_off = 0;
				var params = { };
				if ($.isArray(options.params))
					for (p_off = 0; p_off < options.params.length; p_off++)
						params[options.params[p_off]] = arguments[p_off];

				/* all remaining arguments are private args */
				var priv = [ undefined, undefined ];
				for (; p_off < arguments.length; p_off++)
					priv.push(arguments[p_off]);

				/* store request info */
				var req = _rpc._requests[_rpc._id] = {
					expect: options.expect,
					filter: options.filter,
					params: params,
					priv:   priv
				};

				/* build message object */
				var msg = {
					jsonrpc: '2.0',
					id:      _rpc._id++,
					method:  'call',
					params:  [
						L.globals.sid,
						options.object,
						options.method,
						params
					]
				};

				/* when a batch is in progress then store index in request data
				 * and push message object onto the stack */
				if ($.isArray(_rpc._batch))
				{
					req.index = _rpc._batch.push(msg) - 1;
					return L.deferrable(msg);
				}

				/* call rpc */
				return _rpc._call(msg, _rpc._call_cb);
			};
		}
	};

	this.UCIContext = Class.extend({

		init: function()
		{
			this.state = {
				newidx:  0,
				values:  { },
				creates: { },
				changes: { },
				deletes: { },
				reorder: { }
			};
		},

		callLoad: L.rpc.declare({
			object: 'uci',
			method: 'get',
			params: [ 'config' ],
			expect: { values: { } }
		}),

		callOrder: L.rpc.declare({
			object: 'uci',
			method: 'order',
			params: [ 'config', 'sections' ]
		}),

		callAdd: L.rpc.declare({
			object: 'uci',
			method: 'add',
			params: [ 'config', 'type', 'name', 'values' ],
			expect: { section: '' }
		}),

		callSet: L.rpc.declare({
			object: 'uci',
			method: 'set',
			params: [ 'config', 'section', 'values' ]
		}),

		callDelete: L.rpc.declare({
			object: 'uci',
			method: 'delete',
			params: [ 'config', 'section', 'options' ]
		}),

		callApply: L.rpc.declare({
			object: 'uci',
			method: 'apply',
			params: [ 'timeout', 'rollback' ]
		}),

		callConfirm: L.rpc.declare({
			object: 'uci',
			method: 'confirm'
		}),

		createSID: function(conf)
		{
			var v = this.state.values;
			var n = this.state.creates;
			var sid;

			do {
				sid = "new%06x".format(Math.random() * 0xFFFFFF);
			} while ((n[conf] && n[conf][sid]) || (v[conf] && v[conf][sid]));

			return sid;
		},

		reorderSections: function()
		{
			var v = this.state.values;
			var n = this.state.creates;
			var r = this.state.reorder;

			if ($.isEmptyObject(r))
				return L.deferrable();

			L.rpc.batch();

			/*
			 gather all created and existing sections, sort them according
			 to their index value and issue an uci order call
			*/
			for (var c in r)
			{
				var o = [ ];

				if (n[c])
					for (var s in n[c])
						o.push(n[c][s]);

				for (var s in v[c])
					o.push(v[c][s]);

				if (o.length > 0)
				{
					o.sort(function(a, b) {
						return (a['.index'] - b['.index']);
					});

					var sids = [ ];

					for (var i = 0; i < o.length; i++)
						sids.push(o[i]['.name']);

					this.callOrder(c, sids);
				}
			}

			this.state.reorder = { };
			return L.rpc.flush();
		},

		load: function(packages)
		{
			var self = this;
			var seen = { };
			var pkgs = [ ];

			if (!$.isArray(packages))
				packages = [ packages ];

			L.rpc.batch();

			for (var i = 0; i < packages.length; i++)
				if (!seen[packages[i]] && !self.state.values[packages[i]])
				{
					pkgs.push(packages[i]);
					seen[packages[i]] = true;
					self.callLoad(packages[i]);
				}

			return L.rpc.flush().then(function(responses) {
				for (var i = 0; i < responses.length; i++)
					self.state.values[pkgs[i]] = responses[i];

				return pkgs;
			});
		},

		unload: function(packages)
		{
			if (!$.isArray(packages))
				packages = [ packages ];

			for (var i = 0; i < packages.length; i++)
			{
				delete this.state.values[packages[i]];
				delete this.state.creates[packages[i]];
				delete this.state.changes[packages[i]];
				delete this.state.deletes[packages[i]];
			}
		},

		add: function(conf, type, name)
		{
			var n = this.state.creates;
			var sid = name || this.createSID(conf);

			if (!n[conf])
				n[conf] = { };

			n[conf][sid] = {
				'.type':      type,
				'.name':      sid,
				'.create':    name,
				'.anonymous': !name,
				'.index':     1000 + this.state.newidx++
			};

			return sid;
		},

		remove: function(conf, sid)
		{
			var n = this.state.creates;
			var c = this.state.changes;
			var d = this.state.deletes;

			/* requested deletion of a just created section */
			if (n[conf] && n[conf][sid])
			{
				delete n[conf][sid];
			}
			else
			{
				if (c[conf])
					delete c[conf][sid];

				if (!d[conf])
					d[conf] = { };

				d[conf][sid] = true;
			}
		},

		sections: function(conf, type, cb)
		{
			var sa = [ ];
			var v = this.state.values[conf];
			var n = this.state.creates[conf];
			var c = this.state.changes[conf];
			var d = this.state.deletes[conf];

			if (!v)
				return sa;

			for (var s in v)
				if (!d || d[s] !== true)
					if (!type || v[s]['.type'] == type)
						sa.push($.extend({ }, v[s], c ? c[s] : undefined));

			if (n)
				for (var s in n)
					if (!type || n[s]['.type'] == type)
						sa.push(n[s]);

			sa.sort(function(a, b) {
				return a['.index'] - b['.index'];
			});

			for (var i = 0; i < sa.length; i++)
				sa[i]['.index'] = i;

			if (typeof(cb) == 'function')
				for (var i = 0; i < sa.length; i++)
					cb.call(this, sa[i], sa[i]['.name']);

			return sa;
		},

		get: function(conf, sid, opt)
		{
			var v = this.state.values;
			var n = this.state.creates;
			var c = this.state.changes;
			var d = this.state.deletes;

			if (typeof(sid) == 'undefined')
				return undefined;

			/* requested option in a just created section */
			if (n[conf] && n[conf][sid])
			{
				if (!n[conf])
					return undefined;

				if (typeof(opt) == 'undefined')
					return n[conf][sid];

				return n[conf][sid][opt];
			}

			/* requested an option value */
			if (typeof(opt) != 'undefined')
			{
				/* check whether option was deleted */
				if (d[conf] && d[conf][sid])
				{
					if (d[conf][sid] === true)
						return undefined;

					for (var i = 0; i < d[conf][sid].length; i++)
						if (d[conf][sid][i] == opt)
							return undefined;
				}

				/* check whether option was changed */
				if (c[conf] && c[conf][sid] && typeof(c[conf][sid][opt]) != 'undefined')
					return c[conf][sid][opt];

				/* return base value */
				if (v[conf] && v[conf][sid])
					return v[conf][sid][opt];

				return undefined;
			}

			/* requested an entire section */
			if (v[conf])
				return v[conf][sid];

			return undefined;
		},

		set: function(conf, sid, opt, val)
		{
			var v = this.state.values;
			var n = this.state.creates;
			var c = this.state.changes;
			var d = this.state.deletes;

			if (typeof(sid) == 'undefined' ||
			    typeof(opt) == 'undefined' ||
			    opt.charAt(0) == '.')
				return;

			if (n[conf] && n[conf][sid])
			{
				if (typeof(val) != 'undefined')
					n[conf][sid][opt] = val;
				else
					delete n[conf][sid][opt];
			}
			else if (typeof(val) != 'undefined')
			{
				/* do not set within deleted section */
				if (d[conf] && d[conf][sid] === true)
					return;

				/* only set in existing sections */
				if (!v[conf] || !v[conf][sid])
					return;

				if (!c[conf])
					c[conf] = { };

				if (!c[conf][sid])
					c[conf][sid] = { };

				/* undelete option */
				if (d[conf] && d[conf][sid])
					d[conf][sid] = L.filterArray(d[conf][sid], opt);

				c[conf][sid][opt] = val;
			}
			else
			{
				/* only delete in existing sections */
				if (!v[conf] || !v[conf][sid])
					return;

				if (!d[conf])
					d[conf] = { };

				if (!d[conf][sid])
					d[conf][sid] = [ ];

				if (d[conf][sid] !== true)
					d[conf][sid].push(opt);
			}
		},

		unset: function(conf, sid, opt)
		{
			return this.set(conf, sid, opt, undefined);
		},

		get_first: function(conf, type, opt)
		{
			var sid = undefined;

			L.uci.sections(conf, type, function(s) {
				if (typeof(sid) != 'string')
					sid = s['.name'];
			});

			return this.get(conf, sid, opt);
		},

		set_first: function(conf, type, opt, val)
		{
			var sid = undefined;

			L.uci.sections(conf, type, function(s) {
				if (typeof(sid) != 'string')
					sid = s['.name'];
			});

			return this.set(conf, sid, opt, val);
		},

		unset_first: function(conf, type, opt)
		{
			return this.set_first(conf, type, opt, undefined);
		},

		swap: function(conf, sid1, sid2)
		{
			var s1 = this.get(conf, sid1);
			var s2 = this.get(conf, sid2);
			var n1 = s1 ? s1['.index'] : NaN;
			var n2 = s2 ? s2['.index'] : NaN;

			if (isNaN(n1) || isNaN(n2))
				return false;

			s1['.index'] = n2;
			s2['.index'] = n1;

			this.state.reorder[conf] = true;

			return true;
		},

		save: function()
		{
			L.rpc.batch();

			var v = this.state.values;
			var n = this.state.creates;
			var c = this.state.changes;
			var d = this.state.deletes;

			var self = this;
			var snew = [ ];
			var pkgs = { };

			if (n)
				for (var conf in n)
				{
					for (var sid in n[conf])
					{
						var r = {
							config: conf,
							values: { }
						};

						for (var k in n[conf][sid])
						{
							if (k == '.type')
								r.type = n[conf][sid][k];
							else if (k == '.create')
								r.name = n[conf][sid][k];
							else if (k.charAt(0) != '.')
								r.values[k] = n[conf][sid][k];
						}

						snew.push(n[conf][sid]);

						self.callAdd(r.config, r.type, r.name, r.values);
					}

					pkgs[conf] = true;
				}

			if (c)
				for (var conf in c)
				{
					for (var sid in c[conf])
						self.callSet(conf, sid, c[conf][sid]);

					pkgs[conf] = true;
				}

			if (d)
				for (var conf in d)
				{
					for (var sid in d[conf])
					{
						var o = d[conf][sid];
						self.callDelete(conf, sid, (o === true) ? undefined : o);
					}

					pkgs[conf] = true;
				}

			return L.rpc.flush().then(function(responses) {
				/*
				 array "snew" holds references to the created uci sections,
				 use it to assign the returned names of the new sections
				*/
				for (var i = 0; i < snew.length; i++)
					snew[i]['.name'] = responses[i];

				return self.reorderSections();
			}).then(function() {
				pkgs = L.toArray(pkgs);

				self.unload(pkgs);

				return self.load(pkgs);
			});
		},

		apply: function(timeout)
		{
			var self = this;
			var date = new Date();
			var deferred = $.Deferred();

			if (typeof(timeout) != 'number' || timeout < 1)
				timeout = 10;

			self.callApply(timeout, true).then(function(rv) {
				if (rv != 0)
				{
					deferred.rejectWith(self, [ rv ]);
					return;
				}

				var try_deadline = date.getTime() + 1000 * timeout;
				var try_confirm = function()
				{
					return self.callConfirm().then(function(rv) {
						if (rv != 0)
						{
							if (date.getTime() < try_deadline)
								window.setTimeout(try_confirm, 250);
							else
								deferred.rejectWith(self, [ rv ]);

							return;
						}

						deferred.resolveWith(self, [ rv ]);
					});
				};

				window.setTimeout(try_confirm, 1000);
			});

			return deferred;
		},

		changes: L.rpc.declare({
			object: 'uci',
			method: 'changes',
			expect: { changes: { } }
		}),

		readable: function(conf)
		{
			return L.session.hasACL('uci', conf, 'read');
		},

		writable: function(conf)
		{
			return L.session.hasACL('uci', conf, 'write');
		}
	});

	this.uci = new this.UCIContext();

	this.wireless = {
		listDeviceNames: L.rpc.declare({
			object: 'iwinfo',
			method: 'devices',
			expect: { 'devices': [ ] },
			filter: function(data) {
				data.sort();
				return data;
			}
		}),

		getDeviceStatus: L.rpc.declare({
			object: 'iwinfo',
			method: 'info',
			params: [ 'device' ],
			expect: { '': { } },
			filter: function(data, params) {
				if (!$.isEmptyObject(data))
				{
					data['device'] = params['device'];
					return data;
				}
				return undefined;
			}
		}),

		getAssocList: L.rpc.declare({
			object: 'iwinfo',
			method: 'assoclist',
			params: [ 'device' ],
			expect: { results: [ ] },
			filter: function(data, params) {
				for (var i = 0; i < data.length; i++)
					data[i]['device'] = params['device'];

				data.sort(function(a, b) {
					if (a.bssid < b.bssid)
						return -1;
					else if (a.bssid > b.bssid)
						return 1;
					else
						return 0;
				});

				return data;
			}
		}),

		getWirelessStatus: function() {
			return this.listDeviceNames().then(function(names) {
				L.rpc.batch();

				for (var i = 0; i < names.length; i++)
					L.wireless.getDeviceStatus(names[i]);

				return L.rpc.flush();
			}).then(function(networks) {
				var rv = { };

				var phy_attrs = [
					'country', 'channel', 'frequency', 'frequency_offset',
					'txpower', 'txpower_offset', 'hwmodes', 'hardware', 'phy'
				];

				var net_attrs = [
					'ssid', 'bssid', 'mode', 'quality', 'quality_max',
					'signal', 'noise', 'bitrate', 'encryption'
				];

				for (var i = 0; i < networks.length; i++)
				{
					var phy = rv[networks[i].phy] || (
						rv[networks[i].phy] = { networks: [ ] }
					);

					var net = {
						device: networks[i].device
					};

					for (var j = 0; j < phy_attrs.length; j++)
						phy[phy_attrs[j]] = networks[i][phy_attrs[j]];

					for (var j = 0; j < net_attrs.length; j++)
						net[net_attrs[j]] = networks[i][net_attrs[j]];

					phy.networks.push(net);
				}

				return rv;
			});
		},

		getAssocLists: function()
		{
			return this.listDeviceNames().then(function(names) {
				L.rpc.batch();

				for (var i = 0; i < names.length; i++)
					L.wireless.getAssocList(names[i]);

				return L.rpc.flush();
			}).then(function(assoclists) {
				var rv = [ ];

				for (var i = 0; i < assoclists.length; i++)
					for (var j = 0; j < assoclists[i].length; j++)
						rv.push(assoclists[i][j]);

				return rv;
			});
		},

		formatEncryption: function(enc)
		{
			var format_list = function(l, s)
			{
				var rv = [ ];
				for (var i = 0; i < l.length; i++)
					rv.push(l[i].toUpperCase());
				return rv.join(s ? s : ', ');
			}

			if (!enc || !enc.enabled)
				return L.tr('None');

			if (enc.wep)
			{
				if (enc.wep.length == 2)
					return L.tr('WEP Open/Shared') + ' (%s)'.format(format_list(enc.ciphers, ', '));
				else if (enc.wep[0] == 'shared')
					return L.tr('WEP Shared Auth') + ' (%s)'.format(format_list(enc.ciphers, ', '));
				else
					return L.tr('WEP Open System') + ' (%s)'.format(format_list(enc.ciphers, ', '));
			}
			else if (enc.wpa)
			{
				if (enc.wpa.length == 2)
					return L.tr('mixed WPA/WPA2') + ' %s (%s)'.format(
						format_list(enc.authentication, '/'),
						format_list(enc.ciphers, ', ')
					);
				else if (enc.wpa[0] == 2)
					return 'WPA2 %s (%s)'.format(
						format_list(enc.authentication, '/'),
						format_list(enc.ciphers, ', ')
					);
				else
					return 'WPA %s (%s)'.format(
						format_list(enc.authentication, '/'),
						format_list(enc.ciphers, ', ')
					);
			}

			return L.tr('Unknown');
		}
	};

	this.firewall = {
		getZoneColor: function(zone)
		{
			if ($.isPlainObject(zone))
				zone = zone.name;

			if (zone == 'lan')
				return '#90f090';
			else if (zone == 'wan')
				return '#f09090';

			for (var i = 0, hash = 0;
				 i < zone.length;
				 hash = zone.charCodeAt(i++) + ((hash << 5) - hash));

			for (var i = 0, color = '#';
				 i < 3;
				 color += ('00' + ((hash >> i++ * 8) & 0xFF).tostring(16)).slice(-2));

			return color;
		},

		findZoneByNetwork: function(network)
		{
			var self = this;
			var zone = undefined;

			return L.uci.sections('firewall', 'zone', function(z) {
				if (!z.name || !z.network)
					return;

				if (!$.isArray(z.network))
					z.network = z.network.split(/\s+/);

				for (var i = 0; i < z.network.length; i++)
				{
					if (z.network[i] == network)
					{
						zone = z;
						break;
					}
				}
			}).then(function() {
				if (zone)
					zone.color = self.getZoneColor(zone);

				return zone;
			});
		}
	};

	this.NetworkModel = {
		deviceBlacklist: [
			/^gre[0-9]+$/,
			/^gretap[0-9]+$/,
			/^ifb[0-9]+$/,
			/^ip6tnl[0-9]+$/,
			/^sit[0-9]+$/,
			/^wlan[0-9]+\.sta[0-9]+$/
		],

		rpcCacheFunctions: [
			'protolist', 0, L.rpc.declare({
				object: 'network',
				method: 'get_proto_handlers',
				expect: { '': { } }
			}),
			'ifstate', 1, L.rpc.declare({
				object: 'network.interface',
				method: 'dump',
				expect: { 'interface': [ ] }
			}),
			'devstate', 2, L.rpc.declare({
				object: 'network.device',
				method: 'status',
				expect: { '': { } }
			}),
			'wifistate', 0, L.rpc.declare({
				object: 'network.wireless',
				method: 'status',
				expect: { '': { } }
			}),
			'bwstate', 2, L.rpc.declare({
				object: 'luci2.network.bwmon',
				method: 'statistics',
				expect: { 'statistics': { } }
			}),
			'devlist', 2, L.rpc.declare({
				object: 'luci2.network',
				method: 'device_list',
				expect: { 'devices': [ ] }
			}),
			'swlist', 0, L.rpc.declare({
				object: 'luci2.network',
				method: 'switch_list',
				expect: { 'switches': [ ] }
			})
		],

		loadProtocolHandler: function(proto)
		{
			var url = L.globals.resource + '/proto/' + proto + '.js';
			var self = L.NetworkModel;

			var def = $.Deferred();

			$.ajax(url, {
				method: 'GET',
				cache: true,
				dataType: 'text'
			}).then(function(data) {
				try {
					var protoConstructorSource = (
						'(function(L, $) { ' +
							'return %s' +
						'})(L, $);\n\n' +
						'//@ sourceURL=%s'
					).format(data, url);

					var protoClass = eval(protoConstructorSource);

					self.protocolHandlers[proto] = new protoClass();
				}
				catch(e) {
					alert('Unable to instantiate proto "%s": %s'.format(url, e));
				};

				def.resolve();
			}).fail(function() {
				def.resolve();
			});

			return def;
		},

		loadProtocolHandlers: function()
		{
			var self = L.NetworkModel;
			var deferreds = [
				self.loadProtocolHandler('none')
			];

			for (var proto in self.rpcCache.protolist)
				deferreds.push(self.loadProtocolHandler(proto));

			return $.when.apply($, deferreds);
		},

		callSwitchInfo: L.rpc.declare({
			object: 'luci2.network',
			method: 'switch_info',
			params: [ 'switch' ],
			expect: { 'info': { } }
		}),

		callSwitchInfoCallback: function(responses) {
			var self = L.NetworkModel;
			var swlist = self.rpcCache.swlist;
			var swstate = self.rpcCache.swstate = { };

			for (var i = 0; i < responses.length; i++)
				swstate[swlist[i]] = responses[i];
		},

		loadCacheCallback: function(level)
		{
			var self = L.NetworkModel;
			var name = '_fetch_cache_cb_' + level;

			return self[name] || (
				self[name] = function(responses)
				{
					for (var i = 0; i < self.rpcCacheFunctions.length; i += 3)
						if (!level || self.rpcCacheFunctions[i + 1] == level)
							self.rpcCache[self.rpcCacheFunctions[i]] = responses.shift();

					if (!level)
					{
						L.rpc.batch();

						for (var i = 0; i < self.rpcCache.swlist.length; i++)
							self.callSwitchInfo(self.rpcCache.swlist[i]);

						return L.rpc.flush().then(self.callSwitchInfoCallback);
					}

					return L.deferrable();
				}
			);
		},

		loadCache: function(level)
		{
			var self = L.NetworkModel;

			return L.uci.load(['network', 'wireless']).then(function() {
				L.rpc.batch();

				for (var i = 0; i < self.rpcCacheFunctions.length; i += 3)
					if (!level || self.rpcCacheFunctions[i + 1] == level)
						self.rpcCacheFunctions[i + 2]();

				return L.rpc.flush().then(self.loadCacheCallback(level || 0));
			});
		},

		isBlacklistedDevice: function(dev)
		{
			for (var i = 0; i < this.deviceBlacklist.length; i++)
				if (dev.match(this.deviceBlacklist[i]))
					return true;

			return false;
		},

		sortDevicesCallback: function(a, b)
		{
			if (a.options.kind < b.options.kind)
				return -1;
			else if (a.options.kind > b.options.kind)
				return 1;

			if (a.options.name < b.options.name)
				return -1;
			else if (a.options.name > b.options.name)
				return 1;

			return 0;
		},

		getDeviceObject: function(ifname)
		{
			var alias = (ifname.charAt(0) == '@');
			return this.deviceObjects[ifname] || (
				this.deviceObjects[ifname] = {
					ifname:  ifname,
					kind:    alias ? 'alias' : 'ethernet',
					type:    alias ? 0 : 1,
					up:      false,
					changed: { }
				}
			);
		},

		getInterfaceObject: function(name)
		{
			return this.interfaceObjects[name] || (
				this.interfaceObjects[name] = {
					name:    name,
					proto:   this.protocolHandlers.none,
					changed: { }
				}
			);
		},

		loadDevicesCallback: function()
		{
			var self = L.NetworkModel;
			var wificount = { };

			for (var ifname in self.rpcCache.devstate)
			{
				if (self.isBlacklistedDevice(ifname))
					continue;

				var dev = self.rpcCache.devstate[ifname];
				var entry = self.getDeviceObject(ifname);

				entry.up = dev.up;

				switch (dev.type)
				{
				case 'IP tunnel':
					entry.kind = 'tunnel';
					break;

				case 'Bridge':
					entry.kind = 'bridge';
					//entry.ports = dev['bridge-members'].sort();
					break;
				}
			}

			for (var i = 0; i < self.rpcCache.devlist.length; i++)
			{
				var dev = self.rpcCache.devlist[i];

				if (self.isBlacklistedDevice(dev.device))
					continue;

				var entry = self.getDeviceObject(dev.device);

				entry.up   = dev.is_up;
				entry.type = dev.type;

				switch (dev.type)
				{
				case 1: /* Ethernet */
					if (dev.is_bridge)
						entry.kind = 'bridge';
					else if (dev.is_tuntap)
						entry.kind = 'tunnel';
					else if (dev.is_wireless)
						entry.kind = 'wifi';
					break;

				case 512: /* PPP */
				case 768: /* IP-IP Tunnel */
				case 769: /* IP6-IP6 Tunnel */
				case 776: /* IPv6-in-IPv4 */
				case 778: /* GRE over IP */
					entry.kind = 'tunnel';
					break;
				}
			}

			var net = L.uci.sections('network');
			for (var i = 0; i < net.length; i++)
			{
				var s = net[i];
				var sid = s['.name'];

				if (s['.type'] == 'device' && s.name)
				{
					var entry = self.getDeviceObject(s.name);

					switch (s.type)
					{
					case 'macvlan':
					case 'tunnel':
						entry.kind = 'tunnel';
						break;
					}

					entry.sid = sid;
				}
				else if (s['.type'] == 'interface' && !s['.anonymous'] && s.ifname)
				{
					var ifnames = L.toArray(s.ifname);

					for (var j = 0; j < ifnames.length; j++)
						self.getDeviceObject(ifnames[j]);

					if (s['.name'] != 'loopback')
					{
						var entry = self.getDeviceObject('@%s'.format(s['.name']));

						entry.type = 0;
						entry.kind = 'alias';
						entry.sid  = sid;
					}
				}
				else if (s['.type'] == 'switch_vlan' && s.device)
				{
					var sw = self.rpcCache.swstate[s.device];
					var vid = parseInt(s.vid || s.vlan);
					var ports = L.toArray(s.ports);

					if (!sw || !ports.length || isNaN(vid))
						continue;

					var ifname = undefined;

					for (var j = 0; j < ports.length; j++)
					{
						var port = parseInt(ports[j]);
						var tag = (ports[j].replace(/[^tu]/g, '') == 't');

						if (port == sw.cpu_port)
						{
							// XXX: need a way to map switch to netdev
							if (tag)
								ifname = 'eth0.%d'.format(vid);
							else
								ifname = 'eth0';

							break;
						}
					}

					if (!ifname)
						continue;

					var entry = self.getDeviceObject(ifname);

					entry.kind = 'vlan';
					entry.sid  = sid;
					entry.vsw  = sw;
					entry.vid  = vid;
				}
			}

			var wifi = L.uci.sections('wireless');
			for (var i = 0; i < wifi.length; i++)
			{
				var s = wifi[i];
				var sid = s['.name'];

				if (s['.type'] == 'wifi-iface' && s.device)
				{
					var r = parseInt(s.device.replace(/^[^0-9]+/, ''));
					var n = wificount[s.device] = (wificount[s.device] || 0) + 1;
					var id = 'radio%d.network%d'.format(r, n);
					var ifname = id;

					if (self.rpcCache.wifistate[s.device])
					{
						var ifcs = self.rpcCache.wifistate[s.device].interfaces;
						for (var ifc in ifcs)
						{
							if (ifcs[ifc].section == sid && ifcs[ifc].ifname)
							{
								ifname = ifcs[ifc].ifname;
								break;
							}
						}
					}

					var entry = self.getDeviceObject(ifname);

					entry.kind   = 'wifi';
					entry.sid    = sid;
					entry.wid    = id;
					entry.wdev   = s.device;
					entry.wmode  = s.mode;
					entry.wssid  = s.ssid;
					entry.wbssid = s.bssid;
				}
			}

			for (var i = 0; i < net.length; i++)
			{
				var s = net[i];
				var sid = s['.name'];

				if (s['.type'] == 'interface' && !s['.anonymous'] && s.type == 'bridge')
				{
					var ifnames = L.toArray(s.ifname);

					for (var ifname in self.deviceObjects)
					{
						var dev = self.deviceObjects[ifname];

						if (dev.kind != 'wifi')
							continue;

						var wnets = L.toArray(L.uci.get('wireless', dev.sid, 'network'));
						if ($.inArray(sid, wnets) > -1)
							ifnames.push(ifname);
					}

					entry = self.getDeviceObject('br-%s'.format(s['.name']));
					entry.type  = 1;
					entry.kind  = 'bridge';
					entry.sid   = sid;
					entry.ports = ifnames.sort();
				}
			}
		},

		loadInterfacesCallback: function()
		{
			var self = L.NetworkModel;
			var net = L.uci.sections('network');

			for (var i = 0; i < net.length; i++)
			{
				var s = net[i];
				var sid = s['.name'];

				if (s['.type'] == 'interface' && !s['.anonymous'] && s.proto)
				{
					var entry = self.getInterfaceObject(s['.name']);
					var proto = self.protocolHandlers[s.proto] || self.protocolHandlers.none;

					var l3dev = undefined;
					var l2dev = undefined;

					var ifnames = L.toArray(s.ifname);

					for (var ifname in self.deviceObjects)
					{
						var dev = self.deviceObjects[ifname];

						if (dev.kind != 'wifi')
							continue;

						var wnets = L.toArray(L.uci.get('wireless', dev.sid, 'network'));
						if ($.inArray(entry.name, wnets) > -1)
							ifnames.push(ifname);
					}

					if (proto.virtual)
						l3dev = '%s-%s'.format(s.proto, entry.name);
					else if (s.type == 'bridge')
						l3dev = 'br-%s'.format(entry.name);
					else
						l3dev = ifnames[0];

					if (!proto.virtual && s.type == 'bridge')
						l2dev = 'br-%s'.format(entry.name);
					else if (!proto.virtual)
						l2dev = ifnames[0];

					entry.proto = proto;
					entry.sid   = sid;
					entry.l3dev = l3dev;
					entry.l2dev = l2dev;
				}
			}

			for (var i = 0; i < self.rpcCache.ifstate.length; i++)
			{
				var iface = self.rpcCache.ifstate[i];
				var entry = self.getInterfaceObject(iface['interface']);
				var proto = self.protocolHandlers[iface.proto] || self.protocolHandlers.none;

				/* this is a virtual interface, either deleted from config but
				   not applied yet or set up from external tools (6rd) */
				if (!entry.sid)
				{
					entry.proto = proto;
					entry.l2dev = iface.device;
					entry.l3dev = iface.l3_device;
				}
			}
		},

		init: function()
		{
			var self = this;

			if (self.rpcCache)
				return L.deferrable();

			self.rpcCache         = { };
			self.deviceObjects    = { };
			self.interfaceObjects = { };
			self.protocolHandlers = { };

			return self.loadCache()
				.then(self.loadProtocolHandlers)
				.then(self.loadDevicesCallback)
				.then(self.loadInterfacesCallback);
		},

		update: function()
		{
			delete this.rpcCache;
			return this.init();
		},

		refreshInterfaceStatus: function()
		{
			return this.loadCache(1).then(this.loadInterfacesCallback);
		},

		refreshDeviceStatus: function()
		{
			return this.loadCache(2).then(this.loadDevicesCallback);
		},

		refreshStatus: function()
		{
			return this.loadCache(1)
				.then(this.loadCache(2))
				.then(this.loadDevicesCallback)
				.then(this.loadInterfacesCallback);
		},

		getDevices: function()
		{
			var devs = [ ];

			for (var ifname in this.deviceObjects)
				if (ifname != 'lo')
					devs.push(new L.NetworkModel.Device(this.deviceObjects[ifname]));

			return devs.sort(this.sortDevicesCallback);
		},

		getDeviceByInterface: function(iface)
		{
			if (iface instanceof L.NetworkModel.Interface)
				iface = iface.name();

			if (this.interfaceObjects[iface])
				return this.getDevice(this.interfaceObjects[iface].l3dev) ||
				       this.getDevice(this.interfaceObjects[iface].l2dev);

			return undefined;
		},

		getDevice: function(ifname)
		{
			if (this.deviceObjects[ifname])
				return new L.NetworkModel.Device(this.deviceObjects[ifname]);

			return undefined;
		},

		createDevice: function(name)
		{
			return new L.NetworkModel.Device(this.getDeviceObject(name));
		},

		getInterfaces: function()
		{
			var ifaces = [ ];

			for (var name in this.interfaceObjects)
				if (name != 'loopback')
					ifaces.push(this.getInterface(name));

			ifaces.sort(function(a, b) {
				if (a.name() < b.name())
					return -1;
				else if (a.name() > b.name())
					return 1;
				else
					return 0;
			});

			return ifaces;
		},

		getInterfacesByDevice: function(dev)
		{
			var ifaces = [ ];

			if (dev instanceof L.NetworkModel.Device)
				dev = dev.name();

			for (var name in this.interfaceObjects)
			{
				var iface = this.interfaceObjects[name];
				if (iface.l2dev == dev || iface.l3dev == dev)
					ifaces.push(this.getInterface(name));
			}

			ifaces.sort(function(a, b) {
				if (a.name() < b.name())
					return -1;
				else if (a.name() > b.name())
					return 1;
				else
					return 0;
			});

			return ifaces;
		},

		getInterface: function(iface)
		{
			if (this.interfaceObjects[iface])
				return new L.NetworkModel.Interface(this.interfaceObjects[iface]);

			return undefined;
		},

		getProtocols: function()
		{
			var rv = [ ];

			for (var proto in this.protocolHandlers)
			{
				var pr = this.protocolHandlers[proto];

				rv.push({
					name:        proto,
					description: pr.description,
					virtual:     pr.virtual,
					tunnel:      pr.tunnel
				});
			}

			return rv.sort(function(a, b) {
				if (a.name < b.name)
					return -1;
				else if (a.name > b.name)
					return 1;
				else
					return 0;
			});
		},

		findWANByAddr: function(ipaddr)
		{
			for (var i = 0; i < this.rpcCache.ifstate.length; i++)
			{
				var ifstate = this.rpcCache.ifstate[i];

				if (!ifstate.route)
					continue;

				for (var j = 0; j < ifstate.route.length; j++)
					if (ifstate.route[j].mask == 0 &&
					    ifstate.route[j].target == ipaddr &&
					    typeof(ifstate.route[j].table) == 'undefined')
					{
						return this.getInterface(ifstate['interface']);
					}
			}

			return undefined;
		},

		findWAN: function()
		{
			return this.findWANByAddr('0.0.0.0');
		},

		findWAN6: function()
		{
			return this.findWANByAddr('::');
		},

		resolveAlias: function(ifname)
		{
			if (ifname instanceof L.NetworkModel.Device)
				ifname = ifname.name();

			var dev = this.deviceObjects[ifname];
			var seen = { };

			while (dev && dev.kind == 'alias')
			{
				// loop
				if (seen[dev.ifname])
					return undefined;

				var ifc = this.interfaceObjects[dev.sid];

				seen[dev.ifname] = true;
				dev = ifc ? this.deviceObjects[ifc.l3dev] : undefined;
			}

			return dev ? this.getDevice(dev.ifname) : undefined;
		}
	};

	this.NetworkModel.Device = Class.extend({
		wifiModeStrings: {
			ap: L.tr('Master'),
			sta: L.tr('Client'),
			adhoc: L.tr('Ad-Hoc'),
			monitor: L.tr('Monitor'),
			wds: L.tr('Static WDS')
		},

		getStatus: function(key)
		{
			var s = L.NetworkModel.rpcCache.devstate[this.options.ifname];

			if (s)
				return key ? s[key] : s;

			return undefined;
		},

		get: function(key)
		{
			var sid = this.options.sid;
			var pkg = (this.options.kind == 'wifi') ? 'wireless' : 'network';
			return L.uci.get(pkg, sid, key);
		},

		set: function(key, val)
		{
			var sid = this.options.sid;
			var pkg = (this.options.kind == 'wifi') ? 'wireless' : 'network';
			return L.uci.set(pkg, sid, key, val);
		},

		init: function()
		{
			if (typeof(this.options.type) == 'undefined')
				this.options.type = 1;

			if (typeof(this.options.kind) == 'undefined')
				this.options.kind = 'ethernet';

			if (typeof(this.options.networks) == 'undefined')
				this.options.networks = [ ];
		},

		name: function()
		{
			return this.options.ifname;
		},

		description: function()
		{
			switch (this.options.kind)
			{
			case 'alias':
				return L.tr('Alias for network "%s"').format(this.options.ifname.substring(1));

			case 'bridge':
				return L.tr('Network bridge');

			case 'ethernet':
				return L.tr('Network device');

			case 'tunnel':
				switch (this.options.type)
				{
				case 1: /* tuntap */
					return L.tr('TAP device');

				case 512: /* PPP */
					return L.tr('PPP tunnel');

				case 768: /* IP-IP Tunnel */
					return L.tr('IP-in-IP tunnel');

				case 769: /* IP6-IP6 Tunnel */
					return L.tr('IPv6-in-IPv6 tunnel');

				case 776: /* IPv6-in-IPv4 */
					return L.tr('IPv6-over-IPv4 tunnel');
					break;

				case 778: /* GRE over IP */
					return L.tr('GRE-over-IP tunnel');

				default:
					return L.tr('Tunnel device');
				}

			case 'vlan':
				return L.tr('VLAN %d on %s').format(this.options.vid, this.options.vsw.model);

			case 'wifi':
				var o = this.options;
				return L.trc('(Wifi-Mode) "(SSID)" on (radioX)', '%s "%h" on %s').format(
					o.wmode ? this.wifiModeStrings[o.wmode] : L.tr('Unknown mode'),
					o.wssid || '?', o.wdev
				);
			}

			return L.tr('Unknown device');
		},

		icon: function(up)
		{
			var kind = this.options.kind;

			if (kind == 'alias')
				kind = 'ethernet';

			if (typeof(up) == 'undefined')
				up = this.isUp();

			return L.globals.resource + '/icons/%s%s.png'.format(kind, up ? '' : '_disabled');
		},

		isUp: function()
		{
			var l = L.NetworkModel.rpcCache.devlist;

			for (var i = 0; i < l.length; i++)
				if (l[i].device == this.options.ifname)
					return (l[i].is_up === true);

			return false;
		},

		isAlias: function()
		{
			return (this.options.kind == 'alias');
		},

		isBridge: function()
		{
			return (this.options.kind == 'bridge');
		},

		isBridgeable: function()
		{
			return (this.options.type == 1 && this.options.kind != 'bridge');
		},

		isWireless: function()
		{
			return (this.options.kind == 'wifi');
		},

		isInNetwork: function(net)
		{
			if (!(net instanceof L.NetworkModel.Interface))
				net = L.NetworkModel.getInterface(net);

			if (net)
			{
				if (net.options.l3dev == this.options.ifname ||
				    net.options.l2dev == this.options.ifname)
					return true;

				var dev = L.NetworkModel.deviceObjects[net.options.l2dev];
				if (dev && dev.kind == 'bridge' && dev.ports)
					return ($.inArray(this.options.ifname, dev.ports) > -1);
			}

			return false;
		},

		getMTU: function()
		{
			var dev = L.NetworkModel.rpcCache.devstate[this.options.ifname];
			if (dev && !isNaN(dev.mtu))
				return dev.mtu;

			return undefined;
		},

		getMACAddress: function()
		{
			if (this.options.type != 1)
				return undefined;

			var dev = L.NetworkModel.rpcCache.devstate[this.options.ifname];
			if (dev && dev.macaddr)
				return dev.macaddr.toUpperCase();

			return undefined;
		},

		getInterfaces: function()
		{
			return L.NetworkModel.getInterfacesByDevice(this.options.name);
		},

		getStatistics: function()
		{
			var s = this.getStatus('statistics') || { };
			return {
				rx_bytes: (s.rx_bytes || 0),
				tx_bytes: (s.tx_bytes || 0),
				rx_packets: (s.rx_packets || 0),
				tx_packets: (s.tx_packets || 0)
			};
		},

		getTrafficHistory: function()
		{
			var def = new Array(120);

			for (var i = 0; i < 120; i++)
				def[i] = 0;

			var h = L.NetworkModel.rpcCache.bwstate[this.options.ifname] || { };
			return {
				rx_bytes: (h.rx_bytes || def),
				tx_bytes: (h.tx_bytes || def),
				rx_packets: (h.rx_packets || def),
				tx_packets: (h.tx_packets || def)
			};
		},

		removeFromInterface: function(iface)
		{
			if (!(iface instanceof L.NetworkModel.Interface))
				iface = L.NetworkModel.getInterface(iface);

			if (!iface)
				return;

			var ifnames = L.toArray(iface.get('ifname'));
			if ($.inArray(this.options.ifname, ifnames) > -1)
				iface.set('ifname', L.filterArray(ifnames, this.options.ifname));

			if (this.options.kind != 'wifi')
				return;

			var networks = L.toArray(this.get('network'));
			if ($.inArray(iface.name(), networks) > -1)
				this.set('network', L.filterArray(networks, iface.name()));
		},

		attachToInterface: function(iface)
		{
			if (!(iface instanceof L.NetworkModel.Interface))
				iface = L.NetworkModel.getInterface(iface);

			if (!iface)
				return;

			if (this.options.kind != 'wifi')
			{
				var ifnames = L.toArray(iface.get('ifname'));
				if ($.inArray(this.options.ifname, ifnames) < 0)
				{
					ifnames.push(this.options.ifname);
					iface.set('ifname', (ifnames.length > 1) ? ifnames : ifnames[0]);
				}
			}
			else
			{
				var networks = L.toArray(this.get('network'));
				if ($.inArray(iface.name(), networks) < 0)
				{
					networks.push(iface.name());
					this.set('network', (networks.length > 1) ? networks : networks[0]);
				}
			}
		}
	});

	this.NetworkModel.Interface = Class.extend({
		getStatus: function(key)
		{
			var s = L.NetworkModel.rpcCache.ifstate;

			for (var i = 0; i < s.length; i++)
				if (s[i]['interface'] == this.options.name)
					return key ? s[i][key] : s[i];

			return undefined;
		},

		get: function(key)
		{
			return L.uci.get('network', this.options.name, key);
		},

		set: function(key, val)
		{
			return L.uci.set('network', this.options.name, key, val);
		},

		name: function()
		{
			return this.options.name;
		},

		protocol: function()
		{
			return (this.get('proto') || 'none');
		},

		isUp: function()
		{
			return (this.getStatus('up') === true);
		},

		isVirtual: function()
		{
			return (typeof(this.options.sid) != 'string');
		},

		getProtocol: function()
		{
			var prname = this.get('proto') || 'none';
			return L.NetworkModel.protocolHandlers[prname] || L.NetworkModel.protocolHandlers.none;
		},

		getUptime: function()
		{
			var uptime = this.getStatus('uptime');
			return isNaN(uptime) ? 0 : uptime;
		},

		getDevice: function(resolveAlias)
		{
			if (this.options.l3dev)
				return L.NetworkModel.getDevice(this.options.l3dev);

			return undefined;
		},

		getPhysdev: function()
		{
			if (this.options.l2dev)
				return L.NetworkModel.getDevice(this.options.l2dev);

			return undefined;
		},

		getSubdevices: function()
		{
			var rv = [ ];
			var dev = this.options.l2dev ?
				L.NetworkModel.deviceObjects[this.options.l2dev] : undefined;

			if (dev && dev.kind == 'bridge' && dev.ports && dev.ports.length)
				for (var i = 0; i < dev.ports.length; i++)
					rv.push(L.NetworkModel.getDevice(dev.ports[i]));

			return rv;
		},

		getIPv4Addrs: function(mask)
		{
			var rv = [ ];
			var addrs = this.getStatus('ipv4-address');

			if (addrs)
				for (var i = 0; i < addrs.length; i++)
					if (!mask)
						rv.push(addrs[i].address);
					else
						rv.push('%s/%d'.format(addrs[i].address, addrs[i].mask));

			return rv;
		},

		getIPv6Addrs: function(mask)
		{
			var rv = [ ];
			var addrs;

			addrs = this.getStatus('ipv6-address');

			if (addrs)
				for (var i = 0; i < addrs.length; i++)
					if (!mask)
						rv.push(addrs[i].address);
					else
						rv.push('%s/%d'.format(addrs[i].address, addrs[i].mask));

			addrs = this.getStatus('ipv6-prefix-assignment');

			if (addrs)
				for (var i = 0; i < addrs.length; i++)
					if (!mask)
						rv.push('%s1'.format(addrs[i].address));
					else
						rv.push('%s1/%d'.format(addrs[i].address, addrs[i].mask));

			return rv;
		},

		getDNSAddrs: function()
		{
			var rv = [ ];
			var addrs = this.getStatus('dns-server');

			if (addrs)
				for (var i = 0; i < addrs.length; i++)
					rv.push(addrs[i]);

			return rv;
		},

		getIPv4DNS: function()
		{
			var rv = [ ];
			var dns = this.getStatus('dns-server');

			if (dns)
				for (var i = 0; i < dns.length; i++)
					if (dns[i].indexOf(':') == -1)
						rv.push(dns[i]);

			return rv;
		},

		getIPv6DNS: function()
		{
			var rv = [ ];
			var dns = this.getStatus('dns-server');

			if (dns)
				for (var i = 0; i < dns.length; i++)
					if (dns[i].indexOf(':') > -1)
						rv.push(dns[i]);

			return rv;
		},

		getIPv4Gateway: function()
		{
			var rt = this.getStatus('route');

			if (rt)
				for (var i = 0; i < rt.length; i++)
					if (rt[i].target == '0.0.0.0' && rt[i].mask == 0)
						return rt[i].nexthop;

			return undefined;
		},

		getIPv6Gateway: function()
		{
			var rt = this.getStatus('route');

			if (rt)
				for (var i = 0; i < rt.length; i++)
					if (rt[i].target == '::' && rt[i].mask == 0)
						return rt[i].nexthop;

			return undefined;
		},

		getStatistics: function()
		{
			var dev = this.getDevice() || new L.NetworkModel.Device({});
			return dev.getStatistics();
		},

		getTrafficHistory: function()
		{
			var dev = this.getDevice() || new L.NetworkModel.Device({});
			return dev.getTrafficHistory();
		},

		renderBadge: function()
		{
			var badge = $('<span />')
				.addClass('badge')
				.text('%s: '.format(this.name()));

			var dev = this.getDevice();
			var subdevs = this.getSubdevices();

			if (subdevs.length)
				for (var j = 0; j < subdevs.length; j++)
					badge.append($('<img />')
						.attr('src', subdevs[j].icon())
						.attr('title', '%s (%s)'.format(subdevs[j].description(), subdevs[j].name() || '?')));
			else if (dev)
				badge.append($('<img />')
					.attr('src', dev.icon())
					.attr('title', '%s (%s)'.format(dev.description(), dev.name() || '?')));
			else
				badge.append($('<em />').text(L.tr('(No devices attached)')));

			return badge;
		},

		setDevices: function(devs)
		{
			var dev = this.getPhysdev();
			var old_devs = [ ];
			var changed = false;

			if (dev && dev.isBridge())
				old_devs = this.getSubdevices();
			else if (dev)
				old_devs = [ dev ];

			if (old_devs.length != devs.length)
				changed = true;
			else
				for (var i = 0; i < old_devs.length; i++)
				{
					var dev = devs[i];

					if (dev instanceof L.NetworkModel.Device)
						dev = dev.name();

					if (!dev || old_devs[i].name() != dev)
					{
						changed = true;
						break;
					}
				}

			if (changed)
			{
				for (var i = 0; i < old_devs.length; i++)
					old_devs[i].removeFromInterface(this);

				for (var i = 0; i < devs.length; i++)
				{
					var dev = devs[i];

					if (!(dev instanceof L.NetworkModel.Device))
						dev = L.NetworkModel.getDevice(dev);

					if (dev)
						dev.attachToInterface(this);
				}
			}
		},

		changeProtocol: function(proto)
		{
			var pr = L.NetworkModel.protocolHandlers[proto];

			if (!pr)
				return;

			for (var opt in (this.get() || { }))
			{
				switch (opt)
				{
				case 'type':
				case 'ifname':
				case 'macaddr':
					if (pr.virtual)
						this.set(opt, undefined);
					break;

				case 'auto':
				case 'mtu':
					break;

				case 'proto':
					this.set(opt, pr.protocol);
					break;

				default:
					this.set(opt, undefined);
					break;
				}
			}
		},

		createForm: function(mapwidget)
		{
			var self = this;
			var proto = self.getProtocol();
			var device = self.getDevice();

			if (!mapwidget)
				mapwidget = L.cbi.Map;

			var map = new mapwidget('network', {
				caption:     L.tr('Configure "%s"').format(self.name())
			});

			var section = map.section(L.cbi.SingleSection, self.name(), {
				anonymous:   true
			});

			section.tab({
				id:      'general',
				caption: L.tr('General Settings')
			});

			section.tab({
				id:      'advanced',
				caption: L.tr('Advanced Settings')
			});

			section.tab({
				id:      'ipv6',
				caption: L.tr('IPv6')
			});

			section.tab({
				id:      'physical',
				caption: L.tr('Physical Settings')
			});


			section.taboption('general', L.cbi.CheckboxValue, 'auto', {
				caption:     L.tr('Start on boot'),
				optional:    true,
				initial:     true
			});

			var pr = section.taboption('general', L.cbi.ListValue, 'proto', {
				caption:     L.tr('Protocol')
			});

			pr.ucivalue = function(sid) {
				return self.get('proto') || 'none';
			};

			var ok = section.taboption('general', L.cbi.ButtonValue, '_confirm', {
				caption:     L.tr('Really switch?'),
				description: L.tr('Changing the protocol will clear all configuration for this interface!'),
				text:        L.tr('Change protocol')
			});

			ok.on('click', function(ev) {
				self.changeProtocol(pr.formvalue(ev.data.sid));
				self.createForm(mapwidget).show();
			});

			var protos = L.NetworkModel.getProtocols();

			for (var i = 0; i < protos.length; i++)
				pr.value(protos[i].name, protos[i].description);

			proto.populateForm(section, self);

			if (!proto.virtual)
			{
				var br = section.taboption('physical', L.cbi.CheckboxValue, 'type', {
					caption:     L.tr('Network bridge'),
					description: L.tr('Merges multiple devices into one logical bridge'),
					optional:    true,
					enabled:     'bridge',
					disabled:    '',
					initial:     ''
				});

				section.taboption('physical', L.cbi.DeviceList, '__iface_multi', {
					caption:     L.tr('Devices'),
					multiple:    true,
					bridges:     false
				}).depends('type', true);

				section.taboption('physical', L.cbi.DeviceList, '__iface_single', {
					caption:     L.tr('Device'),
					multiple:    false,
					bridges:     true
				}).depends('type', false);

				var mac = section.taboption('physical', L.cbi.InputValue, 'macaddr', {
					caption:     L.tr('Override MAC'),
					optional:    true,
					placeholder: device ? device.getMACAddress() : undefined,
					datatype:    'macaddr'
				})

				mac.ucivalue = function(sid)
				{
					if (device)
						return device.get('macaddr');

					return this.callSuper('ucivalue', sid);
				};

				mac.save = function(sid)
				{
					if (!this.changed(sid))
						return false;

					if (device)
						device.set('macaddr', this.formvalue(sid));
					else
						this.callSuper('set', sid);

					return true;
				};
			}

			section.taboption('physical', L.cbi.InputValue, 'mtu', {
				caption:     L.tr('Override MTU'),
				optional:    true,
				placeholder: device ? device.getMTU() : undefined,
				datatype:    'range(1, 9000)'
			});

			section.taboption('physical', L.cbi.InputValue, 'metric', {
				caption:     L.tr('Override Metric'),
				optional:    true,
				placeholder: 0,
				datatype:    'uinteger'
			});

			for (var field in section.fields)
			{
				switch (field)
				{
				case 'proto':
					break;

				case '_confirm':
					for (var i = 0; i < protos.length; i++)
						if (protos[i].name != (this.get('proto') || 'none'))
							section.fields[field].depends('proto', protos[i].name);
					break;

				default:
					section.fields[field].depends('proto', this.get('proto') || 'none', true);
					break;
				}
			}

			return map;
		}
	});

	this.NetworkModel.Protocol = this.NetworkModel.Interface.extend({
		description: '__unknown__',
		tunnel:      false,
		virtual:     false,

		populateForm: function(section, iface)
		{

		}
	});

	this.system = {
		getSystemInfo: L.rpc.declare({
			object: 'system',
			method: 'info',
			expect: { '': { } }
		}),

		getBoardInfo: L.rpc.declare({
			object: 'system',
			method: 'board',
			expect: { '': { } }
		}),

		getDiskInfo: L.rpc.declare({
			object: 'luci2.system',
			method: 'diskfree',
			expect: { '': { } }
		}),

		getInfo: function(cb)
		{
			L.rpc.batch();

			this.getSystemInfo();
			this.getBoardInfo();
			this.getDiskInfo();

			return L.rpc.flush().then(function(info) {
				var rv = { };

				$.extend(rv, info[0]);
				$.extend(rv, info[1]);
				$.extend(rv, info[2]);

				return rv;
			});
		},


		initList: L.rpc.declare({
			object: 'luci2.system',
			method: 'init_list',
			expect: { initscripts: [ ] },
			filter: function(data) {
				data.sort(function(a, b) { return (a.start || 0) - (b.start || 0) });
				return data;
			}
		}),

		initEnabled: function(init, cb)
		{
			return this.initList().then(function(list) {
				for (var i = 0; i < list.length; i++)
					if (list[i].name == init)
						return !!list[i].enabled;

				return false;
			});
		},

		initRun: L.rpc.declare({
			object: 'luci2.system',
			method: 'init_action',
			params: [ 'name', 'action' ],
			filter: function(data) {
				return (data == 0);
			}
		}),

		initStart:   function(init, cb) { return L.system.initRun(init, 'start',   cb) },
		initStop:    function(init, cb) { return L.system.initRun(init, 'stop',    cb) },
		initRestart: function(init, cb) { return L.system.initRun(init, 'restart', cb) },
		initReload:  function(init, cb) { return L.system.initRun(init, 'reload',  cb) },
		initEnable:  function(init, cb) { return L.system.initRun(init, 'enable',  cb) },
		initDisable: function(init, cb) { return L.system.initRun(init, 'disable', cb) },


		performReboot: L.rpc.declare({
			object: 'luci2.system',
			method: 'reboot'
		})
	};

	this.session = {

		login: L.rpc.declare({
			object: 'session',
			method: 'login',
			params: [ 'username', 'password' ],
			expect: { '': { } }
		}),

		access: L.rpc.declare({
			object: 'session',
			method: 'access',
			params: [ 'scope', 'object', 'function' ],
			expect: { access: false }
		}),

		isAlive: function()
		{
			return L.session.access('ubus', 'session', 'access');
		},

		startHeartbeat: function()
		{
			this._hearbeatInterval = window.setInterval(function() {
				L.session.isAlive().then(function(alive) {
					if (!alive)
					{
						L.session.stopHeartbeat();
						L.ui.login(true);
					}

				});
			}, L.globals.timeout * 2);
		},

		stopHeartbeat: function()
		{
			if (typeof(this._hearbeatInterval) != 'undefined')
			{
				window.clearInterval(this._hearbeatInterval);
				delete this._hearbeatInterval;
			}
		},


		aclCache: { },

		callAccess: L.rpc.declare({
			object: 'session',
			method: 'access',
			expect: { '': { } }
		}),

		callAccessCallback: function(acls)
		{
			L.session.aclCache = acls;
		},

		updateACLs: function()
		{
			return L.session.callAccess()
				.then(L.session.callAccessCallback);
		},

		hasACL: function(scope, object, func)
		{
			var acls = L.session.aclCache;

			if (typeof(func) == 'undefined')
				return (acls && acls[scope] && acls[scope][object]);

			if (acls && acls[scope] && acls[scope][object])
				for (var i = 0; i < acls[scope][object].length; i++)
					if (acls[scope][object][i] == func)
						return true;

			return false;
		}
	};

	this.ui = {

		saveScrollTop: function()
		{
			this._scroll_top = $(document).scrollTop();
		},

		restoreScrollTop: function()
		{
			if (typeof(this._scroll_top) == 'undefined')
				return;

			$(document).scrollTop(this._scroll_top);

			delete this._scroll_top;
		},

		loading: function(enable)
		{
			var win = $(window);
			var body = $('body');

			var state = L.ui._loading || (L.ui._loading = {
				modal: $('<div />')
					.css('z-index', 2000)
					.addClass('modal fade')
					.append($('<div />')
						.addClass('modal-dialog')
						.append($('<div />')
							.addClass('modal-content luci2-modal-loader')
							.append($('<div />')
								.addClass('modal-body')
								.text(L.tr('Loading data…')))))
					.appendTo(body)
					.modal({
						backdrop: 'static',
						keyboard: false
					})
			});

			state.modal.modal(enable ? 'show' : 'hide');
		},

		dialog: function(title, content, options)
		{
			var win = $(window);
			var body = $('body');

			var state = L.ui._dialog || (L.ui._dialog = {
				dialog: $('<div />')
					.addClass('modal fade')
					.append($('<div />')
						.addClass('modal-dialog')
						.append($('<div />')
							.addClass('modal-content')
							.append($('<div />')
								.addClass('modal-header')
								.append('<h4 />')
									.addClass('modal-title'))
							.append($('<div />')
								.addClass('modal-body'))
							.append($('<div />')
								.addClass('modal-footer')
								.append(L.ui.button(L.tr('Close'), 'primary')
									.click(function() {
										$(this).parents('div.modal').modal('hide');
									})))))
					.appendTo(body)
			});

			if (typeof(options) != 'object')
				options = { };

			if (title === false)
			{
				state.dialog.modal('hide');

				return state.dialog;
			}

			var cnt = state.dialog.children().children().children('div.modal-body');
			var ftr = state.dialog.children().children().children('div.modal-footer');

			ftr.empty().show();

			if (options.style == 'confirm')
			{
				ftr.append(L.ui.button(L.tr('Ok'), 'primary')
					.click(options.confirm || function() { L.ui.dialog(false) }));

				ftr.append(L.ui.button(L.tr('Cancel'), 'default')
					.click(options.cancel || function() { L.ui.dialog(false) }));
			}
			else if (options.style == 'close')
			{
				ftr.append(L.ui.button(L.tr('Close'), 'primary')
					.click(options.close || function() { L.ui.dialog(false) }));
			}
			else if (options.style == 'wait')
			{
				ftr.append(L.ui.button(L.tr('Close'), 'primary')
					.attr('disabled', true));
			}

			if (options.wide)
			{
				state.dialog.addClass('wide');
			}
			else
			{
				state.dialog.removeClass('wide');
			}

			state.dialog.find('h4:first').text(title);
			state.dialog.modal('show');

			cnt.empty().append(content);

			return state.dialog;
		},

		upload: function(title, content, options)
		{
			var state = L.ui._upload || (L.ui._upload = {
				form: $('<form />')
					.attr('method', 'post')
					.attr('action', '/cgi-bin/luci-upload')
					.attr('enctype', 'multipart/form-data')
					.attr('target', 'cbi-fileupload-frame')
					.append($('<p />'))
					.append($('<input />')
						.attr('type', 'hidden')
						.attr('name', 'sessionid'))
					.append($('<input />')
						.attr('type', 'hidden')
						.attr('name', 'filename'))
					.append($('<input />')
						.attr('type', 'file')
						.attr('name', 'filedata')
						.addClass('cbi-input-file'))
					.append($('<div />')
						.css('width', '100%')
						.addClass('progress progress-striped active')
						.append($('<div />')
							.addClass('progress-bar')
							.css('width', '100%')))
					.append($('<iframe />')
						.addClass('pull-right')
						.attr('name', 'cbi-fileupload-frame')
						.css('width', '1px')
						.css('height', '1px')
						.css('visibility', 'hidden')),

				finish_cb: function(ev) {
					$(this).off('load');

					var body = (this.contentDocument || this.contentWindow.document).body;
					if (body.firstChild.tagName.toLowerCase() == 'pre')
						body = body.firstChild;

					var json;
					try {
						json = $.parseJSON(body.innerHTML);
					} catch(e) {
						json = {
							message: L.tr('Invalid server response received'),
							error: [ -1, L.tr('Invalid data') ]
						};
					};

					if (json.error)
					{
						L.ui.dialog(L.tr('File upload'), [
							$('<p />').text(L.tr('The file upload failed with the server response below:')),
							$('<pre />').addClass('alert-message').text(json.message || json.error[1]),
							$('<p />').text(L.tr('In case of network problems try uploading the file again.'))
						], { style: 'close' });
					}
					else if (typeof(state.success_cb) == 'function')
					{
						state.success_cb(json);
					}
				},

				confirm_cb: function() {
					var f = state.form.find('.cbi-input-file');
					var b = state.form.find('.progress');
					var p = state.form.find('p');

					if (!f.val())
						return;

					state.form.find('iframe').on('load', state.finish_cb);
					state.form.submit();

					f.hide();
					b.show();
					p.text(L.tr('File upload in progress …'));

					state.form.parent().parent().find('button').prop('disabled', true);
				}
			});

			state.form.find('.progress').hide();
			state.form.find('.cbi-input-file').val('').show();
			state.form.find('p').text(content || L.tr('Select the file to upload and press "%s" to proceed.').format(L.tr('Ok')));

			state.form.find('[name=sessionid]').val(L.globals.sid);
			state.form.find('[name=filename]').val(options.filename);

			state.success_cb = options.success;

			L.ui.dialog(title || L.tr('File upload'), state.form, {
				style: 'confirm',
				confirm: state.confirm_cb
			});
		},

		reconnect: function()
		{
			var protocols = (location.protocol == 'https:') ? [ 'http', 'https' ] : [ 'http' ];
			var ports     = (location.protocol == 'https:') ? [ 80, location.port || 443 ] : [ location.port || 80 ];
			var address   = location.hostname.match(/^[A-Fa-f0-9]*:[A-Fa-f0-9:]+$/) ? '[' + location.hostname + ']' : location.hostname;
			var images    = $();
			var interval, timeout;

			L.ui.dialog(
				L.tr('Waiting for device'), [
					$('<p />').text(L.tr('Please stand by while the device is reconfiguring …')),
					$('<div />')
						.css('width', '100%')
						.addClass('progressbar')
						.addClass('intermediate')
						.append($('<div />')
							.css('width', '100%'))
				], { style: 'wait' }
			);

			for (var i = 0; i < protocols.length; i++)
				images = images.add($('<img />').attr('url', protocols[i] + '://' + address + ':' + ports[i]));

			//L.network.getNetworkStatus(function(s) {
			//	for (var i = 0; i < protocols.length; i++)
			//	{
			//		for (var j = 0; j < s.length; j++)
			//		{
			//			for (var k = 0; k < s[j]['ipv4-address'].length; k++)
			//				images = images.add($('<img />').attr('url', protocols[i] + '://' + s[j]['ipv4-address'][k].address + ':' + ports[i]));
			//
			//			for (var l = 0; l < s[j]['ipv6-address'].length; l++)
			//				images = images.add($('<img />').attr('url', protocols[i] + '://[' + s[j]['ipv6-address'][l].address + ']:' + ports[i]));
			//		}
			//	}
			//}).then(function() {
				images.on('load', function() {
					var url = this.getAttribute('url');
					L.session.isAlive().then(function(access) {
						if (access)
						{
							window.clearTimeout(timeout);
							window.clearInterval(interval);
							L.ui.dialog(false);
							images = null;
						}
						else
						{
							location.href = url;
						}
					});
				});

				interval = window.setInterval(function() {
					images.each(function() {
						this.setAttribute('src', this.getAttribute('url') + L.globals.resource + '/icons/loading.gif?r=' + Math.random());
					});
				}, 5000);

				timeout = window.setTimeout(function() {
					window.clearInterval(interval);
					images.off('load');

					L.ui.dialog(
						L.tr('Device not responding'),
						L.tr('The device was not responding within 180 seconds, you might need to manually reconnect your computer or use SSH to regain access.'),
						{ style: 'close' }
					);
				}, 180000);
			//});
		},

		login: function(invalid)
		{
			var state = L.ui._login || (L.ui._login = {
				form: $('<form />')
					.attr('target', '')
					.attr('method', 'post')
					.append($('<p />')
						.addClass('alert-message')
						.text(L.tr('Wrong username or password given!')))
					.append($('<p />')
						.append($('<label />')
							.text(L.tr('Username'))
							.append($('<br />'))
							.append($('<input />')
								.attr('type', 'text')
								.attr('name', 'username')
								.attr('value', 'root')
								.addClass('form-control')
								.keypress(function(ev) {
									if (ev.which == 10 || ev.which == 13)
										state.confirm_cb();
								}))))
					.append($('<p />')
						.append($('<label />')
							.text(L.tr('Password'))
							.append($('<br />'))
							.append($('<input />')
								.attr('type', 'password')
								.attr('name', 'password')
								.addClass('form-control')
								.keypress(function(ev) {
									if (ev.which == 10 || ev.which == 13)
										state.confirm_cb();
								}))))
					.append($('<p />')
						.text(L.tr('Enter your username and password above, then click "%s" to proceed.').format(L.tr('Ok')))),

				response_cb: function(response) {
					if (!response.ubus_rpc_session)
					{
						L.ui.login(true);
					}
					else
					{
						L.globals.sid = response.ubus_rpc_session;
						L.setHash('id', L.globals.sid);
						L.session.startHeartbeat();
						L.ui.dialog(false);
						state.deferred.resolve();
					}
				},

				confirm_cb: function() {
					var u = state.form.find('[name=username]').val();
					var p = state.form.find('[name=password]').val();

					if (!u)
						return;

					L.ui.dialog(
						L.tr('Logging in'), [
							$('<p />').text(L.tr('Log in in progress …')),
							$('<div />')
								.css('width', '100%')
								.addClass('progressbar')
								.addClass('intermediate')
								.append($('<div />')
									.css('width', '100%'))
						], { style: 'wait' }
					);

					L.globals.sid = '00000000000000000000000000000000';
					L.session.login(u, p).then(state.response_cb);
				}
			});

			if (!state.deferred || state.deferred.state() != 'pending')
				state.deferred = $.Deferred();

			/* try to find sid from hash */
			var sid = L.getHash('id');
			if (sid && sid.match(/^[a-f0-9]{32}$/))
			{
				L.globals.sid = sid;
				L.session.isAlive().then(function(access) {
					if (access)
					{
						L.session.startHeartbeat();
						state.deferred.resolve();
					}
					else
					{
						L.setHash('id', undefined);
						L.ui.login();
					}
				});

				return state.deferred;
			}

			if (invalid)
				state.form.find('.alert-message').show();
			else
				state.form.find('.alert-message').hide();

			L.ui.dialog(L.tr('Authorization Required'), state.form, {
				style: 'confirm',
				confirm: state.confirm_cb
			});

			state.form.find('[name=password]').focus();

			return state.deferred;
		},

		cryptPassword: L.rpc.declare({
			object: 'luci2.ui',
			method: 'crypt',
			params: [ 'data' ],
			expect: { crypt: '' }
		}),


		mergeACLScope: function(acl_scope, scope)
		{
			if ($.isArray(scope))
			{
				for (var i = 0; i < scope.length; i++)
					acl_scope[scope[i]] = true;
			}
			else if ($.isPlainObject(scope))
			{
				for (var object_name in scope)
				{
					if (!$.isArray(scope[object_name]))
						continue;

					var acl_object = acl_scope[object_name] || (acl_scope[object_name] = { });

					for (var i = 0; i < scope[object_name].length; i++)
						acl_object[scope[object_name][i]] = true;
				}
			}
		},

		mergeACLPermission: function(acl_perm, perm)
		{
			if ($.isPlainObject(perm))
			{
				for (var scope_name in perm)
				{
					var acl_scope = acl_perm[scope_name] || (acl_perm[scope_name] = { });
					L.ui.mergeACLScope(acl_scope, perm[scope_name]);
				}
			}
		},

		mergeACLGroup: function(acl_group, group)
		{
			if ($.isPlainObject(group))
			{
				if (!acl_group.description)
					acl_group.description = group.description;

				if (group.read)
				{
					var acl_perm = acl_group.read || (acl_group.read = { });
					L.ui.mergeACLPermission(acl_perm, group.read);
				}

				if (group.write)
				{
					var acl_perm = acl_group.write || (acl_group.write = { });
					L.ui.mergeACLPermission(acl_perm, group.write);
				}
			}
		},

		callACLsCallback: function(trees)
		{
			var acl_tree = { };

			for (var i = 0; i < trees.length; i++)
			{
				if (!$.isPlainObject(trees[i]))
					continue;

				for (var group_name in trees[i])
				{
					var acl_group = acl_tree[group_name] || (acl_tree[group_name] = { });
					L.ui.mergeACLGroup(acl_group, trees[i][group_name]);
				}
			}

			return acl_tree;
		},

		callACLs: L.rpc.declare({
			object: 'luci2.ui',
			method: 'acls',
			expect: { acls: [ ] }
		}),

		getAvailableACLs: function()
		{
			return this.callACLs().then(this.callACLsCallback);
		},

		renderChangeIndicator: function()
		{
			return $('<ul />')
				.addClass('nav navbar-nav navbar-right')
				.append($('<li />')
					.append($('<a />')
						.attr('id', 'changes')
						.attr('href', '#')
						.append($('<span />')
							.addClass('label label-info'))));
		},

		callMenuCallback: function(entries)
		{
			L.globals.mainMenu = new L.ui.menu();
			L.globals.mainMenu.entries(entries);

			$('#mainmenu')
				.empty()
				.append(L.globals.mainMenu.render(0, 1))
				.append(L.ui.renderChangeIndicator());
		},

		callMenu: L.rpc.declare({
			object: 'luci2.ui',
			method: 'menu',
			expect: { menu: { } }
		}),

		renderMainMenu: function()
		{
			return this.callMenu().then(this.callMenuCallback);
		},

		renderViewMenu: function()
		{
			$('#viewmenu')
				.empty()
				.append(L.globals.mainMenu.render(2, 900));
		},

		renderView: function()
		{
			var node  = arguments[0];
			var name  = node.view.split(/\//).join('.');
			var cname = L.toClassName(name);
			var views = L.views || (L.views = { });
			var args  = [ ];

			for (var i = 1; i < arguments.length; i++)
				args.push(arguments[i]);

			if (L.globals.currentView)
				L.globals.currentView.finish();

			L.ui.renderViewMenu();
			L.setHash('view', node.view);

			if (views[cname] instanceof L.ui.view)
			{
				L.globals.currentView = views[cname];
				return views[cname].render.apply(views[cname], args);
			}

			var url = L.globals.resource + '/view/' + name + '.js';

			return $.ajax(url, {
				method: 'GET',
				cache: true,
				dataType: 'text'
			}).then(function(data) {
				try {
					var viewConstructorSource = (
						'(function(L, $) { ' +
							'return %s' +
						'})(L, $);\n\n' +
						'//@ sourceURL=%s'
					).format(data, url);

					var viewConstructor = eval(viewConstructorSource);

					views[cname] = new viewConstructor({
						name: name,
						acls: node.write || { }
					});

					L.globals.currentView = views[cname];
					return views[cname].render.apply(views[cname], args);
				}
				catch(e) {
					alert('Unable to instantiate view "%s": %s'.format(url, e));
				};

				return $.Deferred().resolve();
			});
		},

		changeView: function()
		{
			var name = L.getHash('view');
			var node = L.globals.defaultNode;

			if (name && L.globals.mainMenu)
				node = L.globals.mainMenu.getNode(name);

			if (node)
			{
				L.ui.loading(true);
				L.ui.renderView(node).then(function() {
					L.ui.loading(false);
				});
			}
		},

		updateHostname: function()
		{
			return L.system.getBoardInfo().then(function(info) {
				if (info.hostname)
					$('#hostname').text(info.hostname);
			});
		},

		updateChanges: function()
		{
			return L.uci.changes().then(function(changes) {
				var n = 0;
				var html = '';

				for (var config in changes)
				{
					var log = [ ];

					for (var i = 0; i < changes[config].length; i++)
					{
						var c = changes[config][i];

						switch (c[0])
						{
						case 'order':
							log.push('uci reorder %s.<ins>%s=<strong>%s</strong></ins>'.format(config, c[1], c[2]));
							break;

						case 'remove':
							if (c.length < 3)
								log.push('uci delete %s.<del>%s</del>'.format(config, c[1]));
							else
								log.push('uci delete %s.%s.<del>%s</del>'.format(config, c[1], c[2]));
							break;

						case 'rename':
							if (c.length < 4)
								log.push('uci rename %s.<ins>%s=<strong>%s</strong></ins>'.format(config, c[1], c[2], c[3]));
							else
								log.push('uci rename %s.%s.<ins>%s=<strong>%s</strong></ins>'.format(config, c[1], c[2], c[3], c[4]));
							break;

						case 'add':
							log.push('uci add %s <ins>%s</ins> (= <ins><strong>%s</strong></ins>)'.format(config, c[2], c[1]));
							break;

						case 'list-add':
							log.push('uci add_list %s.%s.<ins>%s=<strong>%s</strong></ins>'.format(config, c[1], c[2], c[3], c[4]));
							break;

						case 'list-del':
							log.push('uci del_list %s.%s.<del>%s=<strong>%s</strong></del>'.format(config, c[1], c[2], c[3], c[4]));
							break;

						case 'set':
							if (c.length < 4)
								log.push('uci set %s.<ins>%s=<strong>%s</strong></ins>'.format(config, c[1], c[2]));
							else
								log.push('uci set %s.%s.<ins>%s=<strong>%s</strong></ins>'.format(config, c[1], c[2], c[3], c[4]));
							break;
						}
					}

					html += '<code>/etc/config/%s</code><pre class="uci-changes">%s</pre>'.format(config, log.join('\n'));
					n += changes[config].length;
				}

				if (n > 0)
					$('#changes')
						.click(function(ev) {
							L.ui.dialog(L.tr('Staged configuration changes'), html, {
								style: 'confirm',
								confirm: function() {
									L.uci.apply().then(
										function(code) { alert('Success with code ' + code); },
										function(code) { alert('Error with code ' + code); }
									);
								}
							});
							ev.preventDefault();
						})
						.children('span')
							.show()
							.text(L.trcp('Pending configuration changes', '1 change', '%d changes', n).format(n));
				else
					$('#changes').children('span').hide();
			});
		},

		init: function()
		{
			L.ui.loading(true);

			$.when(
				L.session.updateACLs(),
				L.ui.updateHostname(),
				L.ui.updateChanges(),
				L.ui.renderMainMenu(),
				L.NetworkModel.init()
			).then(function() {
				L.ui.renderView(L.globals.defaultNode).then(function() {
					L.ui.loading(false);
				});

				$(window).on('hashchange', function() {
					L.ui.changeView();
				});
			});
		},

		button: function(label, style, title)
		{
			style = style || 'default';

			return $('<button />')
				.attr('type', 'button')
				.attr('title', title ? title : '')
				.addClass('btn btn-' + style)
				.text(label);
		}
	};

	this.ui.AbstractWidget = Class.extend({
		i18n: function(text) {
			return text;
		},

		label: function() {
			var key = arguments[0];
			var args = [ ];

			for (var i = 1; i < arguments.length; i++)
				args.push(arguments[i]);

			switch (typeof(this.options[key]))
			{
			case 'undefined':
				return '';

			case 'function':
				return this.options[key].apply(this, args);

			default:
				return ''.format.apply('' + this.options[key], args);
			}
		},

		toString: function() {
			return $('<div />').append(this.render()).html();
		},

		insertInto: function(id) {
			return $(id).empty().append(this.render());
		},

		appendTo: function(id) {
			return $(id).append(this.render());
		},

		on: function(evname, evfunc)
		{
			var evnames = L.toArray(evname);

			if (!this.events)
				this.events = { };

			for (var i = 0; i < evnames.length; i++)
				this.events[evnames[i]] = evfunc;

			return this;
		},

		trigger: function(evname, evdata)
		{
			if (this.events)
			{
				var evnames = L.toArray(evname);

				for (var i = 0; i < evnames.length; i++)
					if (this.events[evnames[i]])
						this.events[evnames[i]].call(this, evdata);
			}

			return this;
		}
	});

	this.ui.view = this.ui.AbstractWidget.extend({
		_fetch_template: function()
		{
			return $.ajax(L.globals.resource + '/template/' + this.options.name + '.htm', {
				method: 'GET',
				cache: true,
				dataType: 'text',
				success: function(data) {
					data = data.replace(/<%([#:=])?(.+?)%>/g, function(match, p1, p2) {
						p2 = p2.replace(/^\s+/, '').replace(/\s+$/, '');
						switch (p1)
						{
						case '#':
							return '';

						case ':':
							return L.tr(p2);

						case '=':
							return L.globals[p2] || '';

						default:
							return '(?' + match + ')';
						}
					});

					$('#maincontent').append(data);
				}
			});
		},

		execute: function()
		{
			throw "Not implemented";
		},

		render: function()
		{
			var container = $('#maincontent');

			container.empty();

			if (this.title)
				container.append($('<h2 />').append(this.title));

			if (this.description)
				container.append($('<p />').append(this.description));

			var self = this;
			var args = [ ];

			for (var i = 0; i < arguments.length; i++)
				args.push(arguments[i]);

			return this._fetch_template().then(function() {
				return L.deferrable(self.execute.apply(self, args));
			});
		},

		repeat: function(func, interval)
		{
			var self = this;

			if (!self._timeouts)
				self._timeouts = [ ];

			var index = self._timeouts.length;

			if (typeof(interval) != 'number')
				interval = 5000;

			var setTimer, runTimer;

			setTimer = function() {
				if (self._timeouts)
					self._timeouts[index] = window.setTimeout(runTimer, interval);
			};

			runTimer = function() {
				L.deferrable(func.call(self)).then(setTimer, setTimer);
			};

			runTimer();
		},

		finish: function()
		{
			if ($.isArray(this._timeouts))
			{
				for (var i = 0; i < this._timeouts.length; i++)
					window.clearTimeout(this._timeouts[i]);

				delete this._timeouts;
			}
		}
	});

	this.ui.menu = this.ui.AbstractWidget.extend({
		init: function() {
			this._nodes = { };
		},

		entries: function(entries)
		{
			for (var entry in entries)
			{
				var path = entry.split(/\//);
				var node = this._nodes;

				for (i = 0; i < path.length; i++)
				{
					if (!node.childs)
						node.childs = { };

					if (!node.childs[path[i]])
						node.childs[path[i]] = { };

					node = node.childs[path[i]];
				}

				$.extend(node, entries[entry]);
			}
		},

		sortNodesCallback: function(a, b)
		{
			var x = a.index || 0;
			var y = b.index || 0;
			return (x - y);
		},

		firstChildView: function(node)
		{
			if (node.view)
				return node;

			var nodes = [ ];
			for (var child in (node.childs || { }))
				nodes.push(node.childs[child]);

			nodes.sort(this.sortNodesCallback);

			for (var i = 0; i < nodes.length; i++)
			{
				var child = this.firstChildView(nodes[i]);
				if (child)
				{
					for (var key in child)
						if (!node.hasOwnProperty(key) && child.hasOwnProperty(key))
							node[key] = child[key];

					return node;
				}
			}

			return undefined;
		},

		handleClick: function(ev)
		{
			L.setHash('view', ev.data);

			ev.preventDefault();
			this.blur();
		},

		renderNodes: function(childs, level, min, max)
		{
			var nodes = [ ];
			for (var node in childs)
			{
				var child = this.firstChildView(childs[node]);
				if (child)
					nodes.push(childs[node]);
			}

			nodes.sort(this.sortNodesCallback);

			var list = $('<ul />');

			if (level == 0)
				list.addClass('nav').addClass('navbar-nav');
			else if (level == 1)
				list.addClass('dropdown-menu').addClass('navbar-inverse');

			for (var i = 0; i < nodes.length; i++)
			{
				if (!L.globals.defaultNode)
				{
					var v = L.getHash('view');
					if (!v || v == nodes[i].view)
						L.globals.defaultNode = nodes[i];
				}

				var item = $('<li />')
					.append($('<a />')
						.attr('href', '#')
						.text(L.tr(nodes[i].title)))
					.appendTo(list);

				if (nodes[i].childs && level < max)
				{
					item.addClass('dropdown');

					item.find('a')
						.addClass('dropdown-toggle')
						.attr('data-toggle', 'dropdown')
						.append('<b class="caret"></b>');

					item.append(this.renderNodes(nodes[i].childs, level + 1));
				}
				else
				{
					item.find('a').click(nodes[i].view, this.handleClick);
				}
			}

			return list.get(0);
		},

		render: function(min, max)
		{
			var top = min ? this.getNode(L.globals.defaultNode.view, min) : this._nodes;
			return this.renderNodes(top.childs, 0, min, max);
		},

		getNode: function(path, max)
		{
			var p = path.split(/\//);
			var n = this._nodes;

			if (typeof(max) == 'undefined')
				max = p.length;

			for (var i = 0; i < max; i++)
			{
				if (!n.childs[p[i]])
					return undefined;

				n = n.childs[p[i]];
			}

			return n;
		}
	});

	this.ui.table = this.ui.AbstractWidget.extend({
		init: function()
		{
			this._rows = [ ];
		},

		row: function(values)
		{
			if ($.isArray(values))
			{
				this._rows.push(values);
			}
			else if ($.isPlainObject(values))
			{
				var v = [ ];
				for (var i = 0; i < this.options.columns.length; i++)
				{
					var col = this.options.columns[i];

					if (typeof col.key == 'string')
						v.push(values[col.key]);
					else
						v.push(null);
				}
				this._rows.push(v);
			}
		},

		rows: function(rows)
		{
			for (var i = 0; i < rows.length; i++)
				this.row(rows[i]);
		},

		render: function(id)
		{
			var fieldset = document.createElement('fieldset');
				fieldset.className = 'cbi-section';

			if (this.options.caption)
			{
				var legend = document.createElement('legend');
				$(legend).append(this.options.caption);
				fieldset.appendChild(legend);
			}

			var table = document.createElement('table');
				table.className = 'table table-condensed table-hover';

			var has_caption = false;
			var has_description = false;

			for (var i = 0; i < this.options.columns.length; i++)
				if (this.options.columns[i].caption)
				{
					has_caption = true;
					break;
				}
				else if (this.options.columns[i].description)
				{
					has_description = true;
					break;
				}

			if (has_caption)
			{
				var tr = table.insertRow(-1);
					tr.className = 'cbi-section-table-titles';

				for (var i = 0; i < this.options.columns.length; i++)
				{
					var col = this.options.columns[i];
					var th = document.createElement('th');
						th.className = 'cbi-section-table-cell';

					tr.appendChild(th);

					if (col.width)
						th.style.width = col.width;

					if (col.align)
						th.style.textAlign = col.align;

					if (col.caption)
						$(th).append(col.caption);
				}
			}

			if (has_description)
			{
				var tr = table.insertRow(-1);
					tr.className = 'cbi-section-table-descr';

				for (var i = 0; i < this.options.columns.length; i++)
				{
					var col = this.options.columns[i];
					var th = document.createElement('th');
						th.className = 'cbi-section-table-cell';

					tr.appendChild(th);

					if (col.width)
						th.style.width = col.width;

					if (col.align)
						th.style.textAlign = col.align;

					if (col.description)
						$(th).append(col.description);
				}
			}

			if (this._rows.length == 0)
			{
				if (this.options.placeholder)
				{
					var tr = table.insertRow(-1);
					var td = tr.insertCell(-1);
						td.className = 'cbi-section-table-cell';

					td.colSpan = this.options.columns.length;
					$(td).append(this.options.placeholder);
				}
			}
			else
			{
				for (var i = 0; i < this._rows.length; i++)
				{
					var tr = table.insertRow(-1);

					for (var j = 0; j < this.options.columns.length; j++)
					{
						var col = this.options.columns[j];
						var td = tr.insertCell(-1);

						var val = this._rows[i][j];

						if (typeof(val) == 'undefined')
							val = col.placeholder;

						if (typeof(val) == 'undefined')
							val = '';

						if (col.width)
							td.style.width = col.width;

						if (col.align)
							td.style.textAlign = col.align;

						if (typeof col.format == 'string')
							$(td).append(col.format.format(val));
						else if (typeof col.format == 'function')
							$(td).append(col.format(val, i));
						else
							$(td).append(val);
					}
				}
			}

			this._rows = [ ];
			fieldset.appendChild(table);

			return fieldset;
		}
	});

	this.ui.progress = this.ui.AbstractWidget.extend({
		render: function()
		{
			var vn = parseInt(this.options.value) || 0;
			var mn = parseInt(this.options.max) || 100;
			var pc = Math.floor((100 / mn) * vn);

			var text;

			if (typeof(this.options.format) == 'string')
				text = this.options.format.format(this.options.value, this.options.max, pc);
			else if (typeof(this.options.format) == 'function')
				text = this.options.format(pc);
			else
				text = '%.2f%%'.format(pc);

			return $('<div />')
				.addClass('progress')
				.append($('<div />')
					.addClass('progress-bar')
					.addClass('progress-bar-info')
					.css('width', pc + '%'))
				.append($('<small />')
					.text(text));
		}
	});

	this.ui.devicebadge = this.ui.AbstractWidget.extend({
		render: function()
		{
			var l2dev = this.options.l2_device || this.options.device;
			var l3dev = this.options.l3_device;
			var dev = l3dev || l2dev || '?';

			var span = document.createElement('span');
				span.className = 'badge';

			if (typeof(this.options.signal) == 'number' ||
				typeof(this.options.noise) == 'number')
			{
				var r = 'none';
				if (typeof(this.options.signal) != 'undefined' &&
					typeof(this.options.noise) != 'undefined')
				{
					var q = (-1 * (this.options.noise - this.options.signal)) / 5;
					if (q < 1)
						r = '0';
					else if (q < 2)
						r = '0-25';
					else if (q < 3)
						r = '25-50';
					else if (q < 4)
						r = '50-75';
					else
						r = '75-100';
				}

				span.appendChild(document.createElement('img'));
				span.lastChild.src = L.globals.resource + '/icons/signal-' + r + '.png';

				if (r == 'none')
					span.title = L.tr('No signal');
				else
					span.title = '%s: %d %s / %s: %d %s'.format(
						L.tr('Signal'), this.options.signal, L.tr('dBm'),
						L.tr('Noise'), this.options.noise, L.tr('dBm')
					);
			}
			else
			{
				var type = 'ethernet';
				var desc = L.tr('Ethernet device');

				if (l3dev != l2dev)
				{
					type = 'tunnel';
					desc = L.tr('Tunnel interface');
				}
				else if (dev.indexOf('br-') == 0)
				{
					type = 'bridge';
					desc = L.tr('Bridge');
				}
				else if (dev.indexOf('.') > 0)
				{
					type = 'vlan';
					desc = L.tr('VLAN interface');
				}
				else if (dev.indexOf('wlan') == 0 ||
						 dev.indexOf('ath') == 0 ||
						 dev.indexOf('wl') == 0)
				{
					type = 'wifi';
					desc = L.tr('Wireless Network');
				}

				span.appendChild(document.createElement('img'));
				span.lastChild.src = L.globals.resource + '/icons/' + type + (this.options.up ? '' : '_disabled') + '.png';
				span.title = desc;
			}

			$(span).append(' ');
			$(span).append(dev);

			return span;
		}
	});

	var type = function(f, l)
	{
		f.message = l;
		return f;
	};

	this.cbi = {
		validation: {
			i18n: function(msg)
			{
				L.cbi.validation.message = L.tr(msg);
			},

			compile: function(code)
			{
				var pos = 0;
				var esc = false;
				var depth = 0;
				var types = L.cbi.validation.types;
				var stack = [ ];

				code += ',';

				for (var i = 0; i < code.length; i++)
				{
					if (esc)
					{
						esc = false;
						continue;
					}

					switch (code.charCodeAt(i))
					{
					case 92:
						esc = true;
						break;

					case 40:
					case 44:
						if (depth <= 0)
						{
							if (pos < i)
							{
								var label = code.substring(pos, i);
									label = label.replace(/\\(.)/g, '$1');
									label = label.replace(/^[ \t]+/g, '');
									label = label.replace(/[ \t]+$/g, '');

								if (label && !isNaN(label))
								{
									stack.push(parseFloat(label));
								}
								else if (label.match(/^(['"]).*\1$/))
								{
									stack.push(label.replace(/^(['"])(.*)\1$/, '$2'));
								}
								else if (typeof types[label] == 'function')
								{
									stack.push(types[label]);
									stack.push([ ]);
								}
								else
								{
									throw "Syntax error, unhandled token '"+label+"'";
								}
							}
							pos = i+1;
						}
						depth += (code.charCodeAt(i) == 40);
						break;

					case 41:
						if (--depth <= 0)
						{
							if (typeof stack[stack.length-2] != 'function')
								throw "Syntax error, argument list follows non-function";

							stack[stack.length-1] =
								L.cbi.validation.compile(code.substring(pos, i));

							pos = i+1;
						}
						break;
					}
				}

				return stack;
			}
		}
	};

	var validation = this.cbi.validation;

	validation.types = {
		'integer': function()
		{
			if (this.match(/^-?[0-9]+$/) != null)
				return true;

			validation.i18n('Must be a valid integer');
			return false;
		},

		'uinteger': function()
		{
			if (validation.types['integer'].apply(this) && (this >= 0))
				return true;

			validation.i18n('Must be a positive integer');
			return false;
		},

		'float': function()
		{
			if (!isNaN(parseFloat(this)))
				return true;

			validation.i18n('Must be a valid number');
			return false;
		},

		'ufloat': function()
		{
			if (validation.types['float'].apply(this) && (this >= 0))
				return true;

			validation.i18n('Must be a positive number');
			return false;
		},

		'ipaddr': function()
		{
			if (L.parseIPv4(this) || L.parseIPv6(this))
				return true;

			validation.i18n('Must be a valid IP address');
			return false;
		},

		'ip4addr': function()
		{
			if (L.parseIPv4(this))
				return true;

			validation.i18n('Must be a valid IPv4 address');
			return false;
		},

		'ip6addr': function()
		{
			if (L.parseIPv6(this))
				return true;

			validation.i18n('Must be a valid IPv6 address');
			return false;
		},

		'netmask4': function()
		{
			if (L.isNetmask(L.parseIPv4(this)))
				return true;

			validation.i18n('Must be a valid IPv4 netmask');
			return false;
		},

		'netmask6': function()
		{
			if (L.isNetmask(L.parseIPv6(this)))
				return true;

			validation.i18n('Must be a valid IPv6 netmask6');
			return false;
		},

		'cidr4': function()
		{
			if (this.match(/^([0-9.]+)\/(\d{1,2})$/))
				if (RegExp.$2 <= 32 && L.parseIPv4(RegExp.$1))
					return true;

			validation.i18n('Must be a valid IPv4 prefix');
			return false;
		},

		'cidr6': function()
		{
			if (this.match(/^([a-fA-F0-9:.]+)\/(\d{1,3})$/))
				if (RegExp.$2 <= 128 && L.parseIPv6(RegExp.$1))
					return true;

			validation.i18n('Must be a valid IPv6 prefix');
			return false;
		},

		'ipmask4': function()
		{
			if (this.match(/^([0-9.]+)\/([0-9.]+)$/))
			{
				var addr = RegExp.$1, mask = RegExp.$2;
				if (L.parseIPv4(addr) && L.isNetmask(L.parseIPv4(mask)))
					return true;
			}

			validation.i18n('Must be a valid IPv4 address/netmask pair');
			return false;
		},

		'ipmask6': function()
		{
			if (this.match(/^([a-fA-F0-9:.]+)\/([a-fA-F0-9:.]+)$/))
			{
				var addr = RegExp.$1, mask = RegExp.$2;
				if (L.parseIPv6(addr) && L.isNetmask(L.parseIPv6(mask)))
					return true;
			}

			validation.i18n('Must be a valid IPv6 address/netmask pair');
			return false;
		},

		'port': function()
		{
			if (validation.types['integer'].apply(this) &&
				(this >= 0) && (this <= 65535))
				return true;

			validation.i18n('Must be a valid port number');
			return false;
		},

		'portrange': function()
		{
			if (this.match(/^(\d+)-(\d+)$/))
			{
				var p1 = RegExp.$1;
				var p2 = RegExp.$2;

				if (validation.types['port'].apply(p1) &&
				    validation.types['port'].apply(p2) &&
				    (parseInt(p1) <= parseInt(p2)))
					return true;
			}
			else if (validation.types['port'].apply(this))
			{
				return true;
			}

			validation.i18n('Must be a valid port range');
			return false;
		},

		'macaddr': function()
		{
			if (this.match(/^([a-fA-F0-9]{2}:){5}[a-fA-F0-9]{2}$/) != null)
				return true;

			validation.i18n('Must be a valid MAC address');
			return false;
		},

		'host': function()
		{
			if (validation.types['hostname'].apply(this) ||
			    validation.types['ipaddr'].apply(this))
				return true;

			validation.i18n('Must be a valid hostname or IP address');
			return false;
		},

		'hostname': function()
		{
			if ((this.length <= 253) &&
			    ((this.match(/^[a-zA-Z0-9]+$/) != null ||
			     (this.match(/^[a-zA-Z0-9_][a-zA-Z0-9_\-.]*[a-zA-Z0-9]$/) &&
			      this.match(/[^0-9.]/)))))
				return true;

			validation.i18n('Must be a valid host name');
			return false;
		},

		'network': function()
		{
			if (validation.types['uciname'].apply(this) ||
			    validation.types['host'].apply(this))
				return true;

			validation.i18n('Must be a valid network name');
			return false;
		},

		'wpakey': function()
		{
			var v = this;

			if ((v.length == 64)
			      ? (v.match(/^[a-fA-F0-9]{64}$/) != null)
				  : ((v.length >= 8) && (v.length <= 63)))
				return true;

			validation.i18n('Must be a valid WPA key');
			return false;
		},

		'wepkey': function()
		{
			var v = this;

			if (v.substr(0,2) == 's:')
				v = v.substr(2);

			if (((v.length == 10) || (v.length == 26))
			      ? (v.match(/^[a-fA-F0-9]{10,26}$/) != null)
			      : ((v.length == 5) || (v.length == 13)))
				return true;

			validation.i18n('Must be a valid WEP key');
			return false;
		},

		'uciname': function()
		{
			if (this.match(/^[a-zA-Z0-9_]+$/) != null)
				return true;

			validation.i18n('Must be a valid UCI identifier');
			return false;
		},

		'range': function(min, max)
		{
			var val = parseFloat(this);

			if (validation.types['integer'].apply(this) &&
			    !isNaN(min) && !isNaN(max) && ((val >= min) && (val <= max)))
				return true;

			validation.i18n('Must be a number between %d and %d');
			return false;
		},

		'min': function(min)
		{
			var val = parseFloat(this);

			if (validation.types['integer'].apply(this) &&
			    !isNaN(min) && !isNaN(val) && (val >= min))
				return true;

			validation.i18n('Must be a number greater or equal to %d');
			return false;
		},

		'max': function(max)
		{
			var val = parseFloat(this);

			if (validation.types['integer'].apply(this) &&
			    !isNaN(max) && !isNaN(val) && (val <= max))
				return true;

			validation.i18n('Must be a number lower or equal to %d');
			return false;
		},

		'rangelength': function(min, max)
		{
			var val = '' + this;

			if (!isNaN(min) && !isNaN(max) &&
			    (val.length >= min) && (val.length <= max))
				return true;

			validation.i18n('Must be between %d and %d characters');
			return false;
		},

		'minlength': function(min)
		{
			var val = '' + this;

			if (!isNaN(min) && (val.length >= min))
				return true;

			validation.i18n('Must be at least %d characters');
			return false;
		},

		'maxlength': function(max)
		{
			var val = '' + this;

			if (!isNaN(max) && (val.length <= max))
				return true;

			validation.i18n('Must be at most %d characters');
			return false;
		},

		'or': function()
		{
			var msgs = [ ];

			for (var i = 0; i < arguments.length; i += 2)
			{
				delete validation.message;

				if (typeof(arguments[i]) != 'function')
				{
					if (arguments[i] == this)
						return true;
					i--;
				}
				else if (arguments[i].apply(this, arguments[i+1]))
				{
					return true;
				}

				if (validation.message)
					msgs.push(validation.message.format.apply(validation.message, arguments[i+1]));
			}

			validation.message = msgs.join( L.tr(' - or - '));
			return false;
		},

		'and': function()
		{
			var msgs = [ ];

			for (var i = 0; i < arguments.length; i += 2)
			{
				delete validation.message;

				if (typeof arguments[i] != 'function')
				{
					if (arguments[i] != this)
						return false;
					i--;
				}
				else if (!arguments[i].apply(this, arguments[i+1]))
				{
					return false;
				}

				if (validation.message)
					msgs.push(validation.message.format.apply(validation.message, arguments[i+1]));
			}

			validation.message = msgs.join(', ');
			return true;
		},

		'neg': function()
		{
			return validation.types['or'].apply(
				this.replace(/^[ \t]*![ \t]*/, ''), arguments);
		},

		'list': function(subvalidator, subargs)
		{
			if (typeof subvalidator != 'function')
				return false;

			var tokens = this.match(/[^ \t]+/g);
			for (var i = 0; i < tokens.length; i++)
				if (!subvalidator.apply(tokens[i], subargs))
					return false;

			return true;
		},

		'phonedigit': function()
		{
			if (this.match(/^[0-9\*#!\.]+$/) != null)
				return true;

			validation.i18n('Must be a valid phone number digit');
			return false;
		},

		'string': function()
		{
			return true;
		}
	};


	this.cbi.AbstractValue = this.ui.AbstractWidget.extend({
		init: function(name, options)
		{
			this.name = name;
			this.instance = { };
			this.dependencies = [ ];
			this.rdependency = { };

			this.options = L.defaults(options, {
				placeholder: '',
				datatype: 'string',
				optional: false,
				keep: true
			});
		},

		id: function(sid)
		{
			return this.ownerSection.id('field', sid || '__unknown__', this.name);
		},

		render: function(sid, condensed)
		{
			var i = this.instance[sid] = { };

			i.top = $('<div />')
				.addClass('luci2-field');

			if (!condensed)
			{
				i.top.addClass('form-group');

				if (typeof(this.options.caption) == 'string')
					$('<label />')
						.addClass('col-lg-2 control-label')
						.attr('for', this.id(sid))
						.text(this.options.caption)
						.appendTo(i.top);
			}

			i.error = $('<div />')
				.hide()
				.addClass('luci2-field-error label label-danger');

			i.widget = $('<div />')
				.addClass('luci2-field-widget')
				.append(this.widget(sid))
				.append(i.error)
				.appendTo(i.top);

			if (!condensed)
			{
				i.widget.addClass('col-lg-5');

				$('<div />')
					.addClass('col-lg-5')
					.text((typeof(this.options.description) == 'string') ? this.options.description : '')
					.appendTo(i.top);
			}

			return i.top;
		},

		active: function(sid)
		{
			return (this.instance[sid] && !this.instance[sid].disabled);
		},

		ucipath: function(sid)
		{
			return {
				config:  (this.options.uci_package || this.ownerMap.uci_package),
				section: (this.options.uci_section || sid),
				option:  (this.options.uci_option  || this.name)
			};
		},

		ucivalue: function(sid)
		{
			var uci = this.ucipath(sid);
			var val = this.ownerMap.get(uci.config, uci.section, uci.option);

			if (typeof(val) == 'undefined')
				return this.options.initial;

			return val;
		},

		formvalue: function(sid)
		{
			var v = $('#' + this.id(sid)).val();
			return (v === '') ? undefined : v;
		},

		textvalue: function(sid)
		{
			var v = this.formvalue(sid);

			if (typeof(v) == 'undefined' || ($.isArray(v) && !v.length))
				v = this.ucivalue(sid);

			if (typeof(v) == 'undefined' || ($.isArray(v) && !v.length))
				v = this.options.placeholder;

			if (typeof(v) == 'undefined' || v === '')
				return undefined;

			if (typeof(v) == 'string' && $.isArray(this.choices))
			{
				for (var i = 0; i < this.choices.length; i++)
					if (v === this.choices[i][0])
						return this.choices[i][1];
			}
			else if (v === true)
				return L.tr('yes');
			else if (v === false)
				return L.tr('no');
			else if ($.isArray(v))
				return v.join(', ');

			return v;
		},

		changed: function(sid)
		{
			var a = this.ucivalue(sid);
			var b = this.formvalue(sid);

			if (typeof(a) != typeof(b))
				return true;

			if ($.isArray(a))
			{
				if (a.length != b.length)
					return true;

				for (var i = 0; i < a.length; i++)
					if (a[i] != b[i])
						return true;

				return false;
			}
			else if ($.isPlainObject(a))
			{
				for (var k in a)
					if (!(k in b))
						return true;

				for (var k in b)
					if (!(k in a) || a[k] !== b[k])
						return true;

				return false;
			}

			return (a != b);
		},

		save: function(sid)
		{
			var uci = this.ucipath(sid);

			if (this.instance[sid].disabled)
			{
				if (!this.options.keep)
					return this.ownerMap.set(uci.config, uci.section, uci.option, undefined);

				return false;
			}

			var chg = this.changed(sid);
			var val = this.formvalue(sid);

			if (chg)
				this.ownerMap.set(uci.config, uci.section, uci.option, val);

			return chg;
		},

		findSectionID: function($elem)
		{
			return this.ownerSection.findParentSectionIDs($elem)[0];
		},

		setError: function($elem, msg, msgargs)
		{
			var $field = $elem.parents('.luci2-field:first');
			var $error = $field.find('.luci2-field-error:first');

			if (typeof(msg) == 'string' && msg.length > 0)
			{
				$field.addClass('luci2-form-error');
				$elem.parent().addClass('has-error');

				$error.text(msg.format.apply(msg, msgargs)).show();
				$field.trigger('validate');

				return false;
			}
			else
			{
				$elem.parent().removeClass('has-error');

				var $other_errors = $field.find('.has-error');
				if ($other_errors.length == 0)
				{
					$field.removeClass('luci2-form-error');
					$error.text('').hide();
					$field.trigger('validate');

					return true;
				}

				return false;
			}
		},

		handleValidate: function(ev)
		{
			var $elem = $(this);

			var d = ev.data;
			var rv = true;
			var val = $elem.val();
			var vstack = d.vstack;

			if (vstack && typeof(vstack[0]) == 'function')
			{
				delete validation.message;

				if ((val.length == 0 && !d.opt))
				{
					rv = d.self.setError($elem, L.tr('Field must not be empty'));
				}
				else if (val.length > 0 && !vstack[0].apply(val, vstack[1]))
				{
					rv = d.self.setError($elem, validation.message, vstack[1]);
				}
				else
				{
					rv = d.self.setError($elem);
				}
			}

			if (rv)
			{
				var sid = d.self.findSectionID($elem);

				for (var field in d.self.rdependency)
				{
					d.self.rdependency[field].toggle(sid);
					d.self.rdependency[field].validate(sid);
				}

				d.self.ownerSection.tabtoggle(sid);
			}

			return rv;
		},

		attachEvents: function(sid, elem)
		{
			var evdata = {
				self:   this,
				opt:    this.options.optional
			};

			if (this.events)
				for (var evname in this.events)
					elem.on(evname, evdata, this.events[evname]);

			if (typeof(this.options.datatype) == 'undefined' && $.isEmptyObject(this.rdependency))
				return elem;

			var vstack;
			if (typeof(this.options.datatype) == 'string')
			{
				try {
					evdata.vstack = L.cbi.validation.compile(this.options.datatype);
				} catch(e) { };
			}
			else if (typeof(this.options.datatype) == 'function')
			{
				var vfunc = this.options.datatype;
				evdata.vstack = [ function(elem) {
					var rv = vfunc(this, elem);
					if (rv !== true)
						validation.message = rv;
					return (rv === true);
				}, [ elem ] ];
			}

			if (elem.prop('tagName') == 'SELECT')
			{
				elem.change(evdata, this.handleValidate);
			}
			else if (elem.prop('tagName') == 'INPUT' && elem.attr('type') == 'checkbox')
			{
				elem.click(evdata, this.handleValidate);
				elem.blur(evdata, this.handleValidate);
			}
			else
			{
				elem.keyup(evdata, this.handleValidate);
				elem.blur(evdata, this.handleValidate);
			}

			elem.addClass('luci2-field-validate')
				.on('validate', evdata, this.handleValidate);

			return elem;
		},

		validate: function(sid)
		{
			var i = this.instance[sid];

			i.widget.find('.luci2-field-validate').trigger('validate');

			return (i.disabled || i.error.text() == '');
		},

		depends: function(d, v, add)
		{
			var dep;

			if ($.isArray(d))
			{
				dep = { };
				for (var i = 0; i < d.length; i++)
				{
					if (typeof(d[i]) == 'string')
						dep[d[i]] = true;
					else if (d[i] instanceof L.cbi.AbstractValue)
						dep[d[i].name] = true;
				}
			}
			else if (d instanceof L.cbi.AbstractValue)
			{
				dep = { };
				dep[d.name] = (typeof(v) == 'undefined') ? true : v;
			}
			else if (typeof(d) == 'object')
			{
				dep = d;
			}
			else if (typeof(d) == 'string')
			{
				dep = { };
				dep[d] = (typeof(v) == 'undefined') ? true : v;
			}

			if (!dep || $.isEmptyObject(dep))
				return this;

			for (var field in dep)
			{
				var f = this.ownerSection.fields[field];
				if (f)
					f.rdependency[this.name] = this;
				else
					delete dep[field];
			}

			if ($.isEmptyObject(dep))
				return this;

			if (!add || !this.dependencies.length)
				this.dependencies.push(dep);
			else
				for (var i = 0; i < this.dependencies.length; i++)
					$.extend(this.dependencies[i], dep);

			return this;
		},

		toggle: function(sid)
		{
			var d = this.dependencies;
			var i = this.instance[sid];

			if (!d.length)
				return true;

			for (var n = 0; n < d.length; n++)
			{
				var rv = true;

				for (var field in d[n])
				{
					var val = this.ownerSection.fields[field].formvalue(sid);
					var cmp = d[n][field];

					if (typeof(cmp) == 'boolean')
					{
						if (cmp == (typeof(val) == 'undefined' || val === '' || val === false))
						{
							rv = false;
							break;
						}
					}
					else if (typeof(cmp) == 'string' || typeof(cmp) == 'number')
					{
						if (val != cmp)
						{
							rv = false;
							break;
						}
					}
					else if (typeof(cmp) == 'function')
					{
						if (!cmp(val))
						{
							rv = false;
							break;
						}
					}
					else if (cmp instanceof RegExp)
					{
						if (!cmp.test(val))
						{
							rv = false;
							break;
						}
					}
				}

				if (rv)
				{
					if (i.disabled)
					{
						i.disabled = false;
						i.top.removeClass('luci2-field-disabled');
						i.top.fadeIn();
					}

					return true;
				}
			}

			if (!i.disabled)
			{
				i.disabled = true;
				i.top.is(':visible') ? i.top.fadeOut() : i.top.hide();
				i.top.addClass('luci2-field-disabled');
			}

			return false;
		}
	});

	this.cbi.CheckboxValue = this.cbi.AbstractValue.extend({
		widget: function(sid)
		{
			var o = this.options;

			if (typeof(o.enabled)  == 'undefined') o.enabled  = '1';
			if (typeof(o.disabled) == 'undefined') o.disabled = '0';

			var i = $('<input />')
				.attr('id', this.id(sid))
				.attr('type', 'checkbox')
				.prop('checked', this.ucivalue(sid));

			return $('<div />')
				.addClass('checkbox')
				.append(this.attachEvents(sid, i));
		},

		ucivalue: function(sid)
		{
			var v = this.callSuper('ucivalue', sid);

			if (typeof(v) == 'boolean')
				return v;

			return (v == this.options.enabled);
		},

		formvalue: function(sid)
		{
			var v = $('#' + this.id(sid)).prop('checked');

			if (typeof(v) == 'undefined')
				return !!this.options.initial;

			return v;
		},

		save: function(sid)
		{
			var uci = this.ucipath(sid);

			if (this.instance[sid].disabled)
			{
				if (!this.options.keep)
					return this.ownerMap.set(uci.config, uci.section, uci.option, undefined);

				return false;
			}

			var chg = this.changed(sid);
			var val = this.formvalue(sid);

			if (chg)
			{
				if (this.options.optional && val == this.options.initial)
					this.ownerMap.set(uci.config, uci.section, uci.option, undefined);
				else
					this.ownerMap.set(uci.config, uci.section, uci.option, val ? this.options.enabled : this.options.disabled);
			}

			return chg;
		}
	});

	this.cbi.InputValue = this.cbi.AbstractValue.extend({
		widget: function(sid)
		{
			var i = $('<input />')
				.addClass('form-control')
				.attr('id', this.id(sid))
				.attr('type', 'text')
				.attr('placeholder', this.options.placeholder)
				.val(this.ucivalue(sid));

			return this.attachEvents(sid, i);
		}
	});

	this.cbi.PasswordValue = this.cbi.AbstractValue.extend({
		widget: function(sid)
		{
			var i = $('<input />')
				.addClass('form-control')
				.attr('id', this.id(sid))
				.attr('type', 'password')
				.attr('placeholder', this.options.placeholder)
				.val(this.ucivalue(sid));

			var t = $('<span />')
				.addClass('input-group-btn')
				.append(L.ui.button(L.tr('Reveal'), 'default')
					.click(function(ev) {
						var b = $(this);
						var i = b.parent().prev();
						var t = i.attr('type');
						b.text(t == 'password' ? L.tr('Hide') : L.tr('Reveal'));
						i.attr('type', (t == 'password') ? 'text' : 'password');
						b = i = t = null;
					}));

			this.attachEvents(sid, i);

			return $('<div />')
				.addClass('input-group')
				.append(i)
				.append(t);
		}
	});

	this.cbi.ListValue = this.cbi.AbstractValue.extend({
		widget: function(sid)
		{
			var s = $('<select />')
				.addClass('form-control');

			if (this.options.optional && !this.has_empty)
				$('<option />')
					.attr('value', '')
					.text(L.tr('-- Please choose --'))
					.appendTo(s);

			if (this.choices)
				for (var i = 0; i < this.choices.length; i++)
					$('<option />')
						.attr('value', this.choices[i][0])
						.text(this.choices[i][1])
						.appendTo(s);

			s.attr('id', this.id(sid)).val(this.ucivalue(sid));

			return this.attachEvents(sid, s);
		},

		value: function(k, v)
		{
			if (!this.choices)
				this.choices = [ ];

			if (k == '')
				this.has_empty = true;

			this.choices.push([k, v || k]);
			return this;
		}
	});

	this.cbi.MultiValue = this.cbi.ListValue.extend({
		widget: function(sid)
		{
			var v = this.ucivalue(sid);
			var t = $('<div />').attr('id', this.id(sid));

			if (!$.isArray(v))
				v = (typeof(v) != 'undefined') ? v.toString().split(/\s+/) : [ ];

			var s = { };
			for (var i = 0; i < v.length; i++)
				s[v[i]] = true;

			if (this.choices)
				for (var i = 0; i < this.choices.length; i++)
				{
					$('<label />')
						.addClass('checkbox')
						.append($('<input />')
							.attr('type', 'checkbox')
							.attr('value', this.choices[i][0])
							.prop('checked', s[this.choices[i][0]]))
						.append(this.choices[i][1])
						.appendTo(t);
				}

			return t;
		},

		formvalue: function(sid)
		{
			var rv = [ ];
			var fields = $('#' + this.id(sid) + ' > label > input');

			for (var i = 0; i < fields.length; i++)
				if (fields[i].checked)
					rv.push(fields[i].getAttribute('value'));

			return rv;
		},

		textvalue: function(sid)
		{
			var v = this.formvalue(sid);
			var c = { };

			if (this.choices)
				for (var i = 0; i < this.choices.length; i++)
					c[this.choices[i][0]] = this.choices[i][1];

			var t = [ ];

			for (var i = 0; i < v.length; i++)
				t.push(c[v[i]] || v[i]);

			return t.join(', ');
		}
	});

	this.cbi.ComboBox = this.cbi.AbstractValue.extend({
		_change: function(ev)
		{
			var s = ev.target;
			var self = ev.data.self;

			if (s.selectedIndex == (s.options.length - 1))
			{
				ev.data.select.hide();
				ev.data.input.show().focus();
				ev.data.input.val('');
			}
			else if (self.options.optional && s.selectedIndex == 0)
			{
				ev.data.input.val('');
			}
			else
			{
				ev.data.input.val(ev.data.select.val());
			}

			ev.stopPropagation();
		},

		_blur: function(ev)
		{
			var seen = false;
			var val = this.value;
			var self = ev.data.self;

			ev.data.select.empty();

			if (self.options.optional && !self.has_empty)
				$('<option />')
					.attr('value', '')
					.text(L.tr('-- please choose --'))
					.appendTo(ev.data.select);

			if (self.choices)
				for (var i = 0; i < self.choices.length; i++)
				{
					if (self.choices[i][0] == val)
						seen = true;

					$('<option />')
						.attr('value', self.choices[i][0])
						.text(self.choices[i][1])
						.appendTo(ev.data.select);
				}

			if (!seen && val != '')
				$('<option />')
					.attr('value', val)
					.text(val)
					.appendTo(ev.data.select);

			$('<option />')
				.attr('value', ' ')
				.text(L.tr('-- custom --'))
				.appendTo(ev.data.select);

			ev.data.input.hide();
			ev.data.select.val(val).show().blur();
		},

		_enter: function(ev)
		{
			if (ev.which != 13)
				return true;

			ev.preventDefault();
			ev.data.self._blur(ev);
			return false;
		},

		widget: function(sid)
		{
			var d = $('<div />')
				.attr('id', this.id(sid));

			var t = $('<input />')
				.addClass('form-control')
				.attr('type', 'text')
				.hide()
				.appendTo(d);

			var s = $('<select />')
				.addClass('form-control')
				.appendTo(d);

			var evdata = {
				self: this,
				input: t,
				select: s
			};

			s.change(evdata, this._change);
			t.blur(evdata, this._blur);
			t.keydown(evdata, this._enter);

			t.val(this.ucivalue(sid));
			t.blur();

			this.attachEvents(sid, t);
			this.attachEvents(sid, s);

			return d;
		},

		value: function(k, v)
		{
			if (!this.choices)
				this.choices = [ ];

			if (k == '')
				this.has_empty = true;

			this.choices.push([k, v || k]);
			return this;
		},

		formvalue: function(sid)
		{
			var v = $('#' + this.id(sid)).children('input').val();
			return (v == '') ? undefined : v;
		}
	});

	this.cbi.DynamicList = this.cbi.ComboBox.extend({
		_redraw: function(focus, add, del, s)
		{
			var v = s.values || [ ];
			delete s.values;

			$(s.parent).children('div.input-group').children('input').each(function(i) {
				if (i != del)
					v.push(this.value || '');
			});

			$(s.parent).empty();

			if (add >= 0)
			{
				focus = add + 1;
				v.splice(focus, 0, '');
			}
			else if (v.length == 0)
			{
				focus = 0;
				v.push('');
			}

			for (var i = 0; i < v.length; i++)
			{
				var evdata = {
					sid: s.sid,
					self: s.self,
					parent: s.parent,
					index: i,
					remove: ((i+1) < v.length)
				};

				var btn;
				if (evdata.remove)
					btn = L.ui.button('–', 'danger').click(evdata, this._btnclick);
				else
					btn = L.ui.button('+', 'success').click(evdata, this._btnclick);

				if (this.choices)
				{
					var txt = $('<input />')
						.addClass('form-control')
						.attr('type', 'text')
						.hide();

					var sel = $('<select />')
						.addClass('form-control');

					$('<div />')
						.addClass('input-group')
						.append(txt)
						.append(sel)
						.append($('<span />')
							.addClass('input-group-btn')
							.append(btn))
						.appendTo(s.parent);

					evdata.input = this.attachEvents(s.sid, txt);
					evdata.select = this.attachEvents(s.sid, sel);

					sel.change(evdata, this._change);
					txt.blur(evdata, this._blur);
					txt.keydown(evdata, this._keydown);

					txt.val(v[i]);
					txt.blur();

					if (i == focus || -(i+1) == focus)
						sel.focus();

					sel = txt = null;
				}
				else
				{
					var f = $('<input />')
						.attr('type', 'text')
						.attr('index', i)
						.attr('placeholder', (i == 0) ? this.options.placeholder : '')
						.addClass('form-control')
						.keydown(evdata, this._keydown)
						.keypress(evdata, this._keypress)
						.val(v[i]);

					$('<div />')
						.addClass('input-group')
						.append(f)
						.append($('<span />')
							.addClass('input-group-btn')
							.append(btn))
						.appendTo(s.parent);

					if (i == focus)
					{
						f.focus();
					}
					else if (-(i+1) == focus)
					{
						f.focus();

						/* force cursor to end */
						var val = f.val();
						f.val(' ');
						f.val(val);
					}

					evdata.input = this.attachEvents(s.sid, f);

					f = null;
				}

				evdata = null;
			}

			s = null;
		},

		_keypress: function(ev)
		{
			switch (ev.which)
			{
				/* backspace, delete */
				case 8:
				case 46:
					if (ev.data.input.val() == '')
					{
						ev.preventDefault();
						return false;
					}

					return true;

				/* enter, arrow up, arrow down */
				case 13:
				case 38:
				case 40:
					ev.preventDefault();
					return false;
			}

			return true;
		},

		_keydown: function(ev)
		{
			var input = ev.data.input;

			switch (ev.which)
			{
				/* backspace, delete */
				case 8:
				case 46:
					if (input.val().length == 0)
					{
						ev.preventDefault();

						var index = ev.data.index;
						var focus = index;

						if (ev.which == 8)
							focus = -focus;

						ev.data.self._redraw(focus, -1, index, ev.data);
						return false;
					}

					break;

				/* enter */
				case 13:
					ev.data.self._redraw(NaN, ev.data.index, -1, ev.data);
					break;

				/* arrow up */
				case 38:
					var prev = input.parent().prevAll('div.input-group:first').children('input');
					if (prev.is(':visible'))
						prev.focus();
					else
						prev.next('select').focus();
					break;

				/* arrow down */
				case 40:
					var next = input.parent().nextAll('div.input-group:first').children('input');
					if (next.is(':visible'))
						next.focus();
					else
						next.next('select').focus();
					break;
			}

			return true;
		},

		_btnclick: function(ev)
		{
			if (!this.getAttribute('disabled'))
			{
				if (ev.data.remove)
				{
					var index = ev.data.index;
					ev.data.self._redraw(-index, -1, index, ev.data);
				}
				else
				{
					ev.data.self._redraw(NaN, ev.data.index, -1, ev.data);
				}
			}

			return false;
		},

		widget: function(sid)
		{
			this.options.optional = true;

			var v = this.ucivalue(sid);

			if (!$.isArray(v))
				v = (typeof(v) != 'undefined') ? v.toString().split(/\s+/) : [ ];

			var d = $('<div />')
				.attr('id', this.id(sid))
				.addClass('cbi-input-dynlist');

			this._redraw(NaN, -1, -1, {
				self:      this,
				parent:    d[0],
				values:    v,
				sid:       sid
			});

			return d;
		},

		ucivalue: function(sid)
		{
			var v = this.callSuper('ucivalue', sid);

			if (!$.isArray(v))
				v = (typeof(v) != 'undefined') ? v.toString().split(/\s+/) : [ ];

			return v;
		},

		formvalue: function(sid)
		{
			var rv = [ ];
			var fields = $('#' + this.id(sid) + ' input');

			for (var i = 0; i < fields.length; i++)
				if (typeof(fields[i].value) == 'string' && fields[i].value.length)
					rv.push(fields[i].value);

			return rv;
		}
	});

	this.cbi.DummyValue = this.cbi.AbstractValue.extend({
		widget: function(sid)
		{
			return $('<div />')
				.addClass('form-control-static')
				.attr('id', this.id(sid))
				.html(this.ucivalue(sid) || this.label('placeholder'));
		},

		formvalue: function(sid)
		{
			return this.ucivalue(sid);
		}
	});

	this.cbi.ButtonValue = this.cbi.AbstractValue.extend({
		widget: function(sid)
		{
			this.options.optional = true;

			var btn = $('<button />')
				.addClass('btn btn-default')
				.attr('id', this.id(sid))
				.attr('type', 'button')
				.text(this.label('text'));

			return this.attachEvents(sid, btn);
		}
	});

	this.cbi.NetworkList = this.cbi.AbstractValue.extend({
		load: function(sid)
		{
			return L.NetworkModel.init();
		},

		_device_icon: function(dev)
		{
			return $('<img />')
				.attr('src', dev.icon())
				.attr('title', '%s (%s)'.format(dev.description(), dev.name() || '?'));
		},

		widget: function(sid)
		{
			var id = this.id(sid);
			var ul = $('<ul />')
				.attr('id', id)
				.addClass('list-unstyled');

			var itype = this.options.multiple ? 'checkbox' : 'radio';
			var value = this.ucivalue(sid);
			var check = { };

			if (!this.options.multiple)
				check[value] = true;
			else
				for (var i = 0; i < value.length; i++)
					check[value[i]] = true;

			var interfaces = L.NetworkModel.getInterfaces();

			for (var i = 0; i < interfaces.length; i++)
			{
				var iface = interfaces[i];

				$('<li />')
					.append($('<label />')
						.addClass(itype + ' inline')
						.append(this.attachEvents(sid, $('<input />')
							.attr('name', itype + id)
							.attr('type', itype)
							.attr('value', iface.name())
							.prop('checked', !!check[iface.name()])))
						.append(iface.renderBadge()))
					.appendTo(ul);
			}

			if (!this.options.multiple)
			{
				$('<li />')
					.append($('<label />')
						.addClass(itype + ' inline text-muted')
						.append(this.attachEvents(sid, $('<input />')
							.attr('name', itype + id)
							.attr('type', itype)
							.attr('value', '')
							.prop('checked', $.isEmptyObject(check))))
						.append(L.tr('unspecified')))
					.appendTo(ul);
			}

			return ul;
		},

		ucivalue: function(sid)
		{
			var v = this.callSuper('ucivalue', sid);

			if (!this.options.multiple)
			{
				if ($.isArray(v))
				{
					return v[0];
				}
				else if (typeof(v) == 'string')
				{
					v = v.match(/\S+/);
					return v ? v[0] : undefined;
				}

				return v;
			}
			else
			{
				if (typeof(v) == 'string')
					v = v.match(/\S+/g);

				return v || [ ];
			}
		},

		formvalue: function(sid)
		{
			var inputs = $('#' + this.id(sid) + ' input');

			if (!this.options.multiple)
			{
				for (var i = 0; i < inputs.length; i++)
					if (inputs[i].checked && inputs[i].value !== '')
						return inputs[i].value;

				return undefined;
			}

			var rv = [ ];

			for (var i = 0; i < inputs.length; i++)
				if (inputs[i].checked)
					rv.push(inputs[i].value);

			return rv.length ? rv : undefined;
		}
	});

	this.cbi.DeviceList = this.cbi.NetworkList.extend({
		handleFocus: function(ev)
		{
			var self = ev.data.self;
			var input = $(this);

			input.parent().prev().prop('checked', true);
		},

		handleBlur: function(ev)
		{
			ev.which = 10;
			ev.data.self.handleKeydown.call(this, ev);
		},

		handleKeydown: function(ev)
		{
			if (ev.which != 10 && ev.which != 13)
				return;

			var sid = ev.data.sid;
			var self = ev.data.self;
			var input = $(this);
			var ifnames = L.toArray(input.val());

			if (!ifnames.length)
				return;

			L.NetworkModel.createDevice(ifnames[0]);

			self._redraw(sid, $('#' + self.id(sid)), ifnames[0]);
		},

		load: function(sid)
		{
			return L.NetworkModel.init();
		},

		_redraw: function(sid, ul, sel)
		{
			var id = ul.attr('id');
			var devs = L.NetworkModel.getDevices();
			var iface = L.NetworkModel.getInterface(sid);
			var itype = this.options.multiple ? 'checkbox' : 'radio';
			var check = { };

			if (!sel)
			{
				for (var i = 0; i < devs.length; i++)
					if (devs[i].isInNetwork(iface))
						check[devs[i].name()] = true;
			}
			else
			{
				if (this.options.multiple)
					check = L.toObject(this.formvalue(sid));

				check[sel] = true;
			}

			ul.empty();

			for (var i = 0; i < devs.length; i++)
			{
				var dev = devs[i];

				if (dev.isBridge() && this.options.bridges === false)
					continue;

				if (!dev.isBridgeable() && this.options.multiple)
					continue;

				var badge = $('<span />')
					.addClass('badge')
					.append($('<img />').attr('src', dev.icon()))
					.append(' %s: %s'.format(dev.name(), dev.description()));

				//var ifcs = dev.getInterfaces();
				//if (ifcs.length)
				//{
				//	for (var j = 0; j < ifcs.length; j++)
				//		badge.append((j ? ', ' : ' (') + ifcs[j].name());
				//
				//	badge.append(')');
				//}

				$('<li />')
					.append($('<label />')
						.addClass(itype + ' inline')
						.append($('<input />')
							.attr('name', itype + id)
							.attr('type', itype)
							.attr('value', dev.name())
							.prop('checked', !!check[dev.name()]))
						.append(badge))
					.appendTo(ul);
			}


			$('<li />')
				.append($('<label />')
					.attr('for', 'custom' + id)
					.addClass(itype + ' inline')
					.append($('<input />')
						.attr('name', itype + id)
						.attr('type', itype)
						.attr('value', ''))
					.append($('<span />')
						.addClass('badge')
						.append($('<input />')
							.attr('id', 'custom' + id)
							.attr('type', 'text')
							.attr('placeholder', L.tr('Custom device …'))
							.on('focus', { self: this, sid: sid }, this.handleFocus)
							.on('blur', { self: this, sid: sid }, this.handleBlur)
							.on('keydown', { self: this, sid: sid }, this.handleKeydown))))
				.appendTo(ul);

			if (!this.options.multiple)
			{
				$('<li />')
					.append($('<label />')
						.addClass(itype + ' inline text-muted')
						.append($('<input />')
							.attr('name', itype + id)
							.attr('type', itype)
							.attr('value', '')
							.prop('checked', $.isEmptyObject(check)))
						.append(L.tr('unspecified')))
					.appendTo(ul);
			}
		},

		widget: function(sid)
		{
			var id = this.id(sid);
			var ul = $('<ul />')
				.attr('id', id)
				.addClass('list-unstyled');

			this._redraw(sid, ul);

			return ul;
		},

		save: function(sid)
		{
			if (this.instance[sid].disabled)
				return;

			var ifnames = this.formvalue(sid);
			//if (!ifnames)
			//	return;

			var iface = L.NetworkModel.getInterface(sid);
			if (!iface)
				return;

			iface.setDevices($.isArray(ifnames) ? ifnames : [ ifnames ]);
		}
	});


	this.cbi.AbstractSection = this.ui.AbstractWidget.extend({
		id: function()
		{
			var s = [ arguments[0], this.ownerMap.uci_package, this.uci_type ];

			for (var i = 1; i < arguments.length && typeof(arguments[i]) == 'string'; i++)
				s.push(arguments[i].replace(/\./g, '_'));

			return s.join('_');
		},

		option: function(widget, name, options)
		{
			if (this.tabs.length == 0)
				this.tab({ id: '__default__', selected: true });

			return this.taboption('__default__', widget, name, options);
		},

		tab: function(options)
		{
			if (options.selected)
				this.tabs.selected = this.tabs.length;

			this.tabs.push({
				id:          options.id,
				caption:     options.caption,
				description: options.description,
				fields:      [ ],
				li:          { }
			});
		},

		taboption: function(tabid, widget, name, options)
		{
			var tab;
			for (var i = 0; i < this.tabs.length; i++)
			{
				if (this.tabs[i].id == tabid)
				{
					tab = this.tabs[i];
					break;
				}
			}

			if (!tab)
				throw 'Cannot append to unknown tab ' + tabid;

			var w = widget ? new widget(name, options) : null;

			if (!(w instanceof L.cbi.AbstractValue))
				throw 'Widget must be an instance of AbstractValue';

			w.ownerSection = this;
			w.ownerMap     = this.ownerMap;

			this.fields[name] = w;
			tab.fields.push(w);

			return w;
		},

		tabtoggle: function(sid)
		{
			for (var i = 0; i < this.tabs.length; i++)
			{
				var tab = this.tabs[i];
				var elem = $('#' + this.id('nodetab', sid, tab.id));
				var empty = true;

				for (var j = 0; j < tab.fields.length; j++)
				{
					if (tab.fields[j].active(sid))
					{
						empty = false;
						break;
					}
				}

				if (empty && elem.is(':visible'))
					elem.fadeOut();
				else if (!empty)
					elem.fadeIn();
			}
		},

		validate: function(parent_sid)
		{
			var s = this.getUCISections(parent_sid);
			var n = 0;

			for (var i = 0; i < s.length; i++)
			{
				var $item = $('#' + this.id('sectionitem', s[i]['.name']));

				$item.find('.luci2-field-validate').trigger('validate');
				n += $item.find('.luci2-field.luci2-form-error').not('.luci2-field-disabled').length;
			}

			return (n == 0);
		},

		load: function(parent_sid)
		{
			var deferreds = [ ];

			var s = this.getUCISections(parent_sid);
			for (var i = 0; i < s.length; i++)
			{
				for (var f in this.fields)
				{
					if (typeof(this.fields[f].load) != 'function')
						continue;

					var rv = this.fields[f].load(s[i]['.name']);
					if (L.isDeferred(rv))
						deferreds.push(rv);
				}

				for (var j = 0; j < this.subsections.length; j++)
				{
					var rv = this.subsections[j].load(s[i]['.name']);
					deferreds.push.apply(deferreds, rv);
				}
			}

			return deferreds;
		},

		save: function(parent_sid)
		{
			var deferreds = [ ];
			var s = this.getUCISections(parent_sid);

			for (i = 0; i < s.length; i++)
			{
				if (!this.options.readonly)
				{
					for (var f in this.fields)
					{
						if (typeof(this.fields[f].save) != 'function')
							continue;

						var rv = this.fields[f].save(s[i]['.name']);
						if (L.isDeferred(rv))
							deferreds.push(rv);
					}
				}

				for (var j = 0; j < this.subsections.length; j++)
				{
					var rv = this.subsections[j].save(s[i]['.name']);
					deferreds.push.apply(deferreds, rv);
				}
			}

			return deferreds;
		},

		teaser: function(sid)
		{
			var tf = this.teaser_fields;

			if (!tf)
			{
				tf = this.teaser_fields = [ ];

				if ($.isArray(this.options.teasers))
				{
					for (var i = 0; i < this.options.teasers.length; i++)
					{
						var f = this.options.teasers[i];
						if (f instanceof L.cbi.AbstractValue)
							tf.push(f);
						else if (typeof(f) == 'string' && this.fields[f] instanceof L.cbi.AbstractValue)
							tf.push(this.fields[f]);
					}
				}
				else
				{
					for (var i = 0; tf.length <= 5 && i < this.tabs.length; i++)
						for (var j = 0; tf.length <= 5 && j < this.tabs[i].fields.length; j++)
							tf.push(this.tabs[i].fields[j]);
				}
			}

			var t = '';

			for (var i = 0; i < tf.length; i++)
			{
				if (tf[i].instance[sid] && tf[i].instance[sid].disabled)
					continue;

				var n = tf[i].options.caption || tf[i].name;
				var v = tf[i].textvalue(sid);

				if (typeof(v) == 'undefined')
					continue;

				t = t + '%s%s: <strong>%s</strong>'.format(t ? ' | ' : '', n, v);
			}

			return t;
		},

		findAdditionalUCIPackages: function()
		{
			var packages = [ ];

			for (var i = 0; i < this.tabs.length; i++)
				for (var j = 0; j < this.tabs[i].fields.length; j++)
					if (this.tabs[i].fields[j].options.uci_package)
						packages.push(this.tabs[i].fields[j].options.uci_package);

			return packages;
		},

		findParentSectionIDs: function($elem)
		{
			var rv = [ ];
			var $parents = $elem.parents('.luci2-section-item');

			for (var i = 0; i < $parents.length; i++)
				rv.push($parents[i].getAttribute('data-luci2-sid'));

			return rv;
		}
	});

	this.cbi.TypedSection = this.cbi.AbstractSection.extend({
		init: function(uci_type, options)
		{
			this.uci_type = uci_type;
			this.options  = options;
			this.tabs     = [ ];
			this.fields   = { };
			this.subsections  = [ ];
			this.active_panel = { };
			this.active_tab   = { };

			this.instance = { };
		},

		filter: function(section, parent_sid)
		{
			return true;
		},

		sort: function(section1, section2)
		{
			return 0;
		},

		subsection: function(widget, uci_type, options)
		{
			var w = widget ? new widget(uci_type, options) : null;

			if (!(w instanceof L.cbi.AbstractSection))
				throw 'Widget must be an instance of AbstractSection';

			w.ownerSection = this;
			w.ownerMap     = this.ownerMap;
			w.index        = this.subsections.length;

			this.subsections.push(w);
			return w;
		},

		getUCISections: function(parent_sid)
		{
			var s1 = L.uci.sections(this.ownerMap.uci_package);
			var s2 = [ ];

			for (var i = 0; i < s1.length; i++)
				if (s1[i]['.type'] == this.uci_type)
					if (this.filter(s1[i], parent_sid))
						s2.push(s1[i]);

			s2.sort(this.sort);

			return s2;
		},

		add: function(name, parent_sid)
		{
			return this.ownerMap.add(this.ownerMap.uci_package, this.uci_type, name);
		},

		remove: function(sid, parent_sid)
		{
			return this.ownerMap.remove(this.ownerMap.uci_package, sid);
		},

		handleAdd: function(ev)
		{
			var addb = $(this);
			var name = undefined;
			var self = ev.data.self;
			var sid  = self.findParentSectionIDs(addb)[0];

			if (addb.prev().prop('nodeName') == 'INPUT')
				name = addb.prev().val();

			if (addb.prop('disabled') || name === '')
				return;

			L.ui.saveScrollTop();

			self.setPanelIndex(sid, -1);
			self.ownerMap.save();

			ev.data.sid  = self.add(name, sid);
			ev.data.type = self.uci_type;
			ev.data.name = name;

			self.trigger('add', ev);

			self.ownerMap.redraw();

			L.ui.restoreScrollTop();
		},

		handleRemove: function(ev)
		{
			var self = ev.data.self;
			var sids = self.findParentSectionIDs($(this));

			if (sids.length)
			{
				L.ui.saveScrollTop();

				ev.sid = sids[0];
				ev.parent_sid = sids[1];

				self.trigger('remove', ev);

				self.ownerMap.save();
				self.remove(ev.sid, ev.parent_sid);
				self.ownerMap.redraw();

				L.ui.restoreScrollTop();
			}

			ev.stopPropagation();
		},

		handleSID: function(ev)
		{
			var self = ev.data.self;
			var text = $(this);
			var addb = text.next();
			var errt = addb.next();
			var name = text.val();

			if (!/^[a-zA-Z0-9_]*$/.test(name))
			{
				errt.text(L.tr('Invalid section name')).show();
				text.addClass('error');
				addb.prop('disabled', true);
				return false;
			}

			if (L.uci.get(self.ownerMap.uci_package, name))
			{
				errt.text(L.tr('Name already used')).show();
				text.addClass('error');
				addb.prop('disabled', true);
				return false;
			}

			errt.text('').hide();
			text.removeClass('error');
			addb.prop('disabled', false);
			return true;
		},

		handleTab: function(ev)
		{
			var self = ev.data.self;
			var $tab = $(this);
			var sid  = self.findParentSectionIDs($tab)[0];

			self.active_tab[sid] = $tab.parent().index();
		},

		handleTabValidate: function(ev)
		{
			var $pane = $(ev.delegateTarget);
			var $badge = $pane.parent()
				.children('.nav-tabs')
				.children('li')
				.eq($pane.index() - 1) // item #1 is the <ul>
				.find('.badge:first');

			var err_count = $pane.find('.luci2-field.luci2-form-error').not('.luci2-field-disabled').length;
			if (err_count > 0)
				$badge
					.text(err_count)
					.attr('title', L.trp('1 Error', '%d Errors', err_count).format(err_count))
					.show();
			else
				$badge.hide();
		},

		handlePanelValidate: function(ev)
		{
			var $elem = $(this);
			var $badge = $elem
				.prevAll('.luci2-section-header:first')
				.children('.luci2-section-teaser')
				.find('.badge:first');

			var err_count = $elem.find('.luci2-field.luci2-form-error').not('.luci2-field-disabled').length;
			if (err_count > 0)
				$badge
					.text(err_count)
					.attr('title', L.trp('1 Error', '%d Errors', err_count).format(err_count))
					.show();
			else
				$badge.hide();
		},

		handlePanelCollapse: function(ev)
		{
			var self = ev.data.self;

			var $items = $(ev.delegateTarget).children('.luci2-section-item');

			var $this_panel  = $(ev.target);
			var $this_teaser = $this_panel.prevAll('.luci2-section-header:first').children('.luci2-section-teaser');

			var $prev_panel  = $items.children('.luci2-section-panel.in');
			var $prev_teaser = $prev_panel.prevAll('.luci2-section-header:first').children('.luci2-section-teaser');

			var sids = self.findParentSectionIDs($prev_panel);

			self.setPanelIndex(sids[1], $this_panel.parent().index());

			$prev_panel
				.removeClass('in')
				.addClass('collapse');

			$prev_teaser
				.show()
				.children('span:last')
				.empty()
				.append(self.teaser(sids[0]));

			$this_teaser
				.hide();

			ev.stopPropagation();
		},

		handleSort: function(ev)
		{
			var self = ev.data.self;

			var $item = $(this).parents('.luci2-section-item:first');
			var $next = ev.data.up ? $item.prev() : $item.next();

			if ($item.length && $next.length)
			{
				var cur_sid = $item.attr('data-luci2-sid');
				var new_sid = $next.attr('data-luci2-sid');

				L.uci.swap(self.ownerMap.uci_package, cur_sid, new_sid);

				self.ownerMap.save();
				self.ownerMap.redraw();
			}

			ev.stopPropagation();
		},

		getPanelIndex: function(parent_sid)
		{
			return (this.active_panel[parent_sid || '__top__'] || 0);
		},

		setPanelIndex: function(parent_sid, new_index)
		{
			if (typeof(new_index) == 'number')
				this.active_panel[parent_sid || '__top__'] = new_index;
		},

		renderAdd: function()
		{
			if (!this.options.addremove)
				return null;

			var text = L.tr('Add section');
			var ttip = L.tr('Create new section...');

			if ($.isArray(this.options.add_caption))
				text = this.options.add_caption[0], ttip = this.options.add_caption[1];
			else if (typeof(this.options.add_caption) == 'string')
				text = this.options.add_caption, ttip = '';

			var add = $('<div />');

			if (this.options.anonymous === false)
			{
				$('<input />')
					.addClass('cbi-input-text')
					.attr('type', 'text')
					.attr('placeholder', ttip)
					.blur({ self: this }, this.handleSID)
					.keyup({ self: this }, this.handleSID)
					.appendTo(add);

				$('<img />')
					.attr('src', L.globals.resource + '/icons/cbi/add.gif')
					.attr('title', text)
					.addClass('cbi-button')
					.click({ self: this }, this.handleAdd)
					.appendTo(add);

				$('<div />')
					.addClass('cbi-value-error')
					.hide()
					.appendTo(add);
			}
			else
			{
				L.ui.button(text, 'success', ttip)
					.click({ self: this }, this.handleAdd)
					.appendTo(add);
			}

			return add;
		},

		renderRemove: function(index)
		{
			if (!this.options.addremove)
				return null;

			var text = L.tr('Remove');
			var ttip = L.tr('Remove this section');

			if ($.isArray(this.options.remove_caption))
				text = this.options.remove_caption[0], ttip = this.options.remove_caption[1];
			else if (typeof(this.options.remove_caption) == 'string')
				text = this.options.remove_caption, ttip = '';

			return L.ui.button(text, 'danger', ttip)
				.click({ self: this, index: index }, this.handleRemove);
		},

		renderSort: function(index)
		{
			if (!this.options.sortable)
				return null;

			var b1 = L.ui.button('↑', 'info', L.tr('Move up'))
				.click({ self: this, index: index, up: true }, this.handleSort);

			var b2 = L.ui.button('↓', 'info', L.tr('Move down'))
				.click({ self: this, index: index, up: false }, this.handleSort);

			return b1.add(b2);
		},

		renderCaption: function()
		{
			return $('<h3 />')
				.addClass('panel-title')
				.append(this.label('caption') || this.uci_type);
		},

		renderDescription: function()
		{
			var text = this.label('description');

			if (text)
				return $('<div />')
					.addClass('luci2-section-description')
					.text(text);

			return null;
		},

		renderTeaser: function(sid, index)
		{
			if (this.options.collabsible || this.ownerMap.options.collabsible)
			{
				return $('<div />')
					.attr('id', this.id('teaser', sid))
					.addClass('luci2-section-teaser well well-sm')
					.append($('<span />')
						.addClass('badge'))
					.append($('<span />'));
			}

			return null;
		},

		renderHead: function(condensed)
		{
			if (condensed)
				return null;

			return $('<div />')
				.addClass('panel-heading')
				.append(this.renderCaption())
				.append(this.renderDescription());
		},

		renderTabDescription: function(sid, index, tab_index)
		{
			var tab = this.tabs[tab_index];

			if (typeof(tab.description) == 'string')
			{
				return $('<div />')
					.addClass('cbi-tab-descr')
					.text(tab.description);
			}

			return null;
		},

		renderTabHead: function(sid, index, tab_index)
		{
			var tab = this.tabs[tab_index];
			var cur = this.active_tab[sid] || 0;

			var tabh = $('<li />')
				.append($('<a />')
					.attr('id', this.id('nodetab', sid, tab.id))
					.attr('href', '#' + this.id('node', sid, tab.id))
					.attr('data-toggle', 'tab')
					.text((tab.caption ? tab.caption.format(tab.id) : tab.id) + ' ')
					.append($('<span />')
						.addClass('badge'))
					.on('shown.bs.tab', { self: this, sid: sid }, this.handleTab));

			if (cur == tab_index)
				tabh.addClass('active');

			if (!tab.fields.length)
				tabh.hide();

			return tabh;
		},

		renderTabBody: function(sid, index, tab_index)
		{
			var tab = this.tabs[tab_index];
			var cur = this.active_tab[sid] || 0;

			var tabb = $('<div />')
				.addClass('tab-pane')
				.attr('id', this.id('node', sid, tab.id))
				.append(this.renderTabDescription(sid, index, tab_index))
				.on('validate', this.handleTabValidate);

			if (cur == tab_index)
				tabb.addClass('active');

			for (var i = 0; i < tab.fields.length; i++)
				tabb.append(tab.fields[i].render(sid));

			return tabb;
		},

		renderPanelHead: function(sid, index, parent_sid)
		{
			var head = $('<div />')
				.addClass('luci2-section-header')
				.append(this.renderTeaser(sid, index))
				.append($('<div />')
					.addClass('btn-group')
					.append(this.renderSort(index))
					.append(this.renderRemove(index)));

			if (this.options.collabsible)
			{
				head.attr('data-toggle', 'collapse')
					.attr('data-parent', this.id('sectiongroup', parent_sid))
					.attr('data-target', '#' + this.id('panel', sid));
			}

			return head;
		},

		renderPanelBody: function(sid, index, parent_sid)
		{
			var body = $('<div />')
				.attr('id', this.id('panel', sid))
				.addClass('luci2-section-panel')
				.on('validate', this.handlePanelValidate);

			if (this.options.collabsible || this.ownerMap.options.collabsible)
			{
				body.addClass('panel-collapse collapse');

				if (index == this.getPanelIndex(parent_sid))
					body.addClass('in');
			}

			var tab_heads = $('<ul />')
				.addClass('nav nav-tabs');

			var tab_bodies = $('<div />')
				.addClass('form-horizontal tab-content')
				.append(tab_heads);

			for (var j = 0; j < this.tabs.length; j++)
			{
				tab_heads.append(this.renderTabHead(sid, index, j));
				tab_bodies.append(this.renderTabBody(sid, index, j));
			}

			body.append(tab_bodies);

			if (this.tabs.length <= 1)
				tab_heads.hide();

			for (var i = 0; i < this.subsections.length; i++)
				body.append(this.subsections[i].render(false, sid));

			return body;
		},

		renderBody: function(condensed, parent_sid)
		{
			var s = this.getUCISections(parent_sid);
			var n = this.getPanelIndex(parent_sid);

			if (n < 0)
				this.setPanelIndex(parent_sid, n + s.length);
			else if (n >= s.length)
				this.setPanelIndex(parent_sid, s.length - 1);

			var body = $('<ul />')
				.addClass('luci2-section-group list-group');

			if (this.options.collabsible)
			{
				body.attr('id', this.id('sectiongroup', parent_sid))
					.on('show.bs.collapse', { self: this }, this.handlePanelCollapse);
			}

			if (s.length == 0)
			{
				body.append($('<li />')
					.addClass('list-group-item text-muted')
					.text(this.label('placeholder') || L.tr('There are no entries defined yet.')))
			}

			for (var i = 0; i < s.length; i++)
			{
				var sid = s[i]['.name'];
				var inst = this.instance[sid] = { tabs: [ ] };

				body.append($('<li />')
					.addClass('luci2-section-item list-group-item')
					.attr('id', this.id('sectionitem', sid))
					.attr('data-luci2-sid', sid)
					.append(this.renderPanelHead(sid, i, parent_sid))
					.append(this.renderPanelBody(sid, i, parent_sid)));
			}

			return body;
		},

		render: function(condensed, parent_sid)
		{
			this.instance = { };

			var panel = $('<div />')
				.addClass('panel panel-default')
				.append(this.renderHead(condensed))
				.append(this.renderBody(condensed, parent_sid));

			if (this.options.addremove)
				panel.append($('<div />')
					.addClass('panel-footer')
					.append(this.renderAdd()));

			return panel;
		},

		finish: function(parent_sid)
		{
			var s = this.getUCISections(parent_sid);

			for (var i = 0; i < s.length; i++)
			{
				var sid = s[i]['.name'];

				if (i != this.getPanelIndex(parent_sid))
					$('#' + this.id('teaser', sid)).children('span:last')
						.append(this.teaser(sid));
				else
					$('#' + this.id('teaser', sid))
						.hide();

				for (var j = 0; j < this.subsections.length; j++)
					this.subsections[j].finish(sid);
			}
		}
	});

	this.cbi.TableSection = this.cbi.TypedSection.extend({
		renderTableHead: function()
		{
			var thead = $('<thead />')
				.append($('<tr />')
					.addClass('cbi-section-table-titles'));

			for (var j = 0; j < this.tabs[0].fields.length; j++)
				thead.children().append($('<th />')
					.addClass('cbi-section-table-cell')
					.css('width', this.tabs[0].fields[j].options.width || '')
					.append(this.tabs[0].fields[j].label('caption')));

			if (this.options.addremove !== false || this.options.sortable)
				thead.children().append($('<th />')
					.addClass('cbi-section-table-cell')
					.text(' '));

			return thead;
		},

		renderTableRow: function(sid, index)
		{
			var row = $('<tr />')
				.addClass('luci2-section-item')
				.attr('id', this.id('sectionitem', sid))
				.attr('data-luci2-sid', sid);

			for (var j = 0; j < this.tabs[0].fields.length; j++)
			{
				row.append($('<td />')
					.css('width', this.tabs[0].fields[j].options.width || '')
					.append(this.tabs[0].fields[j].render(sid, true)));
			}

			if (this.options.addremove !== false || this.options.sortable)
			{
				row.append($('<td />')
					.css('width', '1%')
					.addClass('text-right')
					.append($('<div />')
						.addClass('btn-group')
						.append(this.renderSort(index))
						.append(this.renderRemove(index))));
			}

			return row;
		},

		renderTableBody: function(parent_sid)
		{
			var s = this.getUCISections(parent_sid);

			var tbody = $('<tbody />');

			if (s.length == 0)
			{
				var cols = this.tabs[0].fields.length;

				if (this.options.addremove !== false || this.options.sortable)
					cols++;

				tbody.append($('<tr />')
					.append($('<td />')
						.addClass('text-muted')
						.attr('colspan', cols)
						.text(this.label('placeholder') || L.tr('There are no entries defined yet.'))));
			}

			for (var i = 0; i < s.length; i++)
			{
				var sid = s[i]['.name'];
				var inst = this.instance[sid] = { tabs: [ ] };

				tbody.append(this.renderTableRow(sid, i));
			}

			return tbody;
		},

		renderBody: function(condensed, parent_sid)
		{
			return $('<table />')
				.addClass('table table-condensed table-hover')
				.append(this.renderTableHead())
				.append(this.renderTableBody(parent_sid));
		}
	});

	this.cbi.NamedSection = this.cbi.TypedSection.extend({
		getUCISections: function(cb)
		{
			var sa = [ ];
			var sl = L.uci.sections(this.ownerMap.uci_package);

			for (var i = 0; i < sl.length; i++)
				if (sl[i]['.name'] == this.uci_type)
				{
					sa.push(sl[i]);
					break;
				}

			if (typeof(cb) == 'function' && sa.length > 0)
				cb.call(this, sa[0]);

			return sa;
		}
	});

	this.cbi.SingleSection = this.cbi.NamedSection.extend({
		render: function()
		{
			this.instance = { };
			this.instance[this.uci_type] = { tabs: [ ] };

			return $('<div />')
				.addClass('luci2-section-item')
				.attr('id', this.id('sectionitem', this.uci_type))
				.attr('data-luci2-sid', this.uci_type)
				.append(this.renderPanelBody(this.uci_type, 0));
		}
	});

	this.cbi.DummySection = this.cbi.TypedSection.extend({
		getUCISections: function(cb)
		{
			if (typeof(cb) == 'function')
				cb.apply(this, [ { '.name': this.uci_type } ]);

			return [ { '.name': this.uci_type } ];
		}
	});

	this.cbi.Map = this.ui.AbstractWidget.extend({
		init: function(uci_package, options)
		{
			var self = this;

			this.uci_package = uci_package;
			this.sections = [ ];
			this.options = L.defaults(options, {
				save:    function() { },
				prepare: function() { }
			});
		},

		loadCallback: function()
		{
			var deferreds = [ L.deferrable(this.options.prepare()) ];

			for (var i = 0; i < this.sections.length; i++)
			{
				var rv = this.sections[i].load();
				deferreds.push.apply(deferreds, rv);
			}

			return $.when.apply($, deferreds);
		},

		load: function()
		{
			var self = this;
			var packages = [ this.uci_package ];

			for (var i = 0; i < this.sections.length; i++)
				packages.push.apply(packages, this.sections[i].findAdditionalUCIPackages());

			for (var i = 0; i < packages.length; i++)
				if (!L.uci.writable(packages[i]))
				{
					this.options.readonly = true;
					break;
				}

			return L.uci.load(packages).then(function() {
				return self.loadCallback();
			});
		},

		handleTab: function(ev)
		{
			ev.data.self.active_tab = $(ev.target).parent().index();
		},

		handleApply: function(ev)
		{
			var self = ev.data.self;

			self.trigger('apply', ev);
		},

		handleSave: function(ev)
		{
			var self = ev.data.self;

			self.send().then(function() {
				self.trigger('save', ev);
			});
		},

		handleReset: function(ev)
		{
			var self = ev.data.self;

			self.trigger('reset', ev);
			self.reset();
		},

		renderTabHead: function(tab_index)
		{
			var section = this.sections[tab_index];
			var cur = this.active_tab || 0;

			var tabh = $('<li />')
				.append($('<a />')
					.attr('id', section.id('sectiontab'))
					.attr('href', '#' + section.id('section'))
					.attr('data-toggle', 'tab')
					.text(section.label('caption') + ' ')
					.append($('<span />')
						.addClass('badge'))
					.on('shown.bs.tab', { self: this }, this.handleTab));

			if (cur == tab_index)
				tabh.addClass('active');

			return tabh;
		},

		renderTabBody: function(tab_index)
		{
			var section = this.sections[tab_index];
			var desc = section.label('description');
			var cur = this.active_tab || 0;

			var tabb = $('<div />')
				.addClass('tab-pane')
				.attr('id', section.id('section'));

			if (cur == tab_index)
				tabb.addClass('active');

			if (desc)
				tabb.append($('<p />')
					.text(desc));

			var s = section.render(this.options.tabbed);

			if (this.options.readonly || section.options.readonly)
				s.find('input, select, button, img.cbi-button').attr('disabled', true);

			tabb.append(s);

			return tabb;
		},

		renderBody: function()
		{
			var tabs = $('<ul />')
				.addClass('nav nav-tabs');

			var body = $('<div />')
				.append(tabs);

			for (var i = 0; i < this.sections.length; i++)
			{
				tabs.append(this.renderTabHead(i));
				body.append(this.renderTabBody(i));
			}

			if (this.options.tabbed)
				body.addClass('tab-content');
			else
				tabs.hide();

			return body;
		},

		renderFooter: function()
		{
			var evdata = {
				self: this
			};

			return $('<div />')
				.addClass('panel panel-default panel-body text-right')
				.append($('<div />')
					.addClass('btn-group')
					.append(L.ui.button(L.tr('Save & Apply'), 'primary')
						.click(evdata, this.handleApply))
					.append(L.ui.button(L.tr('Save'), 'default')
						.click(evdata, this.handleSave))
					.append(L.ui.button(L.tr('Reset'), 'default')
						.click(evdata, this.handleReset)));
		},

		render: function()
		{
			var map = $('<form />');

			if (typeof(this.options.caption) == 'string')
				map.append($('<h2 />')
					.text(this.options.caption));

			if (typeof(this.options.description) == 'string')
				map.append($('<p />')
					.text(this.options.description));

			map.append(this.renderBody());

			if (this.options.pageaction !== false)
				map.append(this.renderFooter());

			return map;
		},

		finish: function()
		{
			for (var i = 0; i < this.sections.length; i++)
				this.sections[i].finish();

			this.validate();
		},

		redraw: function()
		{
			this.target.hide().empty().append(this.render());
			this.finish();
			this.target.show();
		},

		section: function(widget, uci_type, options)
		{
			var w = widget ? new widget(uci_type, options) : null;

			if (!(w instanceof L.cbi.AbstractSection))
				throw 'Widget must be an instance of AbstractSection';

			w.ownerMap = this;
			w.index = this.sections.length;

			this.sections.push(w);
			return w;
		},

		add: function(conf, type, name)
		{
			return L.uci.add(conf, type, name);
		},

		remove: function(conf, sid)
		{
			return L.uci.remove(conf, sid);
		},

		get: function(conf, sid, opt)
		{
			return L.uci.get(conf, sid, opt);
		},

		set: function(conf, sid, opt, val)
		{
			return L.uci.set(conf, sid, opt, val);
		},

		validate: function()
		{
			var rv = true;

			for (var i = 0; i < this.sections.length; i++)
			{
				if (!this.sections[i].validate())
					rv = false;
			}

			return rv;
		},

		save: function()
		{
			var self = this;

			if (self.options.readonly)
				return L.deferrable();

			var deferreds = [ ];

			for (var i = 0; i < self.sections.length; i++)
			{
				var rv = self.sections[i].save();
				deferreds.push.apply(deferreds, rv);
			}

			return $.when.apply($, deferreds).then(function() {
				return L.deferrable(self.options.save());
			});
		},

		send: function()
		{
			if (!this.validate())
				return L.deferrable();

			var self = this;

			L.ui.saveScrollTop();
			L.ui.loading(true);

			return this.save().then(function() {
				return L.uci.save();
			}).then(function() {
				return L.ui.updateChanges();
			}).then(function() {
				return self.load();
			}).then(function() {
				self.redraw();
				self = null;

				L.ui.loading(false);
				L.ui.restoreScrollTop();
			});
		},

		revert: function()
		{
			var packages = [ this.uci_package ];

			for (var i = 0; i < this.sections.length; i++)
				packages.push.apply(packages, this.sections[i].findAdditionalUCIPackages());

			L.uci.unload(packages);
		},

		reset: function()
		{
			var self = this;

			self.revert();

			return self.insertInto(self.target);
		},

		insertInto: function(id)
		{
			var self = this;
			    self.target = $(id);

			L.ui.loading(true);
			self.target.hide();

			return self.load().then(function() {
				self.target.empty().append(self.render());
				self.finish();
				self.target.show();
				self = null;
				L.ui.loading(false);
			});
		}
	});

	this.cbi.Modal = this.cbi.Map.extend({
		handleApply: function(ev)
		{
			var self = ev.data.self;

			self.trigger('apply', ev);
		},

		handleSave: function(ev)
		{
			var self = ev.data.self;

			self.send().then(function() {
				self.trigger('save', ev);
				self.close();
			});
		},

		handleReset: function(ev)
		{
			var self = ev.data.self;

			self.trigger('close', ev);
			self.revert();
			self.close();
		},

		renderFooter: function()
		{
			var evdata = {
				self: this
			};

			return $('<div />')
				.addClass('btn-group')
				.append(L.ui.button(L.tr('Save & Apply'), 'primary')
					.click(evdata, this.handleApply))
				.append(L.ui.button(L.tr('Save'), 'default')
					.click(evdata, this.handleSave))
				.append(L.ui.button(L.tr('Cancel'), 'default')
					.click(evdata, this.handleReset));
		},

		render: function()
		{
			var modal = L.ui.dialog(this.label('caption'), null, { wide: true });
			var map = $('<form />');

			var desc = this.label('description');
			if (desc)
				map.append($('<p />').text(desc));

			map.append(this.renderBody());

			modal.find('.modal-body').append(map);
			modal.find('.modal-footer').append(this.renderFooter());

			return modal;
		},

		redraw: function()
		{
			this.render();
			this.finish();
		},

		show: function()
		{
			var self = this;

			L.ui.loading(true);

			return self.load().then(function() {
				self.render();
				self.finish();

				L.ui.loading(false);
			});
		},

		close: function()
		{
			L.ui.dialog(false);
		}
	});
};
