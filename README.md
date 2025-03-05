# Agesa Chatbot

A simple React-based chatbot UI that connects to OpenAI's Assistant API.

## Features

- Clean, modern UI with message bubbles
- Real-time conversation with OpenAI's Assistant
- Direct integration with OpenAI's Assistant API
- Loading indicators for better UX

## Prerequisites

To use this chatbot, you'll need:

1. An OpenAI API key (get one at https://platform.openai.com/api-keys)
2. An Assistant ID (create one at https://platform.openai.com/assistants)

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/agesa-chatbot.git
   cd agesa-chatbot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure your environment variables:
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key and Assistant ID to the `.env` file:
     ```
     REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
     REACT_APP_ASSISTANT_ID=your_assistant_id_here
     ```

4. Start the development server:
   ```
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Ensure your OpenAI API key and Assistant ID are correctly set in the `.env` file
2. Start the application and wait for it to connect to your OpenAI Assistant
3. Type your message in the input field at the bottom and press Enter or click the Send button
4. Enjoy your conversation with your OpenAI Assistant!

## How It Works

The application creates a thread with OpenAI's Assistant API when it starts. When you send a message:

1. Your message is added to the thread
2. The Assistant processes your message
3. The response is retrieved and displayed in the chat interface

All communication happens directly with OpenAI's API, ensuring you get the full capabilities of your configured Assistant.

## Security Note

This application stores your API key and Assistant ID as environment variables. For production use, you should implement a backend service to handle API calls and not expose your API key in the frontend.

## Technologies Used

- React
- TypeScript
- styled-components
- OpenAI API

## License

MIT

## Acknowledgments

- OpenAI for providing the Assistant API
- The React community for the excellent tools and libraries
