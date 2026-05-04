import os
from pathlib import Path

# Base directory is the project root
# If this file is in backend/utils/paths.py:
# .parent -> backend/utils/
# .parent.parent -> backend/
# .parent.parent.parent -> root/
# Base directory for the backend app
BACKEND_DIR = Path(__file__).resolve().parent.parent

def get_data_dir():
    """
    Returns the data directory. 
    Priority:
    1. /data (Render persistent disk)
    2. BACKEND_DIR/data (New location inside backend)
    """
    render_disk = Path("/data")
    if render_disk.exists() and (render_disk / "taxi_clean.parquet").exists():
        return render_disk
    
    # Check inside backend folder
    local_data = BACKEND_DIR / "data"
    if local_data.exists():
        return local_data

    return BACKEND_DIR / "data"

def get_model_dir():
    """
    Returns the models directory.
    Priority:
    1. /data/models_saved (Render persistent disk)
    2. BACKEND_DIR/models_saved (New location inside backend)
    """
    render_disk_models = Path("/data/models_saved")
    if render_disk_models.exists():
        return render_disk_models
    
    render_disk = Path("/data")
    if render_disk.exists() and (render_disk / "RandomForest.pkl").exists():
        return render_disk

    return BACKEND_DIR / "models_saved"
