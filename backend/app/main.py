from fastapi import HTTPException
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.routers import auth, admin, datasets, preprocessing, experiments, metadata, privacy_consent, analysis


from app.database import init_db

app = FastAPI(title="AutoML Platform v2", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    sanitized = []
    for error in errors:
        e = dict(error)
        if "ctx" in e:
            e["ctx"] = {k: str(v) for k, v in e["ctx"].items()}
        sanitized.append(e)
    first = sanitized[0] if sanitized else {}
    field = " → ".join(str(loc) for loc in first.get("loc", []))
    return JSONResponse(status_code=422, content={
        "status": "error",
        "message": f"Validasi gagal pada field '{field}': {first.get('msg', '')}",
        "detail": sanitized,
    })


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={
        "status": "error",
        "message": "Terjadi kesalahan internal pada server",
        "detail": {},
    })


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={
        "status": "error",
        "message": exc.detail,
        "detail": {},
    })


@app.on_event("startup")
def on_startup():
    init_db()

# Router didaftarkan di sini setelah dibuat
# from app.routers import auth, admin, datasets, preprocessing, experiments, results
# app.include_router(auth.router, prefix="/api/v2/auth", tags=["Auth"])


app.include_router(auth.router,     prefix="/api/v2/auth",     tags=["Auth"])
app.include_router(admin.router,    prefix="/api/v2/admin",    tags=["Admin"])
app.include_router(
    datasets.router, prefix="/api/v2/datasets", tags=["Datasets"])
app.include_router(preprocessing.router,
                   prefix="/api/v2/preprocessing", tags=["Preprocessing"])
app.include_router(experiments.router,
                   prefix="/api/v2/experiments",   tags=["Experiments"])
app.include_router(
    metadata.router, prefix="/api/v2/metadata", tags=["Metadata"])
app.include_router(privacy_consent.router,
                   prefix="/api/v2/consent", tags=["Privacy Consent"])
app.include_router(analysis.router, prefix="/api/v2/analysis",
                   tags=["LLM Analysis"])
