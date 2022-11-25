//  ------------  Requiring ------------
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

//  ------------  middleware ------------
app.use(cors());
app.use(express.json());

//  ------------  Main section ------------
const uri = `mongodb+srv://${process.env.Mongodb_Username}:${process.env.Mongodb_Password}@cluster0.lf7jbxk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


const run = async () => {

    try {
        //  ------------  MongoDB Collections ------------
        const usersCollection = client.db("mobile_vend").collection("users");


        app.post('/users', async (req, res) => {
            const userInfo = req.body;
            const findQuery = { email: userInfo.email, joinFrom: userInfo.joinFrom }
            const isAvailable = await usersCollection.findOne(findQuery);
            if (isAvailable) {
                console.log(1)
                return { message: 'Users Already Added' }
            }
            const result = await usersCollection.insertOne(userInfo);
            res.send(result);
        })
        app.get('/users', async (req, res) => {
            const users = await usersCollection.find({}).toArray();
            res.send(users);
        })

    }
    finally {
        console.log("successfully done");
    }
}
run().catch(console.dir);





app.get('/', (req, res) => res.send("The mobile vend server is now running"));
app.listen(port, () => console.log(`The mobile vend server is running on ${port} port.`))
