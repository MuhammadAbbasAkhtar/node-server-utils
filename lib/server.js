const { validateConfig } = require('./utils');
const { initializeSchemaManager } = require('./database/schemaManager');
const loadChalk = async () => {
	process.env.FORCE_COLOR = '1';
	const { default: chalk } = await import('chalk');
	return chalk;
};

/**
 * Verifies that all required environment variables are set and have valid values.
 *
 * @param {string[]} requiredEnvVars - An array of environment variable names that must be set.
 * @returns {boolean} true if all variables are set and have valid values, or throws an error if any are missing or empty.
 */
function verifyEnvVariables(requiredEnvVars) {
	const missingVars = [];
	const emptyVars = [];

	requiredEnvVars.forEach((envVar) => {
		const value = process.env[envVar];
		if (value === undefined) {
			missingVars.push(envVar);
		} else if (value.trim() === '') {
			emptyVars.push(envVar);
		}
	});

	if (missingVars.length > 0 || emptyVars.length > 0) {
		const errorMessage = [
			missingVars.length > 0 && `Missing environment variables: ${missingVars.join(', ')}`,
			emptyVars.length > 0 && `Empty environment variables: ${emptyVars.join(', ')}`,
		]
			.filter(Boolean)
			.join('. ');
		throw new Error(errorMessage);
	}

	return true; // All variables are set and have valid values
}

const defaultOptions = {
	serverName: 'Node server',
	port: 3000,
	corsOptions: {
		origin: '*',
		methods: ['GET', 'POST', 'PUT', 'DELETE'],
		allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'Content-Disposition'],
		credentials: true,
	},
	enableMorgan: true,
	appMode: 'development',
	routesPath: null,
	maxBodySizeLimit: '50mb',
	middlewares: {
		bodyParser: false,
		expressJson: true,
		urlEncoded: true,
	},

	useSchemaManager: false, // use SchemaManager for dynamic model imports
};

const startServer = async (options = {}) => {
	try {
		//#region === 0 - SCAFFOLD SERVER

		const chalk = await loadChalk();
		global.chalk = chalk;
		global.chalk.warn = chalk.yellow.bold;
		global.chalk.error = chalk.red.bold;
		global.chalk.success = chalk.green.bold;
		global.chalk.magenta = chalk.hex('#E57373').bold;
		global.chalk.cyan = chalk.cyan;

		console.log(global.chalk.success('✅ Chalk has been initialized successfully!'));
		const config = { ...defaultOptions, ...options };
		// Validate configuration
		validateConfig(config);

		global.appRoot = config.appRootPath;
		global.HttpError = HttpError;

		if (config.useSchemaManager) {
			if (!config.modelsPath) {
				console.error(global.chalk.error('⚠️ Schema Manager initialization failed: modelsPath is required.'));
				throw new Error('modelsPath is required when useSchemaManager is enabled.');
			} else {
				initializeSchemaManager(config.modelsPath);
				// global.schemaManager = schemaManager;
				console.log(global.chalk.green('✅ Schema Manager initialized & ready'));
			}
		}
		//#endregion
		//#region === 1 - CONFIGURE SERVER
		const app = express();
		//#endregion

		//#region === 1 - CONFIGURE LOGGING
		if (config.enableMorgan) {
			morgan.token('date', (req, res) => {
				let date = new Date();
				return date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
			});

			morgan.token('statusColored', (req, res) => {
				const status = res.statusCode;
				if (status >= 500) {
					return chalk.red(status);
				} else if (status >= 400) {
					return chalk.yellow(status);
				} else if (status >= 300) {
					return chalk.cyan(status);
				} else if (status >= 200) {
					return chalk.green(status);
				}
				return chalk.white(status);
			});

			morgan.token('methodColored', (req) => {
				const method = req.method;
				if (method === 'GET') {
					return chalk.green(method);
				} else if (method === 'POST') {
					return chalk.blue(method);
				} else if (method === 'PUT') {
					return chalk.yellow(method);
				} else if (method === 'DELETE') {
					return chalk.red(method);
				}
				return chalk.white(method);
			});

			app.use(morgan(':date | :remote-addr - :remote-user | :methodColored :url | :statusColored | :response-time[1] ms | "referrer :referrer" ":user-agent"'));
		}
		//#endregion

		//#region === 2 - MIDDLEWARES
		if (config.middlewares.bodyParser == true) {
			app.use(bodyParser.json());
		}

		if (config.middlewares.expressJson == true) {
			app.use(express.json({ limit: maxBodySizeLimit }));
		}

		if (config.middlewares.urlEncoded == true) {
			app.use(express.urlencoded({ limit: maxBodySizeLimit, extended: true }));
		}
		//#endregion
	} catch (err) {
		// eslint-disable-next-line no-undef
		console.error('Failed to start server:', err);
		process.exit(1); // Exit the process on failure
	}
};

/**
 * Gracefully shuts down the server.
 * @param {Object} server - The server instance.
 */
const shutdown = (server) => {
	server.close(() => {
		console.log('🔒 Server shut down gracefully.');
		process.exit(0);
	});
};

module.exports = { startServer };
