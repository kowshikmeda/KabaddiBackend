const express = require('express');
const app = express();
const PORT = 8080;

app.get('/', (req, res) => {
    res.send('Server is running on port 8080\n');
});

app.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`);
});
