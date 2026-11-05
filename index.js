import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";
import cors from "cors";
import "dotenv/config";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const authUrl = process.env.BETTER_AUTH_URL;

if (!authUrl) {
  throw new Error("BETTER_AUTH_URL is missing");
}

const JWKS = createRemoteJWKSet(
  new URL("/api/auth/jwks", authUrl)
);

async function verifyToken(req, res, next) {
  const authorization = req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).send({
      message: "Unauthorized: Token required",
    });
  }

  const token = authorization.slice(7);

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: authUrl,
      audience: authUrl,
    });

    if (
      typeof payload.email !== "string" ||
      !payload.sub
    ) {
      return res.status(401).send({
        message: "Invalid user token",
      });
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
    };

    next();
  } catch {
    return res.status(401).send({
      message: "Unauthorized: Invalid or expired token",
    });
  }
}

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
    const joinedEventsCollection = db.collection("joinedEvents");
    await joinedEventsCollection.createIndex(
      { eventId: 1, userId: 1 },
      { unique: true }
    );

    app.post("/events", async (req, res) => {
      try {
        const event = req.body;

        const result = await eventsCollection.insertOne(event);

        res.status(201).send(result);
      } catch {
        res.status(500).send({
          message: "Failed to create event",
        });
      }
    });

    app.get("/events", async (req, res) => {
      try {
        const events = await eventsCollection.find().toArray();

        res.send(events);
      } catch {
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
      } catch {
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
      } catch {
        res.status(500).send({
          message: "Failed to fetch recent events",
        });
      }
    });

    app.get("/events/:id", async (req, res) => {
      try {
        const { id } = req.params;

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
      } catch {
        res.status(500).send({
          message: "Failed to fetch event",
        });
      }
    });

    app.patch("/events/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            message: "Invalid event ID",
          });
        }

        const {
          title,
          description,
          eventType,
          image,
          location,
          eventDate,
        } = req.body;

        const allowedTypes = [
          "Plantation",
          "Cleanup",
          "Donation",
          "Awareness",
          "Other",
        ];

        if (
          [title, description, image, location, eventDate].some(
            (value) =>
              typeof value !== "string" || !value.trim()
          ) ||
          !allowedTypes.includes(eventType) ||
          !/^https?:\/\/\S+$/i.test(image) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)
        ) {
          return res.status(400).send({
            message: "Invalid event information",
          });
        }

        const today = new Date().toISOString().slice(0, 10);

        if (
          eventDate <= today ||
          new Date(`${eventDate}T00:00:00Z`)
            .toISOString()
            .slice(0, 10) !== eventDate
        ) {
          return res.status(400).send({
            message: "Select a valid future date",
          });
        }

        const result = await eventsCollection.updateOne(
          {
            _id: new ObjectId(id),
            creatorEmail: req.user.email,
          },
          {
            $set: {
              title: title.trim(),
              description: description.trim(),
              eventType,
              image: image.trim(),
              location: location.trim(),
              eventDate,
            },
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({
            message: "Event not found or access denied",
          });
        }

        res.send({
          message: "Event updated successfully",
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        console.error("Update event error:", error);

        res.status(500).send({
          message: "Failed to update event",
        });
      }
    });

    app.delete("/events/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            message: "Invalid event ID",
          });
        }

        const result = await eventsCollection.deleteOne({
          _id: new ObjectId(id),
          creatorEmail: req.user.email,
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({
            message: "Event not found or access denied",
          });
        }

        res.send({
          message: "Event deleted successfully",
        });
      } catch (error) {
        console.error("Delete event error:", error);

        res.status(500).send({
          message: "Failed to delete event",
        });
      }
    });

    app.post("/join-events", verifyToken, async (req, res) => {
      try {
        const { eventId } = req.body;

        if (!ObjectId.isValid(eventId)) {
          return res.status(400).send({
            message: "Invalid event ID",
          });
        }

        const event = await eventsCollection.findOne({
          _id: new ObjectId(eventId),
        });

        if (!event) {
          return res.status(404).send({
            message: "Event not found",
          });
        }

        const today = new Date().toISOString().slice(0, 10);

        if (event.eventDate <= today) {
          return res.status(400).send({
            message: "Cannot join a past event",
          });
        }

        const existingJoin = await joinedEventsCollection.findOne({
          eventId: eventId,
          userId: req.user.id,
        });

        if (existingJoin) {
          return res.status(409).send({
            message: "You have already joined this event",
          });
        }

        const result = await joinedEventsCollection.insertOne({
          eventId,
          userId: req.user.id,
          userEmail: req.user.email,
          joinedAt: new Date(),
        });

        res.status(201).send({
          message: "Event joined successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Join event error:", error);

        res.status(500).send({
          message: "Failed to join event",
        });
      }
    });

    app.get("/joined-events", verifyToken, async (req, res) => {
      try {
        const joins = await joinedEventsCollection
          .find({ userId: req.user.id })
          .toArray();

        const eventIds = joins
          .filter((join) => ObjectId.isValid(join.eventId))
          .map((join) => new ObjectId(join.eventId));

        const events = await eventsCollection
          .find({ _id: { $in: eventIds } })
          .sort({ eventDate: 1 })
          .toArray();

        res.send(events);
      } catch (error) {
        console.error("Get joined events error:", error);

        res.status(500).send({
          message: "Failed to fetch joined events",
        });
      }
    });

    app.get("/join-events/:eventId/status", verifyToken, async (req, res) => {
      try {
        const { eventId } = req.params;

        if (!ObjectId.isValid(eventId)) {
          return res.status(400).send({
            message: "Invalid event ID",
          });
        }

        const existingJoin = await joinedEventsCollection.findOne({
          eventId,
          userId: req.user.id,
        });

        res.send({
          joined: Boolean(existingJoin),
        });
      } catch (error) {
        console.error("Join status error:", error);

        res.status(500).send({
          message: "Failed to check join status",
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
