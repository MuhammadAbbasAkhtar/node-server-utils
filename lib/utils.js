const slugify = require('slugify');
const { resolvePath } = require('./filesystem');
/**
 * Sends a JSON response with a specified status code and payload object.
 *
 * @param {import('express').Response} res - The Express response object.
 * @param {number|object} code - The HTTP status code (if not an integer, it assumes `code` is the payload object).
 * @param {object} [obj] - The payload object to send. Defaults to including a `success` property if not provided.
 *
 * @returns {<void>} Resolves after sending the response.
 *
 * @example
 * sendResponse(res, 201, { message: 'Created' });
 * sendResponse(res, { message: 'OK' });
 * sendResponse(res, 400, { message: 'Error in body', success: false });
 */
const sendResponse = (res, code, obj) => {
	if (!Number.isInteger(code)) {
		obj = code;
		code = 200;
	}
	if (!obj.hasOwnProperty('success')) {
		obj.success = true;
	}

	if (!res.headersSent) return res.status(code).json(obj);
};

/**
 * Sends a JSON response with a message and success status.
 *
 * @param {import('express').Response} res - The Express response object.
 * @param {string} message - The message to include in the response.
 * @param {boolean} [success=true] - Whether the response indicates success (default is `true`).
 * @param {number} [code=200] - The HTTP status code (default is 200).
 *
 * @returns {<void>} Resolves after sending the response.
 *
 * @example
 * sendResponseMsg(res, 'Operation completed successfully');
 * sendResponseMsg(res, 'Operation failed', false, 400);
 * sendResponseMsg(res, 'Server Crashed', false, 500);
 */
const sendResponseMsg = (res, message, success = true, code = 200) => {
	if (res && typeof res.status === 'function' && !res.headersSent) {
		return res.status(code).json({ message, success });
	} else {
		console.log('Response object:', res); // Debug log
		throw new Error('Invalid response object provided to sendResponseMsg');
	}
};


/**
 * Generates a unique slug based on a given name and a model.
 *
 * @param {string} name - The name to generate the slug from.
 * @param {import('mongoose').Model} model - The Mongoose model instance to query for existing slugs.
 *
 * @returns {Promise<string>} A promise that resolves to a unique slug.
 *
 * @example
 * const Post = mongoose.model('Post', { name: String, slug: String });
 * const slug = await generateUniqueSlugByModel('My Blog Post', Post);
 */
const generateUniqueSlugByModel = async (name, model) => {
	let baseSlug = slugify(name, { lower: true, strict: true });
	let slug = baseSlug;
	let counter = 1;

	while (await model.exists({ slug })) {
		slug = `${baseSlug}-${counter++}`;
	}

	return slug;
};

const validateConfig = ({ dbOptions, port, appRootPath }) => {
	if (typeof port !== 'number') {
		throw new Error('Port must be a number.');
	}

	/**
	 * Validates the dbOptions parameter by ensuring both uri and dbName are provided.
	 */
	if (dbOptions) {
		const { uri, dbName } = dbOptions;
		if (!uri || !dbName) {
			throw new Error('Both dbOptions.uri and dbOptions.dbName are required.');
		}
	}

	/**
	 * Validates the appRootPath parameter.
	 */
	if (appRootPath) {
		if (typeof appRootPath !== 'string') {
			throw new Error('appRootPath must be a string.');
		}

		const fullPath = path.resolve(appRootPath);
		if (!fs.existsSync(fullPath)) {
			throw new Error(`appRootPath does not exist: ${fullPath}`);
		}

		let routeModule;
		try {
			routeModule = require(fullPath);
		} catch (err) {
			throw new Error(`Unable to require appRootPath: ${err.message}`);
		}

		if (typeof routeModule !== 'function') {
			throw new Error('The file at appRootPath must export a function (e.g., module.exports = app => { ... }).');
		}

		const usedMethods = new Set();
		/**
		 * Creates a Proxy object. The Proxy object allows you to create an object that can be used in place of the original object,
		 * but which may redefine fundamental Object operations like getting, setting, and defining properties.
		 *
		 * Proxy objects are commonly used to log property accesses, validate, format, or sanitize inputs.
		 * @param target — A target object to wrap with Proxy.
		 * @param handler — An object whose properties define the behavior of Proxy when an operation is attempted on it.
		 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
		 *
		 */
		const routeValidatorApp = new Proxy({}, {
			get(_, methodName) {
				if (typeof methodName === 'string') {
					usedMethods.add(methodName);
				}
				return () => {};
			}
		});

		try {
			routeModule(routeValidatorApp);
		} catch (err) {
			throw new Error(`Error executing exported route function: ${err.message}`);
		}

		if (!usedMethods.has('get') && !usedMethods.has('use')) {
			throw new Error('The exported router function must register at least one route using app.get() or app.use().');
		}
	}
};

module.exports = {
	sendResponse,
	sendResponseMsg,
	validateConfig,
	generateUniqueSlugByModel,
};
