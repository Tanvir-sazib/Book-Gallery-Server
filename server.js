const express = require('express')
require('dotenv').config()
const cors = require('cors')
const bodyParser = require('body-parser')
const ObjectID = require('mongodb').ObjectID
const MongoClient = require('mongodb').MongoClient;
const app = express()

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const admin = require("firebase-admin");

const serviceAccount = require("./book-gallery-ts-firebase-adminsdk-w83yz-6f249cbb70.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const port = process.env.PORT || 5000;

const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;
const dbName = process.env.DB_NAME;

const uri = `mongodb+srv://${dbUser}:${dbPass}@cluster0.tyr4y.mongodb.net/${dbName}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect(err => {
    const booksCollection = client.db(process.env.DB_NAME).collection('books');
    const ordersCollection = client.db(process.env.DB_NAME).collection('orders');

    app.post('/addProduct', (req, res) => {
        const bookData = req.body;
        booksCollection.insertOne(bookData)
            .then(result => {
                console.log(result.insertedCount);
                res.send(result.insertedCount > 0);
            })
    })
    app.get('/products', (req, res) => {
        booksCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            })
    })

    app.get('/product/:id', (req, res) => {
        const id = ObjectID(req.params.id);
        booksCollection.findOne({ _id: id })
            .then(result => {
                res.send(result);
            })
    })

    app.patch('/update/:id', (req, res) => {
        const id = ObjectID(req.params.id);
        const myQuery = { _id: id };
        const newValues = { $set: { name: req.body.name, price: req.body.price, image: req.body.image, author: req.body.author } };
        booksCollection.updateMany(myQuery, newValues)
            .then((result, error) => {
                res.send(result > 1);
            })
    })

    app.get('/checkout/add/:id', (req, res) => {
        const id = ObjectID(req.params.id)
        booksCollection.findOne({ _id: id })
            .then(result => res.send(result))
    })
    app.post('/placeOrder', (req, res) => {
        const newOrder = req.body;
        ordersCollection.insertOne(newOrder)
            .then(result => {

                res.send(result.insertedCount > 0);
            })
    })
    app.get('/orders', (req, res) => {
        const token = req.headers.authorization;
        if (token && token.startsWith('Bearer ')) {
            const idToken = token.split(' ')[1];

            admin.auth()
                .verifyIdToken(idToken)
                .then((decodedToken) => {

                    if (req.query.email == decodedToken.email) {
                        ordersCollection.find({ email: req.query.email })
                            .toArray((err, docs) => {
                                res.send(docs)
                            })

                    } else {
                        res.status(401).send('un-authorized access');
                    }
                    // ...
                })
                .catch((error) => {
                    res.status(401).send('un-authorized access')
                });
        } else {
            res.status(401).send('un-authorized access');
        }

    })

    app.get('/orders/details/:id', (req, res) => {
        const id = ObjectID(req.params.id);
        ordersCollection.findOne({ _id: id })
            .then(result => {
                res.send(result);
            })
            .catch((error) => {
                res.status(401).send('un-authorized access')
            });

    })

    app.delete('/products/delete/:id', (req, res) => {
        const id = ObjectID(req.params.id);
        booksCollection.deleteOne({ _id: id })
            .then(result => res.send(result))

    })

    app.delete('/orders/delete/:id', (req, res) => {
        const id = ObjectID(req.params.id);
        ordersCollection.deleteOne({ _id: id })
            .then(result => res.send(result))


    })


    err ? console.log(err) : console.log('whooo!!! DB Connected!!!');
})


app.get('/', (req, res) => {
    res.send('API is Working.....')
})

app.listen(port, () => {
    console.log(`app listening at http://localhost:${port}`)
})