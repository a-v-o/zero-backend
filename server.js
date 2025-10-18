import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(cors());

app.get("/", (req, res) => {
  res.send("Please go to /me");
});

app.get("/me", async (req, res) => {
  try {
    const catResponse = await axios.get("https://catfact.ninja/fact", {
      timeout: 5000,
    });

    const catFact = catResponse.data.fact;

    const response = {
      status: "success",
      user: {
        email: "adejuwonvictor2004@gmail.com",
        name: "Adejuwon Oluwafunmito",
        stack: "Node.js/Express",
      },
      timestamp: new Date().toISOString(),
      fact: catFact,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching cat fact:", error.message);
    res.status(200).json({
      status: "success",
      user: {
        email: "adejuwonvictor2004@gmail.com",
        name: "Adejuwon Oluwafunmito",
        stack: "Node.js/Express",
      },
      timestamp: new Date().toISOString(),
      fact: "Could not fetch cat fact at the moment 😿",
    });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
