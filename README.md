
# NowOptics Backend

This is the backend application for NowOptics, providing an API for real-time messaging and video calling functionalities.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [WebSocket Communication](#websocket-communication)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js**: version 14.x or later
- **npm**: version 6.x or later
- **Redis**: for message storage
- **Git**: version control system

## Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/joseiguti/nowoptics-back.git
cd nowoptics-back
npm install
```

## Usage

To run the server locally, use:

```bash
npm start
```

This command starts the server on `http://localhost:3000`.

### Run with Nodemon

To run the server with nodemon for automatic restarts, use:

```bash
npm run dev
```

## Project Structure

```
src/
|-- routes/        # Express routes
|-- controllers/   # API endpoint controllers
|-- models/        # Data models
|-- config/        # Configuration files
|-- utils/         # Utility functions
|-- server.js      # Main server file
|-- redisClient.js # Redis client configuration
```

## API Endpoints

### Messages API

- **GET /messages**: Retrieve all chat messages.

  **Example response:**

  ```json
  [
    {
      "id": "1",
      "sender_id": "user_one",
      "receiver_id": "user_two",
      "content": "Hello!",
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": null
    }
  ]
  ```

- **POST /messages**: Send a new chat message.

  **Request body:**

  ```json
  {
    "sender_id": "user_one",
    "receiver_id": "user_two",
    "content": "Hello!"
  }
  ```

  **Example response:**

  ```json
  {
    "message": "Message created",
    "data": {
      "id": "2",
      "sender_id": "user_one",
      "receiver_id": "user_two",
      "content": "Hello!",
      "created_at": "2024-01-01T12:01:00Z",
      "updated_at": null
    }
  }
  ```

- **PUT /messages/:id**: Update a chat message.

  **Request body:**

  ```json
  {
    "content": "Updated message content"
  }
  ```

  **Example response:**

  ```json
  {
    "message": "Message updated",
    "data": {
      "id": "1",
      "sender_id": "user_one",
      "receiver_id": "user_two",
      "content": "Updated message content",
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-01T12:02:00Z"
    }
  }
  ```

- **DELETE /messages/:id**: Delete a chat message.

  **Example response:**

  ```json
  {
    "message": "Message deleted"
  }
  ```

## WebSocket Communication

The backend uses WebSocket for real-time communication. Here are the message types:

- **register**: Register a user with the WebSocket server.
- **offer**: Send an offer for video calling.
- **answer**: Send an answer to a video call offer.
- **candidate**: Send ICE candidates for establishing a peer-to-peer connection.
- **new_message**: Notify clients about a new chat message.
- **update_message**: Notify clients about a message update.
- **delete_message**: Notify clients about a message deletion.

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

## License

This project is licensed under the MIT License.
