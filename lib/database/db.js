const { joinPath, readFilesFromDir } = require('../filesystem.js');
const mongoose = require('mongoose');


/**
 * Registers all Mongoose models from the specified directory.
 *
 * @async
 * @param {string} modelsPath - The path to the directory containing model files.
 *
 * Scans the directory for JavaScript files and requires each file to register its model with Mongoose.
 *
 * @returns {Promise<void>} Resolves after all models have been registered.
 *
 * @example
 * await registerModels('./models');
 *  Logs: "All models registered"
 */
const registerModels = async modelsPath => {
	readFilesFromDir(modelsPath).forEach(file => {
		// Only consider JavaScript files
		if (file.endsWith('.js')) {
			const modelPath = joinPath(modelsPath, file);
			require(modelPath); // Require the model file to register the model with Mongoose
		}
	});
	console.log(global.chalk.success('✅ All models registered '));
};


/**
 * Establishes a connection to a MongoDB database using Mongoose.
 *
 * @async
 * @param {string} MONGO_CONN_URL - The MongoDB connection URL.
 * @param {string} MONGO_DB_NAME - The name of the database to connect to.
 * @param {object} [opts={}] - Optional Mongoose connection options.
 *
 * Sets up event listeners to log the database connection status, such as connecting, connected, disconnected, and disconnecting.
 * Updates the `setDbConnected` state based on the connection status.
 *
 * @returns {Promise<void>} Resolves when the connection is successfully established.
 *
 * @throws {Error} If `MONGO_CONN_URL` or `MONGO_DB_NAME` is not provided, or if the connection fails.
 *
 * @example
 * await connectToDatabase('mongodb://localhost:27017', 'myDatabase', { useNewUrlParser: true, useUnifiedTopology: true });
 */
async function connectToDatabase(MONGO_CONN_URL, MONGO_DB_NAME, opts = {}) {
	if (!MONGO_CONN_URL) throw new Error('MONGO_CONN_URL not set');

	if (!MONGO_DB_NAME) throw new Error('MONGO_DB_NAME not set');

	const db_name = global.chalk.magenta.bold(MONGO_DB_NAME);

	mongoose.set('strictQuery', false);
	mongoose.promise = global.Promise;

	return new Promise((resolve, reject) => {
		mongoose.connect(MONGO_CONN_URL, opts).catch(err => {
			// const msg = `${MONGO_DB_NAME} -- ${err.message}`;
			// console.error(global.chalk.error(msg));
			console.error('%s -- %s', db_name, global.chalk.red(err.message));
			reject(err);
		});

		mongoose.connection.on('connecting', () => {
			// const msg = `${MONGO_DB_NAME} -- connecting...`;
			// console.log(global.chalk.success(msg));

			console.log('🔮 %s -- %s', db_name, global.chalk.blue('connecting...'));
		});

		mongoose.connection.on('connected', () => {
			// const msg = `${MONGO_DB_NAME} -- database connection established successfully!`;
			// console.log(global.chalk.success(msg));
			console.log('👌 %s -- %s', db_name, global.chalk.green('DB Connected!'));
			registerModels(global.appRoot + '/models');
			resolve();
		});

		mongoose.connection.on('disconnected', () => {
			// const msg = `✨ ${MONGO_DB_NAME} -- database connection lost`;
			// console.warn(global.chalk.warn(msg));

			console.warn('%s -- %s', db_name, global.chalk.red('💀 database connection lost'));
		});

		mongoose.connection.on('disconnecting', () => {
			// const msg = `${MONGO_DB_NAME} -- closing database connection`;
			// console.warn(global.chalk.warn(msg));

			console.warn('%s -- %s', db_name, global.chalk.red('💀 closing database connection'));
		});
	});
}

module.exports = { connectToDatabase };
