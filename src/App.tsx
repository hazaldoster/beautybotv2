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

  // Ensure we have the required credentials
  if (!apiKey || !assistantId) {
    console.error('Missing OpenAI API credentials. Please check your .env file.');
  }

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
          onBack={handleBackToWelcome}
        />
      </AppContainer>
    );
  }

  return (
    <WelcomeContainer>
      <WelcomeCard>
        <WelcomeLogo>
          <LogoImage src="/AgeSA-Icon-192x192.png" alt="Agesa Logo" />
        </WelcomeLogo>
        <WelcomeTitle>Agesa Finansal Terapi</WelcomeTitle>
        <WelcomeSubtitle>
          Finansal hedeflerinize ulaşmanıza yardımcı olacak yapay zeka destekli asistanımızla tanışın.
          Size özel finansal tavsiyeler ve çözümler sunuyoruz.
        </WelcomeSubtitle>
        <StartButton onClick={handleStartChat}>
          Finansal Terapi Asistanıyla Konuşmaya Başla
        </StartButton>
      </WelcomeCard>
    </WelcomeContainer>
  );
}

export default App;
