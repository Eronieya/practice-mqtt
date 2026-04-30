const express = require('express');
const mqtt = require('mqtt');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const topic = 'test1/topic';

app.use(cors());
app.use(express.json());

const mqttClient = mqtt.connect('ws://broker.emqx.io:8083/mqtt', {
  protocolId: 'MQTT',
  protocolVersion: 4,
  keepalive: 60,
  clientId: 'nodejs_server_' + Math.random().toString(16).substr(2, 8),
});

mqttClient.on('connect', () => {
  console.log('Connected to MQTT over WebSocket');
  mqttClient.subscribe(topic, (err) => {
    if (!err) {
      console.log(`Subscribed to ${topic}`);
      mqttClient.publish(topic, JSON.stringify({
        message: 'Hello from Node.js server!',
        timestamp: new Date().toISOString(),
        source: 'server',
      }));
    }
  });
});

mqttClient.on('message', (topic, message) => {
  console.log(`Received message on ${topic}: ${message.toString()}`);
});

mqttClient.on('error', (error) => {
  console.error('MQTT error:', error);
});

mqttClient.on('close', () => {
  console.log('MQTT connection closed');
});

let publishInterval;
mqttClient.on('connect', () => {
  publishInterval = setInterval(() => {
    const payload = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      message: 'Server heartbeat',
      source: 'server',
    };
    mqttClient.publish(topic, JSON.stringify(payload), (err) => {
      if (err) {
        console.error('Failed to publish:', err);
      } else {
        console.log(`Published heartbeat: ${payload.date}`);
      }
    });
  }, 5000);
});

mqttClient.on('close', () => {
  if (publishInterval) {
    clearInterval(publishInterval);
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'Express server with MQTT',
    mqtt: 'ws://broker.emqx.io:8083/mqtt',
    connected: mqttClient.connected,
  });
});

app.post('/publish', (req, res) => {
  const { topic, payload } = req.body;
  if (!topic || payload === undefined) {
    return res.status(400).json({ error: 'Missing topic or payload' });
  }

  mqttClient.publish(topic, JSON.stringify(payload), (err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to publish' });
    } else {
      res.json({ success: true, message: 'Message published' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
