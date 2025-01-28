const express = require("express");
const fs = require("fs");
const sockjs = require("sockjs");
const bodyParser = require("body-parser");

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// SockJS WebSocket Setup
const sockjsServer = sockjs.createServer({
  sockjs_url: "https://cdn.jsdelivr.net/npm/sockjs-client/dist/sockjs.min.js",
});
const connections = {};
let clientIdCounter = 0;

// Helper function to parse STOMP frames
function parseStompFrame(frame) {
  const lines = frame.split("\n");
  const command = lines.shift(); // The first line is the command
  const headers = {};
  let body = "";

  // Parse headers
  let line;
  while ((line = lines.shift()) !== "") {
    const [key, value] = line.split(":");
    headers[key.trim()] = value.trim();
  }

  // Parse body
  body = lines.join("\n").trim();

  return { command, headers, body };
}

// Handle STOMP connection
sockjsServer.on("connection", (conn) => {
  const clientId = `client-${++clientIdCounter}`;
  connections[clientId] = conn;
  console.log(`Client connected: ${clientId}`);

  conn.on("data", (message) => {
    const stompMessage = parseStompFrame(message);
    console.log(`Received STOMP message from ${clientId}:`, stompMessage);

    if (stompMessage.command === "CONNECT") {
     
      // Respond to the CONNECT frame with a CONNECTED frame
      conn.write("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
    } else if (stompMessage.command === "SUBSCRIBE") {
      console.log(
        `${clientId} subscribed to topic: ${stompMessage.headers.destination}`
      );
      const topic = stompMessage.headers.destination;
      conn.topic = topic;
      console.log("sub");
      console.log(conn);
      sub();
    } else if (stompMessage.command === "DISCONNECT") {
      delete connections[clientId];
      conn.close();
    }
  });

  conn.on("close", () => {
    console.log(`Client disconnected: ${clientId}`);
    delete connections[clientId];
  });
});

// Function to broadcast STOMP messages
const broadcastStompMessage = (topic, message) => {
  const stompMessage = `MESSAGE\ndestination:${topic}\n\n${JSON.stringify(
    message
  )}\0`;
  for (const clientId in connections) {
    
    connections[clientId].write(stompMessage);
  }
};

function sub() {
  // Simulation Logic
  const topic = "/user/topic/machine_data";
  const numMachines = 10;
  const speed = 0.5;

  const machineIds = Array.from({ length: numMachines }, (_, i) => i + 1);
  const lastDataPointIndex = Array(numMachines).fill(0);
  const loads = Array.from({ length: 90 }, (_, i) => i + 10);
  const executions = ["ACTIVE", "STOPPED", "READY"];
  const delay = 1000 / (speed * numMachines); // milliseconds

  let machineIndex = 0;
  let loadIndex = 0;
  let executionIndex = 0;

  setInterval(() => {
    machineIndex = machineIndex < machineIds.length - 1 ? machineIndex + 1 : 0;
    loadIndex = loadIndex < loads.length - 1 ? loadIndex + 1 : 0;
    executionIndex =
      executionIndex < executions.length - 1 ? executionIndex + 1 : 0;

    lastDataPointIndex[machineIndex] += 1;

    const message = {
      machine_id: machineIds[machineIndex],
      name: `machine${machineIds[machineIndex]}`,
      batch_tool_change: "Automatic",
      data_collection: true,
      program: `asdfg${machineIds[machineIndex]}`,
      cards: [
        {
          id: 1,
          unique_id: "12",
          nsequence_list: ["n10", "n20", "n30", "n40"],
          active_nsequence_index: Math.floor(Math.random() * 4),
          auto_tool_change: true,
          cummulative_load: loads[loadIndex],
          current_ppe_value: "12",
          fixed_ppe_value: "45",
          status: executions[executionIndex],
          card_status: "0",
          tool_life_consumed: `${loads[loadIndex]}`,
        },
      ],
    };

    broadcastStompMessage(topic, message);
  }, delay);
}

// API Endpoints (Unchanged)
app.get("/api/get/graph_data", (req, res) => {
  fs.readFile("points_data.json", "utf8", (err, data) => {
    if (err) {
      console.error("Error reading JSON file:", err);
      res.status(500).send({ error: "Failed to load graph data" });
      return;
    }

    try {
      const jsonData = JSON.parse(data);
      res.send(jsonData);
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      res.status(500).send({ error: "Invalid JSON format" });
    }
  });
});

app.get("/api/get/machine_list", (req, res) => {
  // Original machine list endpoint logic
  let data = {
    statusCode: 200,
    status: "success",
    message: "Machines fetched successfully.",
    data: [
      {
        machine_id: 1,
        name: "CNC  bA",
        data_collection: true,
        batch_tool_change: "2024-12-28T10:00:00Z",
        program: "1234",
        cards: [
          {
            id: 1,
            unique_id: "card-1-1",
            name: "Card A1",
            nsequence_list: ["seq1-A", "seq2-A", "seq3-A"],
            active_nsequence_index: 0,
            cummulative_load: 150,
            auto_tool_change: true,
            current_ppe_value: "1",
            fixed_ppe_value: "5",
            status: "active",
            card_status: "0",
            tool_life_consumed: "89",
          },
          {
            id: 2,
            unique_id: "card-1-2",
            name: "Card A2",
            nsequence_list: ["seq1-B", "seq2-B", "seq3-B"],
            active_nsequence_index: 0,
            cummulative_load: 150,
            auto_tool_change: true,
            current_ppe_value: "5",
            fixed_ppe_value: "10",
            status: "active",
            card_status: "0",
            tool_life_consumed: "89",
          },
          {
            id: 3,
            unique_id: "card-1-3",
            name: "Card A3",
            nsequence_list: ["seq1-C", "seq2-C", "seq3-C"],
            active_nsequence_index: 0,
            cummulative_load: 150,
            auto_tool_change: true,
            current_ppe_value: "60%",
            fixed_ppe_value: "75%",
            status: "active",
            card_status: "0",
            tool_life_consumed: "89",
          },
        ],
      },
      {
        machine_id: 2,
        name: "CNC thf B",
        data_collection: false,
        batch_tool_change: "2024-12-30T14:30:00Z",
        program: "1234",
        cards: [
          {
            id: 4,
            unique_id: "card-2-1",
            name: "Card B1",
            nsequence_list: ["seq1-D", "seq2-D", "seq3-D"],
            active_nsequence_index: 0,
            cummulative_load: 200,
            auto_tool_change: false,
            current_ppe_value: "10",
            fixed_ppe_value: "15",
            status: "active",
            card_status: "0",
            tool_life_consumed: "89",
          },
          {
            id: 5,
            unique_id: "card-2-2",
            name: "Card B2",
            nsequence_list: ["seq1-E", "seq2-E", "seq3-E"],
            active_nsequence_index: 1,
            cummulative_load: 250,
            auto_tool_change: true,
            current_ppe_value: "20",
            fixed_ppe_value: "25",
            status: "inactive",
            card_status: "0",
            tool_life_consumed: "89",
          },
          {
            id: 6,
            unique_id: "card-2-3",
            name: "Card B3",
            nsequence_list: ["seq1-F", "seq2-F", "seq3-F"],
            active_nsequence_index: 2,
            cummulative_load: 300,
            auto_tool_change: true,
            current_ppe_value: "30%",
            fixed_ppe_value: "50%",
            status: "active",
            card_status: "0",
            tool_life_consumed: "89",
          },
        ],
      },
      {
        machine_id: 3,
        name: "CNC shubham C",
        data_collection: true,
        batch_tool_change: "2025-01-05T09:15:00Z",
        program: "1234",
        cards: [
          {
            id: 7,
            unique_id: "card-3-1",
            name: "Card C1",
            nsequence_list: ["seq1-G", "seq2-G", "seq3-G"],
            active_nsequence_index: 0,
            cummulative_load: 350,
            auto_tool_change: true,
            current_ppe_value: "40",
            fixed_ppe_value: "60",
            status: "inactive",
            card_status: "0",
            tool_life_consumed: "89",
          },
          {
            id: 8,
            unique_id: "card-3-2",
            name: "Card C2",
            nsequence_list: ["seq1-H", "seq2-H", "seq3-H"],
            active_nsequence_index: 1,
            cummulative_load: 400,
            auto_tool_change: false,
            current_ppe_value: "50",
            fixed_ppe_value: "70",
            status: "active",
            card_status: "0",
            tool_life_consumed: "89",
          },
          {
            id: 9,
            unique_id: "card-3-3",
            name: "Card C3",
            nsequence_list: ["seq1-I", "seq2-I", "seq3-I"],
            active_nsequence_index: 2,
            cummulative_load: 450,
            auto_tool_change: true,
            current_ppe_value: "60%",
            fixed_ppe_value: "80%",
            status: "active",
            card_status: "0",
            tool_life_consumed: "89",
          },
        ],
      },
    ],
  };
  // Parse and send JSON data
  try {
    const jsonData = data ? data : JSON.parse(data);
    res.send(jsonData);
  } catch (parseError) {
    console.error("Error parsing JSON:", parseError);
    res.status(500).send({ error: "Invalid JSON format" });
  }
});

// Start the server
const PORT = process.env.PORT || 8081;
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Attach SockJS server to HTTP server
sockjsServer.installHandlers(server, { prefix: "/realtime" });
