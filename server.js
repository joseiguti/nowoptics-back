const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const redis = require('./redisClient');
const app = express();

app.use(cors({
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json());

async function generateId() {
    return await redis.incr('message_id');
}

async function initializeMessages() {
    try {
        const existingKeys = await redis.keys('message:*');
        if (existingKeys.length === 0) {
            console.log('Initializing default messages...');
            const defaultMessages = [
                { sender_id: 'user_one', receiver_id: 'user_two', content: 'Hey whats up!' },
                { sender_id: 'user_two', receiver_id: 'user_one', content: 'Hi there, this chat is amazing!' },
            ];

            for (const msg of defaultMessages) {
                const id = await generateId();
                const timestamp = new Date().toISOString();

                await redis.hmset(`message:${id}`, {
                    id,
                    sender_id: msg.sender_id,
                    receiver_id: msg.receiver_id,
                    content: msg.content,
                    created_at: timestamp,
                    updated_at: null,
                });

                console.log(`Default message created: ${msg.content}`);
            }
        } else {
            console.log('Messages already exist. Skipping initialization.');
        }
    } catch (err) {
        console.error('Error initializing messages:', err);
    }
}

async function createMessage(sender_id, receiver_id, content) {
    const id = await generateId();
    const timestamp = new Date().toISOString();
    const messageKey = `message:${id}`;

    const messageData = {
        id,
        sender_id,
        receiver_id,
        content,
        created_at: timestamp,
        updated_at: null,
    };

    await redis.hmset(messageKey, messageData);

    return messageData;
}

async function getAllMessages() {
    const keys = await redis.keys('message:*');
    const messages = [];

    for (const key of keys) {
        const message = await redis.hgetall(key);
        messages.push(message);
    }

    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    return messages;
}

async function getMessageById(id) {
    const messageKey = `message:${id}`;
    return await redis.hgetall(messageKey);
}

async function updateMessageById(id, content) {
    const messageKey = `message:${id}`;
    const updatedAt = new Date().toISOString();

    await redis.hmset(messageKey, {
        content,
        updated_at: updatedAt,
    });

    return await redis.hgetall(messageKey);
}

async function deleteMessageById(id) {
    const messageKey = `message:${id}`;
    return await redis.del(messageKey);
}

app.post('/messages', async (req, res) => {
    try {
        const { sender_id, receiver_id, content } = req.body;

        if (!sender_id || !receiver_id || !content) {
            return res.status(400).json({ error: 'sender_id, receiver_id, and content are required' });
        }

        const messageData = await createMessage(sender_id, receiver_id, content);

        broadcast({
            type: 'new_message',
            data: messageData,
        });

        res.status(201).json({ message: 'Message created', data: messageData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/messages', async (req, res) => {
    try {
        const messages = await getAllMessages();
        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const message = await getMessageById(id);

        if (Object.keys(message).length === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }

        res.json(message);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const exists = await redis.exists(`message:${id}`);

        if (!exists) {
            return res.status(404).json({ error: 'Message not found' });
        }

        const updatedMessage = await updateMessageById(id, content);

        broadcast({
            type: 'update_message',
            data: updatedMessage,
        });

        res.json({ message: 'Message updated', data: updatedMessage });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await deleteMessageById(id);

        if (result === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }

        broadcast({
            type: 'delete_message',
            data: { id },
        });

        res.json({ message: 'Message deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const clients = new Map();

wss.on('connection', (ws) => {
    console.log('New client connected');

    // Manejar mensajes recibidos del cliente
    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);

            if (parsedMessage.type === 'register') {
                clients.set(parsedMessage.userKey, ws);
            } else if (parsedMessage.type === 'offer' || parsedMessage.type === 'answer' || parsedMessage.type === 'candidate') {
                const targetClient = clients.get(parsedMessage.target);
                if (targetClient) {
                    targetClient.send(JSON.stringify({
                        ...parsedMessage,
                        sender: parsedMessage.userKey,
                    }));
                }
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.forEach((client, userKey) => {
            if (client === ws) {
                clients.delete(userKey);
            }
        });
    });
});

function broadcast(data) {
    clients.forEach((ws) => {
        ws.send(JSON.stringify(data));
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await initializeMessages();
});