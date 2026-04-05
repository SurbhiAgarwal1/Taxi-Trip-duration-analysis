# 🚕 Taxi Trip Duration Analysis with Path-Based Pricing Intelligence

A full-stack Mobility Intelligence and Decision Support System that predicts ETA (Estimated Time of Arrival) with uncertainty, estimates transparent price bands, explains pricing behavior, detects delay-prone corridors, and provides interactive spatial dashboards for monitoring mobility patterns.

Unlike traditional taxi prediction projects that only return a single trip duration value, this system is designed as a decision-support platform that combines machine learning, pricing intelligence, corridor analytics, monitoring, and dashboard-based exploration.

## 📌 Project Overview

This project analyzes historical taxi trip data and builds a production-style analytics system that can:

-predict trip duration (ETA)

-estimate prediction intervals (P50–P90)

-calculate confidence score

-classify delay risk

-estimate fair price bands (min–max)

-explain why a trip is expensive

simulate pricing and ETA under different time scenarios

analyze pickup-to-dropoff corridor reliability

visualize spatial trends using interactive dashboards

monitor model quality and drift over time

This is not just a machine learning notebook. It is a complete end-to-end mobility intelligence system with:

React frontend

FastAPI backend

PostgreSQL storage

ML prediction and pricing layer

spatial analytics dashboards

monitoring and drift-awareness components

## 🎯 Market Gap: What Problem Does This Solve?

Most ride-hailing and taxi systems today expose only a single ETA value and a single price estimate. That creates multiple gaps in transparency and decision-making:

### What is missing in most current systems?

No uncertainty around ETA  
Users see one number, but not how reliable it is.

No confidence or delay risk indicator  
A 12-minute ETA and another 12-minute ETA may not have the same reliability.

No corridor-level intelligence  
Platforms do not usually show which pickup-to-dropoff routes are consistently unreliable.

No transparent price band  
Users get one price, without understanding expected variation.

No explanation layer  
Users often do not know whether a trip is expensive because of congestion, corridor volatility, peak hour, or route-specific patterns.

No scenario testing  
Users cannot compare what happens if they travel 30 minutes later, during non-peak time, or across a different corridor.

No operational monitoring view  
Most student-level projects stop after training a model; they do not track interval coverage, slice-level error, or drift.

### What gap does this project fill?

This project fills the gap between a basic prediction model and a decision-support product by adding:

uncertainty-aware ETA instead of a single point prediction

confidence and delay-risk interpretation

route/corridor reliability analytics

explainable price bands instead of opaque estimates

what-if simulation for better travel decisions

dashboard-driven monitoring for operational insight

In short, this project brings together the kinds of features that are typically scattered across pricing engines, dispatch analytics tools, forecasting systems, and operations dashboards into one integrated platform.

## 💡 Why This Project Matters

Urban mobility systems are highly variable because travel time and trip cost depend on:

hour of day

traffic congestion

route/corridor characteristics

pickup and dropoff zone behavior

demand concentration

trip distance and duration volatility

A single-value prediction is often not enough for real-world decision-making.

This project improves trust and usefulness by providing:

ETA with uncertainty

price with range

risk with interpretation

corridor analytics with reliability

monitoring with drift awareness

That makes the system more useful for:

riders making timing decisions

operators understanding route volatility

analysts studying zone and corridor patterns

product teams building transparent mobility experiences

## 🧠 Core Features

### 1. ETA Prediction Engine

The system predicts trip duration using multiple machine learning approaches:

Linear Regression (baseline)

Random Forest

Gradient Boosting

Output

For each trip request, the system returns:

predicted ETA

prediction interval (P50–P90 style range)

confidence score

delay risk classification

Why this matters

Traditional systems usually show one ETA number. This project adds uncertainty and risk awareness so the user can understand not just what the ETA is, but also how reliable it is.

### 2. Uncertainty-Aware Prediction

A major advanced part of this project is that ETA is not treated as a fixed value.

Included capabilities

interval-style output instead of only point estimate

confidence scoring based on model certainty / historical reliability

risk categorization such as:

Low Delay Risk

Medium Delay Risk

High Delay Risk

Why this matters

Two trips can have the same ETA but very different reliability. This feature helps communicate uncertainty in a usable way.

### 3. Slice-Level Evaluation

The system does not only evaluate overall performance. It also evaluates quality at more granular levels.

Slice dimensions

zone × hour

corridor × hour

time-of-day slices

potentially high-demand vs low-demand slices

Metrics used

MAE

RMSE

R²

error concentration across slices

Why this matters

A model can look good overall while performing poorly for specific zones or specific hours. Slice-level evaluation makes the system operationally more trustworthy.

### 4. Corridor Intelligence

A corridor is defined as:

Pickup Zone → Dropoff Zone

This is one of the strongest and most unique parts of the project.

Corridor-level analytics

For each corridor, the system computes:

average duration

average speed proxy

reliability score

volatility index

high-delay detection

corridor ranking

Why this matters

Most student projects stop at trip-level prediction. Corridor intelligence turns the project into a route-level analytics system and makes it much more valuable from an operations and product perspective.

### 5. Reliability and Volatility Analytics

The project does not only ask “how long does this trip usually take?” It also asks:

how consistent is this route?

how volatile is this corridor?

how often does delay occur here?

Included signals

reliability score

volatility index

high-delay corridor detection

unstable corridor identification

Why this matters

Average duration alone hides instability. Reliability and volatility make the analytics more realistic and useful.

### 6. Pricing Intelligence Engine

The pricing layer estimates a more transparent taxi fare using a pricing formula such as:

Base Fare + Distance Cost + Time Cost + Congestion Multiplier

Outputs

expected price

price band (min–max)

price spike indicator

explanatory price drivers

Why this matters

Most systems show one fare estimate without context. This project adds a more decision-friendly and interpretable pricing layer.

### 7. Price Band Estimation

Instead of returning only one number, the pricing engine produces a range.

Example logic

The price band can reflect:

congestion variability

corridor volatility

route-specific uncertainty

time-of-day demand variation

Why this matters

This aligns better with real-world ride pricing behavior, where exact fare can fluctuate.

### 8. “Why Expensive?” Explanation Layer

This feature improves pricing transparency by telling the user why the trip cost is elevated.

Example explanation factors

peak-hour demand

congestion multiplier

long-distance corridor

volatile route

historically delay-prone path

low-speed zone behavior

Why this matters

This is one of the biggest product differentiators. It converts the project from a raw estimator into an explainable decision-support system.

### 9. Price Spike Detection

The system identifies unusually expensive scenarios and flags them.

Use cases

abnormal congestion

demand-heavy hours

route-specific surge behavior

corridor volatility effects

Why this matters

This makes the pricing system more realistic and useful for comparative analysis.

### 10. What-If Simulation

The system allows scenario comparison for the same trip under different travel conditions.

Simulations supported

peak vs non-peak travel

same route at different times

different corridor behavior assumptions

pricing and ETA comparison across time windows

Why this matters

This is a decision-support feature, not just a prediction feature. It helps answer:

What happens if I leave later?

Will this trip be cheaper after peak time?

Which time window is more reliable?

### 11. Spatial Intelligence Dashboards

The project includes React-based interactive dashboards for spatial and operational analysis.

Dashboard modules

ETA Simulator Page

Pricing Simulator Page

Zone Intelligence Heatmap

Corridor Dashboard

Monitoring Dashboard

Heatmap metrics

demand

average duration

average price

volatility

speed / travel efficiency

Why this matters

The dashboards make the project product-like and allow analysis beyond raw model output.

### 12. Monitoring and Drift Awareness

This project goes beyond offline training and includes a monitoring perspective.

Monitoring features

model performance tracking

error by zone × hour

interval coverage tracking

reliability of prediction range

recent vs training distribution comparison

Drift awareness

The system can compare new behavior against historical/training patterns to identify:

feature drift

demand pattern drift

route behavior shifts

performance degradation

Why this matters

This is one of the clearest signals that the project is designed like a deployable ML system rather than a one-time notebook experiment.

### 13. Full-Stack System Design

This project is intentionally structured as a multi-layer system.

Stack

Frontend: React

Backend: FastAPI

Database: PostgreSQL

ML Layer: prediction, interval estimation, confidence scoring

Analytics Layer: corridor and zone metrics

Monitoring Layer: model metrics and drift reports

Why this matters

This shows software engineering depth, not just data science work.

## 🏗️ System Architecture

React Frontend  
↓  
FastAPI Backend  
↓  
Feature Engineering Layer  
↓  
ETA Prediction Engine + Interval + Confidence + Risk  
↓  
Pricing Intelligence Engine  
↓  
PostgreSQL Analytics Store  
↓  
Dashboards + Monitoring + Heatmaps  

## 🗂️ Project Structure

project/  
│  
├── backend/  
│   ├── app/  
│   │   ├── main.py  
│   │   ├── routers/  
│   │   ├── services/  
│   │   ├── repositories/  
│   │   ├── schemas/  
│   │   └── jobs/  
│   └── requirements.txt  
│  
├── frontend/  
│   ├── src/  
│   │   ├── pages/  
│   │   ├── components/  
│   │   └── api/  
│   └── package.json  
│  
├── notebooks/  
├── data/  
├── models/  
└── README.md  

## 🗄️ Database Tables

The PostgreSQL layer stores analytics-ready outputs for visualization and monitoring.

Main tables

zone_metrics_hourly

corridor_metrics_hourly

prediction_logs

model_metrics

drift_reports

Purpose

zone-level heatmap analytics

corridor performance analytics

prediction tracking

monitoring history

drift and health reporting

## 🔌 API Endpoints

Prediction APIs

POST /predict-eta
POST /estimate-price
Analytics APIs
GET /heatmap-data
-GET /zone-stats
GET /corridor-stats
Monitoring APIs
GET /model-metrics

These endpoints allow the frontend to serve real-time or simulated analytics through a clean service layer.

## 📊 Workflow Summary

1. Load raw taxi trip data  
2. Clean and validate records  
3. Engineer features such as time, distance, and corridor  
4. Perform exploratory analysis  
5. Train ETA prediction models  
6. Evaluate using MAE, RMSE, and R²  
7. Add prediction interval and confidence scoring  
8. Classify delay risk  
9. Build pricing intelligence layer  
10. Generate zone- and corridor-level aggregates  
11. Store results in PostgreSQL  
12. Serve outputs through FastAPI  
13. Visualize insights in React dashboards  
14. Monitor model quality and detect drift  

## ⚙️ Local Setup Guide

Prerequisites

Python 3.10+

Node.js 18+

PostgreSQL

#1. Clone Repository

git clone <your-repo-url>  
cd <repo-name>  

#2. Setup PostgreSQL

CREATE DATABASE taxi_ai;  

Set environment variable:

#Linux / Mac

export DATABASE_URL="postgresql+psycopg2://USER:PASSWORD@localhost:5432/taxi_ai"  

#Windows

set DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@localhost:5432/taxi_ai  

#3. Backend Setup

cd backend  
python -m venv .venv  

Activate environment:

#Mac / Linux

source .venv/bin/activate  

#Windows

.venv\Scripts\activate  

Install dependencies:

pip install -r requirements.txt  

Run backend server:

uvicorn app.main:app --reload  

#Backend:

http://127.0.0.1:8000  

Swagger Docs:

http://127.0.0.1:8000/docs  

4. Frontend Setup

cd frontend  
npm install  
npm run dev  

Frontend:

http://localhost:5173  

## 📈 Key Highlights

What makes this project stronger than a typical ML project?

-not limited to one prediction output

-adds uncertainty and confidence

-combines ETA + pricing + corridor analytics

-includes explainability and simulation

-has dashboard-based exploration

-includes monitoring and drift awareness

-built as a complete full-stack system

-What makes it relevant in the market?

-improves trust in ETA and price estimates

-makes pricing less opaque

-supports smarter rider/operator decisions

-exposes route-level intelligence

-bridges analytics, prediction, and product design

## 🚀 Future Scope

-real-time traffic integration

-quantile regression for improved interval estimation

-automated retraining pipeline

-model versioning

-multi-city deployment

-user authentication and saved routes

-route recommendation layer

-live monitoring alerts

## 👩‍💻 Authors

Surbhi Agarwal
Triveni Reddy  

## ⭐ Final Positioning

This project is not just a taxi trip duration predictor.

It is a Intelligence and Decision Support System that combines:

-ETA prediction

-uncertainty estimation

-pricing transparency

-corridor reliability analytics

-simulation

-monitoring

-dashboard-driven exploration

to fill a real gap between basic predictive modeling and practical, transparent mobility decision systems.
