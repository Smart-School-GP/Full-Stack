import uvicorn
import sys

if __name__ == "__main__":
    try:
        uvicorn.run(
            "app.main:app",
            host="127.0.0.1",
            port=8002,
            log_level="info"
        )
    except KeyboardInterrupt:
        # Exit silently without traceback
        sys.exit(0)
