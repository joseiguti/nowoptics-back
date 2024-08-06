const express = require('express');
const cors = require('cors');
const redis = require('./redisClient');
const app = express();

app.use(cors()); // Usar cors como middleware
app.use(express.json());

async function generateId() {
    const id = await redis.incr('message_id');
    return id;
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

app.post('/messages', async (req, res) => {
    try {
        const { sender_id, receiver_id, content } = req.body;

        if (!sender_id || !receiver_id || !content) {
            return res.status(400).json({ error: 'sender_id, receiver_id, and content are required' });
        }

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

        res.status(201).json({ message: 'Message created', data: messageData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/messages', async (req, res) => {
    try {
        const keys = await redis.keys('message:*');
        const messages = [];

        for (const key of keys) {
            const message = await redis.hgetall(key);
            messages.push(message);
        }

        messages.sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return dateA - dateB;
        });

        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const messageKey = `message:${id}`;
        const message = await redis.hgetall(messageKey);

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

        const messageKey = `message:${id}`;
        const exists = await redis.exists(messageKey);

        if (!exists) {
            return res.status(404).json({ error: 'Message not found' });
        }

        const updatedAt = new Date().toISOString();

        await redis.hmset(messageKey, {
            content,
            updated_at: updatedAt,
        });

        const updatedMessage = await redis.hgetall(messageKey);

        res.json({ message: 'Message updated', data: updatedMessage });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const messageKey = `message:${id}`;
        const result = await redis.del(messageKey);

        if (result === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }

        res.json({ message: 'Message deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await initializeMessages();
});

app.use(cors({
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));