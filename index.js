const express = require('express')
const cors = require('cors')
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const admin = require("firebase-admin");
const port =process.env.PORT || 3000;





// const serviceAccount = require("./garments-production-firebase-adminsdk.json");


const verifyFirebaseToken = async(req,res,next)=>{
  if(!req.headers.authorization){
    return res.status(401).send({message:'unauthorized access'})
  }
  const token = req.headers.authorization.split(' ')[1];
  if(!token){
    return res.status(401).send({message:'unauthorized access'})
  }

  try{
const userInfo = await admin.auth().verifyIdToken(token);
console.log('after token validation',userInfo)
  }catch{
return res.status(401).send({message:'unauthorized access'})
  }

  next();
}


// const serviceAccount = require("./firebase-admin-key.json");

// const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
// const serviceAccount = JSON.parse(decoded);

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

const { ObjectId } = require('mongodb');

// middleware

app.use(express.json());
app.use(cors());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.unwug6n.mongodb.net/?appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

const db = client.db('garments_order_db');
const productsCollections = db.collection('products');
const usersCollections = db.collection('users');
const ordersCollections = db.collection('orders');

// user api

app.get("/users", async (req, res) => {
  const users = await usersCollections.find().toArray();
  res.send(users);
});

app.post("/users", async (req, res) => {
  const user = req.body;
  const { email } = user;

  const existingUser = await usersCollections.findOne({ email });
  if (existingUser) {
    return res.send({ message: "User already exists" });
  }

  const newUser = {
    ...user,
    status: "pending",
    createdAt: new Date()
  };

  const result = await usersCollections.insertOne(newUser);
  res.send(result);
});



app.get('/users/role/:email', async (req, res) => {
  const email = req.params.email;
  const user = await usersCollections.findOne({ email });

  res.send({ role: user?.role || 'buyer' });
});

app.patch("/users/role/:id", async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const result = await usersCollections.updateOne(
    { _id: new ObjectId(id) },
    { $set: { role } }
  );

  res.send(result);
});




// products api

app.post('/products', async (req, res) => {
  try {
    const product = req.body;
    product.createdAt = new Date();

    const result = await productsCollections.insertOne(product);
    res.send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Product insert failed" });
  }
});

// Get single product by ID
app.get('/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const product = await productsCollections.findOne({ _id: new ObjectId(id) });

    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }

    res.send(product);
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Failed to fetch product" });
  }
});
  


app.get('/products', async (req, res) => {
  const result = await productsCollections.find().toArray();
  res.send(result);
});


app.get('/products/manager/:email', async (req, res) => {
  const email = req.params.email;

  const result = await productsCollections
    .find({ managerEmail: email })
    .toArray();

  res.send(result);
});


app.put('/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updatedProduct = req.body;

    const result = await productsCollections.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedProduct }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).send({ message: "Product not found or no changes made" });
    }

    res.send({ message: "Product updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Update failed" });
  }
});

// delete route
app.delete('/products/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const result = await productsCollections.deleteOne({
      _id: new ObjectId(id), 
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Product not found" });
    }

    res.send({ message: "Product deleted successfully", result });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to delete product" });
  }
});

app.patch("/products/home/:id", async (req, res) => {
  const id = req.params.id;
  const { showOnHome } = req.body;

  await productsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { showOnHome } }
  );

  res.send({ success: true });
});


// orders api(Create Order (Buyer)


app.get("/orders", async (req, res) => {
  const email = req.query.email;

  const orders = await ordersCollections
    .find({ email: email }) 
    .toArray();

  res.send(orders);
});


app.get("/orders/admin", async (req, res) => {
  const orders = await ordersCollection.find().toArray();
  res.send(orders);
});



app.post('/orders', async (req, res) => {
  const order = req.body;
  order.status = 'Pending';
  order.createdAt = new Date();

  const result = await ordersCollections.insertOne(order);
  res.send(result);
});

// Pending Orders (Manager)

app.get('/orders/pending', async (req, res) => {
  const result = await ordersCollections
    .find({ status: 'Pending' })
    .toArray();

  res.send(result);
});

// approve order
app.patch('/orders/approve/:id', async (req, res) => {
  const id = req.params.id;

  const result = await ordersCollections.updateOne(
    { _id: new require('mongodb').ObjectId(id) },
    {
      $set: {
        status: 'Approved',
        approvedAt: new Date(),
      },
    }
  );

  res.send(result);
});
// reject order

app.patch('/orders/reject/:id', async (req, res) => {
  const id = req.params.id;

  const result = await ordersCollections.updateOne(
    { _id: new require('mongodb').ObjectId(id) },
    { $set: { status: 'Rejected' } }
  );

  res.send(result);
});
// Add Tracking (Approved Orders)

app.patch('/orders/tracking/:id', async (req, res) => {
  const id = req.params.id;
  const tracking = req.body;

  const result = await ordersCollections.updateOne(
    { _id: new require('mongodb').ObjectId(id) },
    { $push: { tracking } }
  );

  res.send(result);
});




    
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('garments-order-system-running')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
