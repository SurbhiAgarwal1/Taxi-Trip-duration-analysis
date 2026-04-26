import threading, queue, time
import logging
from retrain_pipeline import trigger_retraining

logger = logging.getLogger("api_requests")

# In-memory queue strictly for decoupled retraining
job_queue = queue.Queue()

def queue_worker_loop():
    logger.info("[Worker] Retraining Queue Thread initialized and waiting for jobs.")
    while True:
        job = job_queue.get() # Blocks until job arrives
        if job == "SHUTDOWN":
            logger.info("[Worker] Shutdown signal received. Exiting.")
            job_queue.task_done()
            break
            
        if job == "RETRAIN":
            logger.info("[Worker] Pulled RETRAIN job from queue. Triggering pipeline.")
            try:
                trigger_retraining()
            except Exception as e:
                logger.error(f"[Worker] Retraining failed completely: {e}")
            finally:
                logger.info("[Worker] Completed RETRAIN job.")
                
        job_queue.task_done()

# Start global worker
worker_thread = threading.Thread(target=queue_worker_loop, daemon=True)

def start_worker():
    if not worker_thread.is_alive():
        worker_thread.start()

def stop_worker():
    job_queue.put("SHUTDOWN")
    worker_thread.join(timeout=5)
