const bcrypt = require('bcryptjs');

const hash = '$2a$10$fK5mTmvZ0QdguWiqzVadeu4u2ESH7qKY2B2XevcTn5wFa0zCjRIV6';
bcrypt.compare('admin123', hash, (err, res) => {
    console.log("Is it admin123?", res);
});
