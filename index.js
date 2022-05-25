const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const {
  MongoClient,
  ServerApiVersion,

  ObjectId,
} = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
// Middleware=========
const cors = require("cors");
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.esuee.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// jwt function=============
function varifyJWT(req, res, next) {
  const authheader = req.headers.authorization;
  if (!authheader) {
    return res.status(401).send({ message: "Unauthorize Access" });
  }
  const token = authheader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    console.log(decoded, err);
    if (err) {
      return res.status(403).send({ message: "Access denied" });
    }
    // bar
    req.decoded = decoded;
    next();
  });
}

// Start from here======================
async function run() {
  try {
    await client.connect();
    const groceryCollection = client
      .db("grocery_database")
      .collection("allgroceryproducts");
    const userCollection = client.db("grocery_database").collection("users");
    const cartCollection = client.db("grocery_database").collection("cart");
    app.get("/products", async (req, res) => {
      const query = {};
      const products = await groceryCollection.find(query).toArray();
      res.send(products);
    });
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;

      const user = req.body;
      console.log(user);
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      var token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "30d",
      });

      res.send({ result, token });
    });

    //  make admin start==================
    app.put("/user/admin/:email", varifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      console.log("this is requester", requester, email);
      const requestAccount = await userCollection.findOne({ email: requester });
      if (requestAccount.role === "admin") {
        const filter = { email: email };

        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);

        res.send(result);
      } else {
        return res.status(403).send({ message: "Access denied" });
      }
    });
    //  make admin  end==================

    // admin route protection start===================

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;

      const user = await userCollection.findOne({ email: email });
      console.log("this is 101 line", user);
      const isAdmin = user?.role === "admin";

      res.send(isAdmin);
    });

    // admin route protection end===================

    app.get("/user", varifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    // Cart section=================

    app.post("/cart", async (req, res) => {
      const cart = req.body;
      const result = await cartCollection.insertOne(cart);
      res.send(result);
    });
    app.get("/cart", varifyJWT, async (req, res) => {
      // const authorization = req.headers.authorization;
      // console.log(authorization);
      const email = req.query.email;
      // console.log("from get cart", email);
      const decodedemail = req.decoded.email;
      // console.log("deeeeeee", decodedemail);
      if (email === decodedemail) {
        // console.log("inside if");
        const result = await cartCollection.find({}).toArray();
        // console.log(result);
        return res.send(result);
      } else {
        // console.log("insideelse");
        return res.status(403).send({ message: "forbidden access" });
      }
    });

    // Cart section end=================

    // delete api===================

    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // delete api===================
  } finally {
  }
}
run().catch(console.dir);

// End here==============================

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server is running Bro ${port}`);
});
