import uvicorn
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from pipeline import run_pipeline

app = FastAPI(title="Multi-Agent Research System API")

# Configure CORS so your React frontend can communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins= ["https://your-frontend-app.vercel.app"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/research")
async def research_endpoint(topic: str = Query(..., description="The research topic")):
    """
    Triggers your exact pipeline execution without modifying its core code.
    Using 'run_in_threadpool' ensures the synchronous execution doesn't block the API.
    """
    try:
        # Runs your exact run_pipeline function safely in a separate thread
        result_state = await run_in_threadpool(run_pipeline, topic)
        
        # Returns the final state dictionary containing 'report' and 'feedback'
        return {
            "status": "success",
            "report": result_state.get("report"),
            "feedback": result_state.get("feedback")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    # Start the local server on http://127.0.0.1:8000
    uvicorn.run("backend.fast_api:app", host="127.0.0.1", port=8000, reload=True)