# Deploying BeautyBot on Railway

This guide provides instructions for deploying the BeautyBot application on Railway.

## Prerequisites

1. A Railway account (https://railway.app/)
2. The Railway CLI installed (optional, but recommended)
   ```
   npm install -g @railway/cli
   ```
3. Your environment variables ready (see `.env.example`)

## Deployment Steps

### 1. Set Up Your Railway Project

1. Log in to Railway and create a new project
2. Connect your GitHub repository or use the Railway CLI to initialize the project

### 2. Configure Environment Variables

Add the following environment variables in the Railway dashboard:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_OPENAI_API_KEY`
- `OPENAI_API_KEY` (same as above)
- `REACT_APP_ASSISTANT_ID`
- `REACT_APP_QDRANT_API_KEY`
- `REACT_APP_QDRANT_URL`
- `REACT_APP_QDRANT_COLLECTION`
- `QDRANT_API_KEY` (for internal services)

### 3. Deploy Multi-Service Setup

This project uses a multi-service architecture with:

1. **Main App**: The React frontend and Express backend
2. **CORS Proxy**: A service to handle CORS for API requests
3. **Qdrant**: Vector database for embeddings

Railway will automatically detect the multi-service configuration from the `railway.json` file.

### 4. Configure Service URLs

After deployment, update these environment variables with the actual Railway service URLs:

- `REACT_APP_PROXY_URL`: URL of your CORS proxy service
- `REACT_APP_QDRANT_URL`: URL of your Qdrant service

### 5. Persistent Storage

For Qdrant, you'll need to set up persistent storage:

1. In the Railway dashboard, go to the Qdrant service
2. Add a volume mount for `/qdrant/storage` and `/qdrant/snapshots`

### 6. Verify Deployment

1. Check the deployment logs for any errors
2. Visit your deployed application URL
3. Test the chatbot functionality

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the CORS proxy service is running and properly configured
2. **Environment Variables**: Verify all environment variables are set correctly
3. **Build Failures**: Check the build logs for any dependency or compilation errors

### Health Checks

The application includes health check endpoints:
- Main app: `/health`
- CORS proxy: `/health`
- Qdrant: `/healthz`

## Scaling

Railway automatically scales your application based on usage. For high-traffic scenarios:

1. Increase the instance size in Railway dashboard
2. Consider adding a CDN for static assets
3. Optimize the Qdrant configuration for higher throughput

## Monitoring

Use Railway's built-in monitoring tools to track:
- CPU and memory usage
- Request volume and latency
- Error rates

## Updating the Deployment

To update your deployment:
1. Push changes to your connected GitHub repository, or
2. Use the Railway CLI:
   ```
   railway up
   ``` 