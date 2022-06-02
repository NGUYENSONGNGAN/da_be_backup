const app = require('./app');

const dotenv = require('dotenv');
const cloudinary = require('cloudinary');
const connectDB = require('./config/db');

// Handling Uncaught Exception
process.on('uncaughtException', err => {
	console.log(`Error: ${err.message}`);
	console.log(`Shutting down the server due to Unhandled Promise Rejection`);

	process.exit(1);
});

//config
dotenv.config({ path: 'config/config.env' });

// Connecting to DB;
connectDB();

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET
});

const server = app.listen(process.env.PORT, () => {
	console.log(`Server is working on PORT: ${process.env.PORT}`);
});

// Unhandled Promise Reject
process.on('unhandledRejection', err => {
	console.log(`Error: ${err.message}`);
	console.log(`Shutting down the server due to Unhandled Promise Rejection`);

	server.close(() => {
		process.exit(1);
	});
});
