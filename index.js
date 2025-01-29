const express = require("express");
const fs = require("fs").promises;
const sockjs = require("sockjs");
const bodyParser = require("body-parser");

// Constants and Configuration
const PORT = process.env.PORT || 8081;
const TOPIC = "/user/topic/machine_data";
const MACHINE_DATA_FILE = "points_data.json";
const SOCKJS_CONFIG = {
  prefix: "/realtime",
  sockjs_url: "https://cdn.jsdelivr.net/npm/sockjs-client/dist/sockjs.min.js"
};

// Application Setup
const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// WebSocket Setup
const sockjsServer = sockjs.createServer(SOCKJS_CONFIG);
const connections = new Map(); // Using Map for better performance
let clientIdCounter = 0;

// STOMP Frame Utilities
const parseStompFrame = (frame) => {
  const [command, ...lines] = frame.split("\n");
  const headers = {};
  let body = "";
  let line;
  
  while ((line = lines.shift())?.trim()) {
    const [key, value] = line.split(":");
    headers[key.trim()] = value?.trim() ?? "";
  }
  
  body = lines.join("\n").trim();
  return { command, headers, body };
};

const createStompMessage = (topic, body) => 
  `MESSAGE\ndestination:${topic}\n\n${JSON.stringify(body)}\0`;

// WebSocket Connection Handler
const handleWebSocketConnection = (conn) => {
  const clientId = `client-${++clientIdCounter}`;
  connections.set(clientId, conn);
  console.log(`Client connected: ${clientId}`);

  const handleMessage = async (message) => {
    try {
      const { command, headers } = parseStompFrame(message);
      
      switch (command) {
        case "CONNECT":
          conn.write("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
          break;
          
        case "SUBSCRIBE": {
          const topic = headers.destination;
          conn.topic = topic;
          console.log(`${clientId} subscribed to: ${topic}`);
          conn.write(createStompMessage(topic, { 
            message: `Subscribed to ${topic}` 
          }));
          break;
        }
          
        case "DISCONNECT":
          connections.delete(clientId);
          conn.close();
          break;
      }
    } catch (error) {
      console.error(`Error processing message from ${clientId}:`, error);
    }
  };

  conn.on("data", handleMessage);
  conn.on("close", () => {
    console.log(`Client disconnected: ${clientId}`);
    connections.delete(clientId);
  });
};

// Data Simulation Service
const createSimulationService = () => {
  const NUM_MACHINES = 10;
  const EXECUTION_STATES = ["ACTIVE", "STOPPED", "READY"];
  const LOADS = Array.from({ length: 90 }, (_, i) => i + 10);
  
  let machineIndex = 0;
  let loadIndex = 0;
  let executionIndex = 0;
  
  const generateMachineData = () => {
    const machineId = (machineIndex++ % NUM_MACHINES) + 1;
    const load = LOADS[loadIndex++ % LOADS.length];
    const status = EXECUTION_STATES[executionIndex++ % EXECUTION_STATES.length];
    
    return {
      machine_id: machineId,
      name: `machine${machineId}`,
      batch_tool_change: "Automatic",
      data_collection: true,
      program: `asdfg${machineId}`,
      cards: [{
        id: 1,
        unique_id: "12",
        nsequence_list: ["n10", "n20", "n30", "n40"],
        active_nsequence_index: Math.floor(Math.random() * 4),
        auto_tool_change: true,
        cummulative_load: load,
        current_ppe_value: "12",
        fixed_ppe_value: "45",
        status: status,
        card_status: "0",
        tool_life_consumed: `${load}`
      }]
    };
  };

  return {
    start: (interval) => {
      setInterval(() => {
        const data = generateMachineData();
        broadcastStompMessage(TOPIC, data);
      }, interval);
    }
  };
};

// Broadcast Utilities
const broadcastStompMessage = (topic, message) => {
  const stompMessage = createStompMessage(topic, message);

  connections.forEach((conn, clientId) => {
    console.log(conn);
    if (conn.topic === topic) {
      conn.write(stompMessage);
    }
  });
};

// API Controllers
const handleGraphData = async (req, res) => {
  try {
    const data = await fs.readFile(MACHINE_DATA_FILE, "utf8");
    res.json(JSON.parse(data));
  } catch (error) {
    console.error("Data fetch error:", error);
    res.status(500).json({ error: "Failed to load graph data" });
  }
};

const handleMachineList = (req, res) => {
  const staticData = require("./machine_data.json"); // Externalize large data
  res.json(staticData);
};

// API Routes
app.get("/api/get/graph_data", handleGraphData);
app.get("/api/get/machine_list", handleMachineList);

// Server Initialization
const startServer = () => {
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  sockjsServer.installHandlers(server, { prefix: SOCKJS_CONFIG.prefix });
  sockjsServer.on("connection", handleWebSocketConnection);
  
  const simulation = createSimulationService();
  simulation.start(1000 / (0.5 * 10)); // Start data simulation
};

startServer();