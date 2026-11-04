import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";
import cors from "cors";
import "dotenv/config";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("together_for_good_db");
    const eventsCollection = db.collection("events");

    app.post("/events", async (req, res) => {
      try {
        const event = req.body;

        const result = await eventsCollection.insertOne(event);

        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({
          message: "Failed to create event",
        });
      }
    });

    app.get("/events", async (req, res) => {
      try {
        const events = await eventsCollection.find().toArray();

        res.send(events);
      } catch (error) {
        res.status(500).send({
          message: "Failed to fetch events",
        });
      }
    });

    app.get("/upcoming-events", async (req, res) => {
      try {
        const today = new Date().toISOString().split("T")[0];

        const events = await eventsCollection
          .find({ eventDate: { $gt: today } })
          .sort({ eventDate: 1 })
          .toArray();

        res.send(events);
      } catch (error) {
        res.status(500).send({
          message: "Failed to fetch upcoming events",
        });
      }
    });

    app.get("/recent-events", async (req, res) => {
      try {
        const today = new Date().toISOString().split("T")[0];

        const events = await eventsCollection
          .find({ eventDate: { $gt: today } })
          .sort({ eventDate: 1 })
          .limit(6)
          .toArray();

        res.send(events);
      } catch (error) {
        res.status(500).send({
          message: "Failed to fetch recent events",
        });
      }
    });

    app.get("/events/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            message: "Invalid event ID",
          });
        }

        const event = await eventsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!event) {
          return res.status(404).send({
            message: "Event not found",
          });
        }

        res.send(event);
      } catch (error) {
        res.status(500).send({
          message: "Failed to fetch event",
        });
      }
    });

    await db.command({ ping: 1 });
    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }
}

run();

app.get("/", (req, res) => {
  res.send("TogetherForGood Server is Running!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
