# NextJS App Router API

## Overview

This project demonstrates how to build API endpoints using the `nextjs-route-decorator` framework with dependency injection and TypeScript. API routes are defined using decorators in [route.ts](example/src/app/api/[...params]/route.ts), which include both GET and POST endpoints.

## Features

- **Dependency Injection**: Uses `@injectable` and `@inject` decorators to inject and manage service dependencies.
- **API Endpoints**:
  - `GET /api/hello` returns a JSON object with a greeting.
  - `POST /api/hello` accepts a JSON body (with a `name` field) and returns a JSON greeting.
- **Swagger Integration**: Interactive API documentation available at `/api/swagger`.

## Project Structure

- **API Routes**: Located in [example/src/app/api/[...params]/route.ts](example/src/app/api/[...params]/route.ts).
- **Service Layer**: The `TestService` class provides business logic for handling API requests.
- **Controller**: The `TestController` class defines API operations along with route metadata.

## Setup and Installation

1. **Clone the repository:**
   ```sh
   git clone <repository-url>
   ```
2. **Navigate to the project directory:**
   ```sh
   cd <project-folder>
   ```
3. **Install dependencies using pnpm:**
   ```sh
   pnpm install
   ```
4. **Run the development server:**
   ```sh
   pnpm dev
   ```

## Testing the Endpoints

- **GET Request:**  
  Visit [http://localhost:<port>/api/hello](http://localhost:<port>/api/hello) in your browser or use a tool like Postman.

- **POST Request:**  
  Send a POST request to [http://localhost:<port>/api/hello](http://localhost:<port>/api/hello) with the following JSON body:
  ```json
  {
    "name": "Your Name"
  }
  ```

## API Documentation

Access the interactive Swagger documentation at: Workspace
Collecting workspace information

Filtering to most relevant information

Below is an example README content that documents the API endpoints, project structure, and setup instructions for your Next.js project. You can adjust the port numbers and repository URL as needed.

http://localhost:<port>/api/swagger
