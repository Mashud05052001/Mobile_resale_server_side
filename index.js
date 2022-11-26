//  ------------  Requiring ------------
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;



//  ------------  middleware ------------
app.use(cors());
app.use(express.json());
const verifyJwt = (req, res, next) => {
    const headerInfo = req.headers.authorization;
    if (!headerInfo) {
        return res.status(401).send({ message: "unauthorized access" })
    }
    const token = headerInfo.split(' ')[1];
    jwt.verify(token, process.env.Jwt_Random_Bytes, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: "unauthorized access" })
        }
        req.decoded = decoded;
        next();
    })
}


//  ------------  Main section ------------
const uri = `mongodb+srv://${process.env.Mongodb_Username}:${process.env.Mongodb_Password}@cluster0.lf7jbxk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


const run = async () => {

    try {
        //  ------------  MongoDB Collections ------------
        const usersCollection = client.db("mobile_vend").collection("users");
        const mobileCategories = client.db('mobile_vend').collection('mobile_categories');
        const mobileCollections = client.db('mobile_vend').collection('mobile_collections');

        // middleware
        const verifyRole = async (req, res, next) => {
            const email = req?.decoded?.email;
            const user = await usersCollection.findOne({ email: email });
            if (user?.role === 'admin') {
                req.role = "admin";
            }
            if (user?.role === 'seller') {
                req.role = "seller";
            }
            next();
        }



        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const token = jwt.sign({ email: email }, process.env.Jwt_Random_Bytes, { expiresIn: '1d' });
            res.send({ token });
        })

        app.post('/users', async (req, res) => {
            const userInfo = req.body;
            const email = userInfo?.email;
            const findQuery = { email: userInfo.email, joinFrom: userInfo.joinFrom }
            const isAvailable = await usersCollection.findOne(findQuery);
            if (isAvailable) {
                return { message: 'Users Already Added' }
            }
            const result = await usersCollection.insertOne(userInfo);
            res.send({ result, email });
        })
        app.get('/users', verifyJwt, verifyRole, async (req, res) => {
            const email = req.query.email, joinfrom = req.query.joinfrom;
            if (req?.query?.need) {
                if (req?.role === 'admin' && req?.query?.need === 'seller') {
                    const sellers = await usersCollection.find({ role: 'seller' }).toArray();
                    res.send(sellers);
                    return;
                }
                if (req?.role === 'admin' && req?.query?.need === 'buyer') {
                    const sellers = await usersCollection.find({ role: 'buyer' }).toArray();
                    res.send(sellers);
                    return;
                }
            }
            if (email && joinfrom) {
                const user = await usersCollection.findOne({ $and: [{ email: email }, { joinFrom: joinfrom }] })
                res.send(user);
                return;
            }
            const users = await usersCollection.find({}).toArray();
            res.send(users);
        })
        app.delete('/users', verifyJwt, verifyRole, async (req, res) => {
            const id = req.query.id;
            const result = await usersCollection.deleteOne({ _id: ObjectId(id) });
            res.send(result);
        })
        app.put('/users', verifyJwt, verifyRole, async (req, res) => {
            const query = { _id: ObjectId(req.query.id) };
            const updateItem = { $set: { status: 'verified' } }
            const result = await usersCollection.updateOne(query, updateItem);
            res.send(result);
        })
        app.get('/categories', async (req, res) => {
            const result = await mobileCategories.find({}).toArray();
            res.send(result);
        })
        app.post('/allPhones', verifyJwt, verifyRole, async (req, res) => {
            const phoneInfo = req.body;
            if (req?.role === 'seller') {
                const result = await mobileCollections.insertOne(phoneInfo);
                res.send(result);
            }
        })
        app.get('/allPhones', verifyJwt, async (req, res) => {
            const userId = req.query.id;

            if (userId) {
                const result = await mobileCollections.find({ sellerDbId: userId }).toArray();
                res.send(result);
                return;
            }
            const result = await mobileCollections.find({}).toArray();
            res.send(result);
        })
        app.delete('/allPhones', verifyJwt, verifyRole, async (req, res) => {
            const phoneId = req.query.id;
            if (phoneId && (req?.role === 'seller' || req?.role === 'admin')) {
                const result = await mobileCollections.deleteOne({ _id: ObjectId(phoneId) });
                res.send(result);

            }
        })


    }
    finally {
        console.log("successfully done");
    }
}
run().catch(console.dir);





app.get('/', (req, res) => res.send("The mobile vend server is now running"));
app.listen(port, () => console.log(`The mobile vend server is running on ${port} port.`))
