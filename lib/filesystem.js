const fs = require('fs');
const path = require('path');
const fsPromise = require('fs/promises');

/**
 * Checks if a directory exists at the specified path.
 *
 * @param {string} path - The directory path to check.
 * @returns {boolean} `true` if the directory exists, otherwise `false`.
 *
 * @example
 * const exists = checkDIR('./myFolder');
 * console.log(exists); // Outputs: true or false
 */
const checkDIR = (path) => {
	try {
		if (fs.existsSync(path)) {
			return true;
		}
		return false;
	} catch (err) {
		throw new Error(err.stack);
	}
};

/**
 * Creates a directory (and parent directories, if necessary) at the specified path.
 *
 * @param {string} path - The directory path to create.
 * @returns {boolean} Always returns `true` after creating the directory.
 *
 * @throws {Error} If directory creation fails.
 *
 * @example
 * createDIR('./newFolder');
 */
const createDIR = (path) => {
	try {
		fs.mkdir(`${path}`, { recursive: true }, (err) => {
			if (err) throw err;
		});
		return true;
	} catch (err) {
		throw new Error(err.stack);
	}
};

/**
 * Reads all files from a directory.
 *
 * @param {string} folder - The folder path to read files from.
 * @returns {string[]} An array of filenames in the directory.
 *
 * @throws {Error} If reading the directory fails.
 *
 * @example
 * const files = readFilesFromDir('./myFolder');
 * console.log(files); // Outputs: ['file1.txt', 'file2.js']
 */
const readFilesFromDir = (folder) => {
	try {
		return fs.readdirSync(folder, (err, files) => {
			return files;
		});
	} catch (err) {
		throw new Error(err.stack);
	}
};

/**
 * Retrieves metadata about a directory or file, including size and timestamps.
 *
 * @async
 * @param {string} folder - The folder or file path to retrieve stats for.
 * @returns {Promise<object>} An object containing metadata:
 * - `folder` (boolean): Whether the path is a directory.
 * - `size` (number): The size in bytes.
 * - `ctime` (Date): The creation time.
 * - `mtime` (Date): The modification time.
 *
 * @throws {Error} If the path does not exist or retrieving stats fails.
 *
 * @example
 * const stats = await getStats('./myFolder');
 * console.log(stats); // Outputs: { folder: true, size: 2048, ctime: ..., mtime: ... }
 */
const getStats = async (folder) => {
	try {
		const stats = fs.lstatSync(folder);
		// var size = stats.size // Only gets the size of files
		const size = await getSize(folder);

		return {
			folder: stats.isDirectory(),
			size,
			ctime: new Date(stats.ctime.getTime()),
			mtime: new Date(stats.mtime.getTime()),
		};
	} catch (err) {
		throw new Error(err.stack);
	}
};

/**
 * Recursively calculates the total size of a directory.
 *
 * @async
 * @param {string} dirPath - The directory path to calculate size for.
 * @returns {Promise<number>} The total size in bytes.
 *
 * @throws {Error} If the directory does not exist or an error occurs during size calculation.
 *
 * @example
 * const size = await getSize('./myFolder');
 * console.log(size); // Outputs: 10240
 */
async function getSize(dirPath) {
	return getStat(dirPath).then(function (stat) {
		if (stat.isFile()) {
			// if file return size directly
			return stat.size;
		} else {
			return getFiles(dirPath)
				.then(function (files) {
					// getting list of inner files
					const promises = files
						.map(function (file) {
							return path.join(dirPath, file);
						})
						.map(getSize); // recursively getting size of each file
					return Promise.all(promises);
				})
				.then(function (childElementSizes) {
					// success callback once all the promise are fullfiled i. e size is collected
					let dirSize = 0;
					childElementSizes.forEach(function (size) {
						// iterate through array and sum things
						dirSize += size;
					});
					return dirSize;
				});
		}
	});
}

/**
 * Retrieves the file system statistics for a specified file or directory.
 *
 * @param {string} filePath - The path to the file or directory to get statistics for.
 * @returns {Promise<fs.Stats>} A promise that resolves to an `fs.Stats` object containing the file or directory information.
 *
 * @throws {Error} If retrieving the statistics fails.
 *
 * @example
 * getStat('./myFolder/file.txt').then(stat => {
 *   console.log(stat.isFile()); // Outputs: true or false
 * }).catch(err => {
 *   console.error(err);
 * });
 */
function getStat(filePath) {
	return new Promise(function (resolve, reject) {
		fs.lstat(filePath, function (err, stat) {
			if (err) return reject(err);
			resolve(stat);
		});
	});
}

/**
 * Retrieves the list of files in a specified directory.
 *
 * @param {string} dir - The directory path to read files from.
 * @returns {Promise<string[]>} A promise that resolves to an array of filenames in the directory.
 *
 * @throws {Error} If reading the directory fails.
 *
 * @example
 * getFiles('./myFolder').then(files => {
 *   console.log(files); // Outputs: ['file1.txt', 'file2.js']
 * }).catch(err => {
 *   console.error(err);
 * });
 */
function getFiles(dir) {
	return new Promise(function (resolve, reject) {
		fs.readdir(dir, function (err, stat) {
			if (err) return reject(err);
			resolve(stat);
		});
	});
}

/**
 * Checks if files with a specific extension exist in a directory (and its subdirectories).
 *
 * @param {string} startPath - The directory path to search in.
 * @param {string|RegExp} filter - The file extension (e.g., `.txt`) or a regular expression to match filenames.
 * @returns {boolean} `true` if at least one file matches, otherwise `false`.
 *
 * @example
 * const exists = filesExist('./myFolder', '.txt');
 * console.log(exists); // Outputs: true or false
 */
const filesExist = (startPath, filter) => {
	try {
		if (typeof filter === 'string') filter = new RegExp(`\\${filter}$`);

		if (!fs.existsSync(startPath)) {
			// console.log("no dir ",startPath);
			return false;
		}
		const files = fs.readdirSync(startPath);

		for (let i = 0; i < files.length; i++) {
			const filename = path.join(startPath, files[i]);
			// console.log(filename)
			const stat = fs.lstatSync(filename);
			if (stat.isDirectory()) {
				filesExist(filename, filter); // recurse
			} else if (filter.test(filename)) return true;
		}
	} catch (err) {
		throw new Error(err.stack);
	}
};

/**
 * Deletes all files within a specified directory.
 *
 * @async
 * @param {string} dir - The directory path to clean.
 * @returns {Promise<void>} Resolves after the directory is cleaned.
 *
 * @throws {Error} If reading or deleting files fails.
 *
 * @example
 * await cleanDirectory('./myFolder');
 */
const cleanDirectory = async (dir) => {
	try {
		await fs.promises.readdir(dir).then((f) => Promise.all(f.map((e) => fs.promises.unlink(`${dir}${e}`))));
	} catch (err) {
		throw new Error(err.stack);
	}
};

/**
 * Deletes a single file at the specified path.
 *
 * @async
 * @param {string} path - The file path to delete.
 * @returns {Promise<void>} Resolves after the file is deleted.
 *
 * @throws {Error} If the file does not exist or deletion fails.
 *
 * @example
 * await deleteOneFile('./myFolder/file.txt');
 */
const deleteOneFile = async (path) => {
	try {
		if (fs.existsSync(path)) {
			fs.unlinkSync(path);
		}
	} catch (err) {
		throw new Error(err.stack);
	}
};

/**
 * Reads the contents of a file.
 *
 * @async
 * @param {string} filePath - The file path to read.
 * @param {string} [encoding='utf8'] - The encoding to use when reading the file.
 * @returns {Promise<string|Buffer>} Resolves with the file contents as a string or Buffer.
 *
 * @throws {Error} If reading the file fails.
 *
 * @example
 * const fileText = await readFile('./myFolder/file.txt');
 * console.log(fileText); // Outputs the file contents
 */

const readFile = async (filePath, encoding = 'utf8') => {
	try {
		return await fsPromise.readFile(filePath, { encoding });
	} catch (err) {
		throw new Error(err.stack);
	}
};

/**
 * Writes data to a file, overwriting existing content.
 *
 * @param {string} path - The file path to write to.
 * @param {string|Buffer} data - The data to write to the file.
 * @returns {void}
 *
 * @throws {Error} If writing to the file fails.
 *
 * @example
 * writeFile('./myFolder/file.txt', 'Hello, world!');
 */
const writeFile = (path, data) => {
	try {
		fs.writeFileSync(path, data);
	} catch (err) {
		throw new Error(err.stack);
	}
};

/**
 * Reads the specified files from a given directory and returns an object with file names as keys and their contents as values.
 *
 * @param {string} directory - The directory path where the files are located.
 * @param {string[]} [filenames=[]] - An array of filenames to read from the directory.
 * @returns {Promise<object>} An object containing the contents of each specified file, keyed by file name (without extension).
 *
 * @example
 * const contents = await readSpecifiedFiles('./myFolder', ['file1.txt', 'file2.js']);
 * console.log(contents); // Outputs: { file1: 'Content of file1', file2: 'Content of file2' }
 */
const readSpecifiedFiles = async (directory, filenames = []) => {
	try {
		if (!directory) return [];

		const fileData = await Promise.all(
			filenames.map(async (filename) => {
				const filePath = path.join(directory, filename);
				const content = await fsPromise.readFile(filePath, 'utf8');
				const name = filename.split('.')[0]; // Extract the filename without extension
				return { name, content };
			})
		);

		// Convert the array of { name, content } to an object
		return fileData.reduce((acc, { name, content }) => {
			acc[name] = content;
			return acc;
		}, {});
	} catch (err) {
		throw new Error(`Error reading specified files: ${err.stack}`);
	}
};

/**
 * Synchronous version of readFile. Reads the contents of a file.
 *
 * @param {string} path - The file path to read.
 * @param {string} [encoding='utf8'] - The encoding to use when reading the file.
 * @returns {string|Buffer} The file contents as a string or Buffer.
 *
 * @throws {Error} If reading the file fails.
 *
 * @example
 * const fileText = readFileSync('./myFolder/file.txt');
 * console.log(fileText); // Outputs the file contents
 */
const readFileSync = (path, encoding = 'utf8') => {
	try {
		return fs.readFileSync(path, encoding);
	} catch (err) {
		throw new Error(err.stack);
	}
};

/**
 * Checks if a specific file exists, either by full path or by combining a folder and filename.
 *
 * @param {string} basePath - The base path (can be a folder or full file path).
 * @param {string} [fileName] - The name of the file (if `basePath` is a folder).
 * @returns {boolean} `true` if the file exists and is a file, otherwise `false`.
 */
const fileExist = (basePath, fileName) => {
	try {
		const fullPath = fileName ? path.join(basePath, fileName) : basePath;
		const stats = fs.lstatSync(fullPath);

		// Return true only if it's a file
		return stats.isFile();
	} catch (err) {
		// Path does not exist or error occurred
		return false;
	}
};

/**
 * Generates a dynamic file name by appending the current timestamp to the original file name.
 *
 * @param {object} file - The file object containing the original name.
 * @param {string} file.originalname - The original name of the file including its extension.
 * @returns {string} A new file name with the format: "originalName<timestamp>.extension".
 *
 * @example
 * const file = { originalname: 'image.jpg' };
 * const newFileName = dynamicFileName(file);
 * newFileName could be something like 'image1617123456789.jpg'
 */
const dynamicFileName = file => {
	// Extract base name and extension
  const parsed = path.parse(file.originalname);
  const name = parsed.name || 'unnamed'; // Fallback if no name
  const extension = parsed.ext ? parsed.ext.slice(1) : ''; // Remove leading dot, empty if no extension

  // Sanitize name (remove unsafe characters for S3)
  const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '-');

  // Build filename with timestamp
  return extension
    ? `${sanitizedName}${Date.now()}.${extension}`
    : `${sanitizedName}${Date.now()}`;

	// const [name, extension] = file.originalname.split('.');
	// return `${name}${Date.now()}.${extension}`;
};

/**
 * Constructs a file path for storage based on user information and folder structure.
 *
 * It is a factory function that returns a function that takes a request and file object as arguments.
 *
 * @param {Object} options - Configuration options for file path construction.
 * @param {string} options.baseFolder - The base directory for storing files.
 * @param {string} [options.subFolder] - Optional subdirectory within the base folder.
 * @returns {Function} A function that takes a request and file object, and returns a dynamic file path.
 *
 * The generated path format: `{baseFolder}/{userPrefix}/{subFolder}/{fileName}`.
 * - If `req.user._id` exists, `userPrefix` is `{userId}`.
 * - Otherwise, it uses an anonymized IP: `anon_{sanitizedIp}`.
 *
 * @example
 * const buildPath = storageFilePathBuilder({ baseFolder: 'uploads', subFolder: 'images' });
 * const path = buildPath(req, file); // Outputs a path like 'uploads/user_123/images/fileName123456.jpg'
 */
const storageFilePathBuilder = ({ baseFolder, subFolder = null }) => {
	return (req, file) => {
		let keyname = dynamicFileName(file);
		const userPrefix = req.user && req.user._id ? `${req.user._id}` : `anon_${req.ip.replace(/[\.:]/g, '_')}`; // Sanitize IP

		keyname = subFolder
			? `${baseFolder}/${userPrefix}/${subFolder}/${keyname}`
			: `${baseFolder}/${userPrefix}/${keyname}`;
		return keyname;
	};
};

const resolvePath = path.resolve;

const joinPath = path.join;


module.exports = {
	joinPath,
	readFile,
	getStats,
	checkDIR,
	fileExist,
	writeFile,
	createDIR,
	filesExist,
	resolvePath,
	readFileSync,
	deleteOneFile,
	cleanDirectory,
	dynamicFileName,
	readFilesFromDir,
	readSpecifiedFiles,
	storageFilePathBuilder,
};
