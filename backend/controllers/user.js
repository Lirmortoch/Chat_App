const bcrypt = require("bcrypt");
const UsersRouter = require("express").Router();

const postgreSql = require("../db.js");

const config = require("../utils/config.js");

UsersRouter.get("/", async (request, response) => {
  try {
    const users = await postgreSql`
    SELECT public_id, email, name
    FROM users
  `;

    response.json(users);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: "Internal server error" });
  }
});
UsersRouter.get("/:public_id", async (request, response) => {
  try {
    const [user] = await postgreSql`
      SELECT * FROM users WHERE public_id = ${request.params["public_id"]}
    `;

    if (!user) {
      return response.status(404).json({ message: "User not found" });
    }

    response.json(user);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
});

UsersRouter.post("/", async (request, response) => {
  try {
    const { name, username, password, email, phoneNumber, role } = request.body;

    if (!password || !email) {
      return response.status(400).json({ message: "Missing required fields" });
    }

    const saltRounds = config.SALT_ROUNDS;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const insertedUser = await postgreSql`
      INSERT INTO users (
        name,
        username,
        password_hash,
        email,
        phone_number,
        created_at,
        deleted,
        restricted,
        role
      )
      VALUES (
        ${name},
        ${username},
        ${passwordHash},
        ${email},
        ${phoneNumber},
        now(),
        false,
        false,
        ${role}
      )
      RETURNING public_id, email, name
    `;

    response.status(201).json(insertedUser);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
});

UsersRouter.put("/:public_id", async (request, response) => {
  try {
    const { field, fieldData } = request.body;

    const updatedUser = await postgreSql`
      UPDATE users
      SET ${field} = ${fieldData}
      WHERE public_id = ${request.params["public_id"]}
      RETURNING public_id
    `;

    response.status(201).json(updatedUser);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
});

UsersRouter.delete("/:public_id", async (request, response) => {
  try {
    const deletedUser = await postgreSql`
      DELETE CASCADE from users 
      WHERE public_id = ${request.params["public_id"]}
      RETURNING public_id
    `;

    if (deletedUser.length === 0) {
      return response.status(404).json({ message: "User not found" });
    }

    response.status(201).json(deletedUser);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
});

module.exports = UsersRouter;
