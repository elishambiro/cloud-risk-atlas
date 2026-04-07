from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.logging import configure_logging, get_logger
from app.db.init_db import init_db
from app.api import scans, graph, findings, attack_paths, dashboard, aws

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Cloud Risk Atlas API")
    await init_db()
    yield
    logger.info("Shutting down Cloud Risk Atlas API")


app = FastAPI(
    title="Cloud Risk Atlas",
    description="AWS Security Posture Management Tool",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://frontend:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scans.router)
app.include_router(graph.router)
app.include_router(findings.router)
app.include_router(attack_paths.router)
app.include_router(dashboard.router)
app.include_router(aws.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "cloud-risk-atlas"}
