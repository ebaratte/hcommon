var noop = function() {};

exports.fork = function(a,b) {
	return function(err, value) {
		if (err) {
			a(err);
			return;
		}
		b(value);
	};
};

exports.step = function(funcs, onerror) {
	var counter = 0;
	var completed = 0;
	var pointer = 0;
	var ended = false;
	var state = {};
	var values = null;
	var complete = false;

	var check = function() {
		return complete && completed >= counter;
	};
	var next = function(err, value) {
		if (err && !ended) {
			ended = true;
			(onerror || noop).apply(state, [err]);
			return;
		}
		if (ended || (counter && !check())) {
			return;
		}

		var fn = funcs[pointer++];
		var args = (fn.length === 1 ? [next] : [value, next]);

		counter = completed = 0;
		values = [];
		complete = false;
		try {
			fn.apply(state, pointer < funcs.length ? args : [value, next]);
		} catch (exc) {
			console.log('[EXCEPTION CAUGHT]', exc, exc.stack.replace(/\n/g, ''));
			complete = true;
			next(exc);
			return;
		}
		complete = true;

		if (counter && check()) {
			next(null, values);
		}
	};
	next.parallel = function(key) {
		var index = counter++;

		if (complete) {
			throw new Error('next.parallel must not be called async');
		}
		return function(err, value) {
			completed++;
			values[key ? key : index] = value;
			next(err, values);
		};
	};

  next.skip = function (step) {
    pointer += step;
    return next;
  }

	next();
};

exports.join = function() {
	var result = {};

	for (var i = 0; i < arguments.length; i++) {
		var a = arguments[i];

		for (var j in a) {
			result[j] = a[j];
		}
	}
	return result;
};

exports.format = function (str, col) {
	col = typeof col === 'object' ? col : Array.prototype.slice.call(arguments, 1);

	return str.replace(/\{([^{}]+)\}/gm, function () {
		return col[arguments[1]] === undefined ? arguments[0] : col[arguments[1]];
	});
};
