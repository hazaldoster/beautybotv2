import React, { useState } from 'react';
import styled from 'styled-components';
import Chat from './components/Chat';
import './App.css';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 0;
  margin: 0;
  background-color: #fff;
  width: 100%;
  overflow: hidden;
`;

const WelcomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f5f7fb;
  background-image: radial-gradient(#e0e6f5 1px, transparent 1px), radial-gradient(#e0e6f5 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
  text-align: center;
  padding: 20px;
`;

const WelcomeCard = styled.div`
  background-color: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  max-width: 700px;
  width: 90%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const WelcomeLogo = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
  overflow: hidden;
`;

const LogoImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const WelcomeTitle = styled.h1`
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 15px;
`;

const WelcomeSubtitle = styled.p`
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 40px;
  max-width: 600px;
  line-height: 1.6;
`;

const StartButton = styled.button`
  background-color: #5b48ee;
  color: white;
  border: none;
  border-radius: 30px;
  padding: 15px 30px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(91, 72, 238, 0.3);
  
  &:hover {
    background-color: #4a3ad9;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(91, 72, 238, 0.4);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 4px 8px rgba(91, 72, 238, 0.3);
  }
`;

function App() {
  const [showChat, setShowChat] = useState(false);
  
  // Get API credentials from environment variables
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
  const assistantId = process.env.REACT_APP_ASSISTANT_ID || '';
  
  // Get Qdrant credentials from environment variables
  // Use the CORS proxy URL if available
  const proxyUrl = process.env.REACT_APP_PROXY_URL || '';
  const qdrantUrl = proxyUrl || process.env.REACT_APP_QDRANT_URL || '';
  const qdrantApiKey = process.env.REACT_APP_QDRANT_API_KEY || '';
  const qdrantCollection = process.env.REACT_APP_QDRANT_COLLECTION || 'product_inventory';
  
  // Enable Qdrant if we have a proxy URL or direct URL
  const enableQdrant = !!qdrantUrl;

  // Ensure we have the required credentials
  if (!apiKey) {
    console.error('Missing OpenAI API key. Please check your .env file.');
  }
  
  // Log configuration
  console.log('Configuration:');
  console.log(`- OpenAI API Key: ${apiKey ? 'Set' : 'Not set'}`);
  console.log(`- Assistant ID: ${assistantId ? 'Set' : 'Not set'}`);
  console.log(`- Proxy URL: ${proxyUrl ? 'Set' : 'Not set'}`);
  console.log(`- Qdrant URL: ${qdrantUrl ? 'Set' : 'Not set'}`);
  console.log(`- Qdrant API Key: ${qdrantApiKey ? 'Set' : 'Not set'}`);
  console.log(`- Qdrant Collection: ${qdrantCollection}`);
  console.log(`- Qdrant Enabled: ${enableQdrant ? 'Yes' : 'No'}`);

  const handleStartChat = () => {
    setShowChat(true);
  };

  const handleBackToWelcome = () => {
    setShowChat(false);
  };

  if (showChat) {
    return (
      <AppContainer>
        <Chat 
          apiKey={apiKey} 
          assistantId={assistantId}
          qdrantUrl={qdrantUrl}
          qdrantApiKey={qdrantApiKey}
          qdrantCollection={qdrantCollection}
          enableQdrant={enableQdrant}
          onBack={handleBackToWelcome}
        />
      </AppContainer>
    );
  }

  return (
    <WelcomeContainer>
      <WelcomeCard>
        <WelcomeLogo>
          <LogoImage src="/BeautyBot-Icon-192x192.png" alt="BeautyBot Logo" />
        </WelcomeLogo>
        <WelcomeTitle>BeautyBot</WelcomeTitle>
        <WelcomeSubtitle>
          Meet our AI-powered assistant that will help you achieve your beauty goals.
          We offer personalized beauty advice and product recommendations just for you.
        </WelcomeSubtitle>
        <StartButton onClick={handleStartChat}>
          Start Chatting with Beauty Assistant
        </StartButton>
      </WelcomeCard>
    </WelcomeContainer>
  );
}

export default App;
