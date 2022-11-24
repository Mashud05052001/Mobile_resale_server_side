//  ------------  Requiring ------------
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

//  ------------  middleware ------------
app.use(cors());
app.use(express.json());





//  ------------  Main section ------------









app.get('/', (req, res) => res.send("The mobile vend server is now running"));
app.listen(port, () => console.log(`The mobile vend server is running on ${port} port.`))
