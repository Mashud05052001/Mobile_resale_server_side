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
        const orderCollections = client.db('mobile_vend').collection('order_collections');
        const wiselistCollection = client.db('mobile_vend').collection('wiselist_collections');

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

        //partially update 
        // app.get('/allPhones', async (req, res) => {
        //     const result = await mobileCollections.updateMany({}, { $set: { categoryId: "6380e692345d495b77482fb9" } }, { upsert: true });
        //     res.send(result);
        // })
        // app.get('/updatePhones', async (req, res) => {
        //     const result = await mobileCollections.updateMany({}, { $set: { promoteStatus: false } }, { upsert: true });
        //     res.send(result);
        // })



        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const token = jwt.sign({ email: email }, process.env.Jwt_Random_Bytes, { expiresIn: '1d' });
            res.send({ token });
        })


        /*
        ____________________________________________________

                            Users section
                
        ____________________________________________________
        */


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
            const id = req.query.id;
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

            if (id) {
                const user = await usersCollection.findOne({ _id: ObjectId(id) });
                res.send(user);
                return;
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

        /*
        ____________________________________________________

                        Category section
        
        ____________________________________________________
        */


        app.get('/categories', async (req, res) => {
            const result = await mobileCategories.find({}).toArray();
            res.send(result);
        })


        /*
        ____________________________________________________

                            All Phone section
                
        ____________________________________________________
        */


        app.post('/allPhones', verifyJwt, verifyRole, async (req, res) => {
            const phoneInfo = req.body;
            if (req?.role === 'seller') {
                const result = await mobileCollections.insertOne(phoneInfo);
                res.send(result);
            }
        })
        app.get('/allPhones', async (req, res) => {
            const userId = req.query.id;
            const condition = req.query.condition;
            if (userId) {
                const result = await mobileCollections.find({ sellerDbId: userId }).toArray();
                res.send(result);
                return;
            }
            if (condition === 'report') {
                const result = await mobileCollections.find({ report: { $ne: "0" } }).toArray();
                res.send(result);
                return;
            }
            const result = await mobileCollections.find({}).toArray();
            res.send(result);
        })
        app.patch('/allPhones', async (req, res) => {
            const id = req.query.id;
            const promot = req.query.promot;
            if (promot) {
                console.log(promot);
                const result = await mobileCollections.updateOne({ _id: ObjectId(promot) }, { $set: { promoteStatus: true } })
                res.send(result);
                return;
            }
            const findOneItem = await mobileCollections.findOne({ _id: ObjectId(id) })
            const count = JSON.stringify(parseInt(findOneItem.report) + 1);
            // console.log(typeof (count))
            const result = await mobileCollections.updateOne({ _id: ObjectId(id) }, { $set: { report: count } })
            res.send(result);

        })
        app.delete('/allPhones', verifyJwt, verifyRole, async (req, res) => {
            const phoneId = req.query.id;
            if (phoneId && (req?.role === 'seller' || req?.role === 'admin')) {
                console.log(1)
                const result = await mobileCollections.deleteOne({ _id: ObjectId(phoneId) });
                res.send(result);

            }
        })

        /*
        ____________________________________________________

                Single Phone & Single Category section
                
        ____________________________________________________
        */


        app.get('/singleCategory/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const result = await mobileCollections.find({ categoryId: id }).toArray();
            res.send(result);
        })
        app.get('/singlePhone/:id', async (req, res) => {
            const phoneId = req.params.id;
            const result = await mobileCollections.findOne({ _id: ObjectId(phoneId) });
            res.send(result);

        })

        /*
        ____________________________________________________

                          Orders section
                
        ____________________________________________________
        */
        app.post('/orders', verifyJwt, async (req, res) => {
            const orderData = req.body;
            const query = {
                userId: orderData?.userId,
                phoneId: orderData?.phoneId,
            }
            const isAvailable = await orderCollections.findOne(query);
            if (isAvailable) {
                res.send({ message: "alreadyAdded" });
                return;
            }
            const result = await orderCollections.insertOne(orderData);
            res.send(result);
        })
        app.get('/orders', verifyJwt, async (req, res) => {
            const userId = req.query.id;
            const orders = await orderCollections.find({ userId: userId }).toArray();
            res.send(orders);
        })
        app.delete('/orders', verifyJwt, async (req, res) => {
            const id = req.query.id;
            console.log(id)
            const result = await orderCollections.deleteOne({ _id: ObjectId(id) });
            res.send(result);
        })

        /*
        ____________________________________________________

                        WiseList section
        
        ____________________________________________________
        */


        app.post('/wiseList', verifyJwt, async (req, res) => {
            const wiseListData = req.body;
            console.log(wiseListData);
            const query = {
                userId: wiseListData?.userId,
                phoneId: wiseListData?.phoneId,
            }
            const isAvailable = await wiselistCollection.findOne(query);
            if (isAvailable) {
                res.send({ message: "alreadyAdded" });
                return;
            }
            const result = await wiselistCollection.insertOne(wiseListData);
            res.send(result);
        })
        app.get('/wiseList', verifyJwt, async (req, res) => {
            const userId = req.query.id;
            const wiseListItems = await wiselistCollection.find({ userId: userId }).toArray();
            res.send(wiseListItems);
        })
        app.delete('/wiseList', verifyJwt, async (req, res) => {
            const id = req.query.id;
            const result = await wiselistCollection.deleteOne({ _id: ObjectId(id) });
            res.send(result);
        })


    }
    finally {
        console.log("successfully done");
    }
}
run().catch(console.dir);





app.get('/', (req, res) => res.send("The mobile vend server is now running"));
app.listen(port, () => console.log(`The mobile vend server is running on ${port} port.`))
