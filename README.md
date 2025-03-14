# BeautyBot

A React-based beauty assistant chatbot that connects to either OpenAI's Assistant API or a custom product query processor for beauty product recommendations.

## Features

- Clean, modern UI with message bubbles
- Real-time conversation with OpenAI's Assistant
- Direct integration with OpenAI's Assistant API
- Product search capabilities using vector similarity search
- Support for beauty product recommendations based on user queries
- Loading indicators for better UX

## Prerequisites

To use this chatbot, you'll need:

1. An OpenAI API key (get one at https://platform.openai.com/api-keys)
2. An Assistant ID (create one at https://platform.openai.com/assistants)

For the product query processor functionality:
3. A Qdrant vector database instance (cloud or self-hosted)
4. A Qdrant API key
5. A collection of vectorized beauty products

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/beautybot.git
   cd beautybot
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
     
     # For product query processor (optional)
     REACT_APP_QDRANT_URL=your_qdrant_url_here
     REACT_APP_QDRANT_API_KEY=your_qdrant_api_key_here
     REACT_APP_QDRANT_COLLECTION=product_inventory
     ```

4. Start the development server:
   ```
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Ensure your OpenAI API key and Assistant ID are correctly set in the `.env` file
2. If you want to use the product query processor, make sure your Qdrant credentials are also set
3. Start the application and wait for it to connect to your OpenAI Assistant or Qdrant
4. Type your message in the input field at the bottom and press Enter or click the Send button
5. Enjoy your conversation with your Beauty Assistant!

## Testing the Connections

Before running the application, you can test if your connections to OpenAI and Qdrant are working properly:

1. Run the test script:
   ```
   ./test-frontend.sh
   ```

This script will:
- Test the connection to OpenAI
- Test the connection to Qdrant (if credentials are provided)
- Test the Product Query Service
- Test the frontend integration by simulating the Chat component

You can also run the individual test scripts:
```
npx ts-node src/scripts/test-connections.ts
npx ts-node src/scripts/test-frontend-integration.ts
```

If you encounter any issues with the test scripts, make sure:
1. Your `.env` file is properly configured with all required credentials
2. You have installed all dependencies with `npm install`
3. You have a working internet connection to access OpenAI and Qdrant services

The test scripts will provide detailed information about what's working and what's not, helping you troubleshoot any issues before running the actual application.

## How It Works

The application can operate in two modes:

### OpenAI Assistant Mode
If only OpenAI credentials are provided, the application creates a thread with OpenAI's Assistant API when it starts. When you send a message:

1. Your message is added to the thread
2. The Assistant processes your message
3. The response is retrieved and displayed in the chat interface

### Product Query Processor Mode
If Qdrant credentials are provided, the application will use the custom product query processor:

1. Your message is processed to generate an embedding using the OpenAI text-embedding-3-small model
2. The embedding is used to search for similar products in the Qdrant vector database
3. The most relevant products are retrieved and formatted into a context
4. The context and your query are sent to OpenAI's GPT model to generate a helpful response
5. The response is displayed in the chat interface

## Setting Up the Product Database

To use the product query processor, you need to:

1. Set up a Qdrant vector database (cloud or self-hosted)
2. Create a collection named "product_inventory" (or your custom name)
3. Run the vectorization script to populate the database:
   ```
   npx ts-node -r dotenv/config scripts/product-vectorizer.ts
   ```

You can test the product query processor directly:
```
npx ts-node -r dotenv/config scripts/product-query-processor.ts
```

## Security Note

This application stores your API keys as environment variables. For production use, you should implement a backend service to handle API calls and not expose your API keys in the frontend.

## Technologies Used

- React
- TypeScript
- styled-components
- OpenAI API
- Qdrant Vector Database
- OpenAI Embeddings API for vector embeddings

## License

MIT

## Acknowledgments

- OpenAI for providing the Assistant API
- Qdrant for the vector database
- The React community for the excellent tools and libraries