const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());

const db = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "",
	database: "peminjaman_buku",
});

db.connect((err) => {
	if (err) throw err;
	console.log("Database connected!");
});

// Sign Up endpoint
app.post("/signup", (req, res) => {
	const { username, password, access_level } = req.body;
	const hashedPassword = bcrypt.hashSync(password, 8);

	db.query(
		"INSERT INTO users (username, password, access_level) VALUES (?, ?, ?)",
		[username, hashedPassword, 0],
		(err, result) => {
			if (err) return res.status(500).send("Server error");
			res.status(201).send("User registered");
		}
	);
});

app.post("/signup_admin", (req, res) => {
	const { username, password, access_level } = req.body;
	const hashedPassword = bcrypt.hashSync(password, 8);

	db.query(
		"INSERT INTO users (username, password, access_level) VALUES (?, ?, ?)",
		[username, hashedPassword, 1],
		(err, result) => {
			if (err) return res.status(500).send("Server error");
			res.status(201).send("User registered");
		}
	);
});

// Login endpoint
app.post("/login", (req, res) => {
	const { username, password } = req.body;

	db.query(
		"SELECT * FROM users WHERE username = ?",
		[username],
		(err, results) => {
			if (err) return res.status(500).send("Server error");
			if (results.length === 0) return res.status(404).send("User not found");

			const user = results[0];
			const passwordIsValid = bcrypt.compareSync(password, user.password);

			if (!passwordIsValid) return res.status(401).send("Invalid password");

			res.status(200).send({
				id: user.id,
				username: user.username,
				access_level: user.access_level,
			});
		}
	);
});

// Add Book endpoint with access level verification
app.post("/add-book", (req, res) => {
	const { title, author } = req.body;

	db.query(
		"INSERT INTO books (title, author, available) VALUES (?, ?, true)",
		[title, author],
		(err, result) => {
			if (err) return res.status(500).send("Server error");
			res.status(201).send("Book added");
		}
	);
});

app.get("/books", (req, res) => {
	db.query("SELECT * FROM books", (err, results) => {
		if (err) return res.status(500).send("Server error");
		res.status(200).json(results);
	});
});

// Get Available Books endpoint
app.get("/available_books", (req, res) => {
	db.query("SELECT * FROM books WHERE available = true", (err, results) => {
		if (err) return res.status(500).send("Server error");
		res.status(200).json(results);
	});
});

// Borrow Book endpoint
app.post("/borrow", (req, res) => {
	const { nrp_peminjam, book_id } = req.body;

	// Check if the book is available
	db.query(
		"SELECT * FROM books WHERE id = ? AND available = true",
		[book_id],
		(err, results) => {
			if (err) return res.status(500).send("Server error");
			if (results.length === 0)
				return res.status(404).send("Book not available for borrowing");

			// Proceed with borrowing if book is available
			db.query(
				"UPDATE books SET available = false WHERE id = ?",
				[book_id],
				(err, result) => {
					if (err) return res.status(500).send("Server error");

					db.query(
						"INSERT INTO borrow_records (nrp_peminjam, book_id) VALUES (?, ?)",
						[nrp_peminjam, book_id],
						(err, result) => {
							if (err) return res.status(500).send("Server error");
							res.status(201).send("Book borrowed");
						}
					);
				}
			);
		}
	);
});

// Return Book endpoint
app.post("/return", (req, res) => {
	const { nrp_peminjam, book_id } = req.body;

	db.query(
		"UPDATE books SET available = true WHERE id = ?",
		[book_id],
		(err, result) => {
			if (err) return res.status(500).send("Server error");

			db.query(
				"UPDATE borrow_records SET returned_at = NOW() WHERE nrp_peminjam = ? AND book_id = ? AND returned_at IS NULL",
				[nrp_peminjam, book_id],
				(err, result) => {
					if (err) return res.status(500).send("Server error");
					res.status(200).send("Book returned");
				}
			);
		}
	);
});

app.delete("/delete-book/:bookId", (req, res) => {
	const { bookId } = req.params;

	db.query("DELETE FROM books WHERE id = ?", [bookId], (err, result) => {
		if (err) return res.status(500).send("Server error");
		res.status(200).send("Book deleted");
	});
});

app.get("/borrow_records", (req, res) => {
	db.query(
		"SELECT * FROM borrow_records ORDER BY borrowed_at DESC",
		(err, results) => {
			if (err) return res.status(500).send("Server error");
			res.status(200).json(results);
		}
	);
});

// Logout endpoint (optional for stateless APIs)
app.post("/logout", (req, res) => {
	res.status(200).send("Logged out successfully");
});

app.listen(3000, () => {
	console.log("Server is running on port 3000");
});
