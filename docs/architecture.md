# AI Gift Recommendation Assistant - Architecture

## Overview
This document outlines the high-level architecture and the seven-step workflow for the AI Gift Recommendation Assistant.

## Seven-Step Workflow
1. **Customer Data Entry:** User inputs occasion, age, relation, budget, and preferences via the frontend form.
2. **Data Submission:** The frontend sends a structured JSON payload to the backend API.
3. **Backend Validation:** The Node.js Express backend validates the incoming data constraints (e.g., budget is a positive number).
4. **AI Processing:** The backend communicates with the Gemini API to generate personalized gift recommendations based on the user's input.
5. **Data Storage:** The backend saves the user input and the generated recommendations into the PostgreSQL database.
6. **Frontend Display:** The backend responds to the frontend, which displays the generated recommendations to the user.
7. **Staff Dashboard Management:** Company staff can view, manage, and track recommendations through an internal dashboard.

## Tech Stack
* **Frontend:** React (Vite)
* **Backend:** Node.js, Express
* **Database:** PostgreSQL
* **AI Layer:** Gemini API
