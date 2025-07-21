let schemaManagerInstance = null; // Singleton instance
class SchemaManager {
	constructor(schemaDir, useGlobalCache = false) {
		if (!schemaDir) throw new Error('Schema directory must be specified');
		this.schemaDir = schemaDir;
		this.cache = {}; // In-memory cache for schemas
		this.useGlobalCache = useGlobalCache;
		if (useGlobalCache) this.globalCache = {};
	}

	/**
	 * Load or reload a schema dynamically.
	 * @param {string} schemaName - The name of the schema to load.
	 * @returns {Object} The loaded schema.
	 */
	loadSchema(schemaName) {
		const schemaPath = path.join(process.cwd(), this.schemaDir, `${schemaName}.js`);

		// Invalidate cache for the module
		delete require.cache[require.resolve(schemaPath)];

		// Dynamically load the schema
		const schema = require(schemaPath);

		// Cache the schema in memory
		if (this.useGlobalCache) {
			this.globalCache[schemaName] = schema;
		} else {
			this.cache[schemaName] = schema;
		}

		return schema;
	}

	/**
	 * Get a schema from the cache or load it if not already cached.
	 * @param {string} schemaName - The name of the schema to retrieve.
	 * @returns {Object} The schema object.
	 */
	getSchema(schemaName) {
		if (this.useGlobalCache && this.globalCache[schemaName]) {
			return this.globalCache[schemaName];
		} else {
			if (this.cache[schemaName]) {
				return this.cache[schemaName];
			}
		}

		// If not cached, load the schema
		return this.loadSchema(schemaName);
	}

	/**
	 * Invalidate the cache for a specific schema or all schemas.
	 * @param {string} [schemaName] - The name of the schema to invalidate. If not provided, invalidates all.
	 */
	invalidateCache(schemaName) {
		if (schemaName) {
			delete this.cache[schemaName];
		} else {
			this.cache = {}; // Clear all cache
		}
	}
}

function initializeSchemaManager(schemaDir, useGlobalCache = false) {
	if (!schemaManagerInstance) {
		schemaManagerInstance = new SchemaManager(schemaDir, useGlobalCache);
		global.schemaManager = schemaManagerInstance; // Also set it globally
	}
	return schemaManagerInstance;
}

function getSchemaManager() {
	if (!schemaManagerInstance) {
		throw new Error('SchemaManager has not been initialized. Call `initializeSchemaManager` first.');
	}
	return schemaManagerInstance;
}

module.exports = { initializeSchemaManager, SchemaManager, getSchemaManager };
