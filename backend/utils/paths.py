import os
from pathlib import Path

# Base directory is the project root
# If this file is in backend/utils/paths.py:
# .parent -> backend/utils/
# .parent.parent -> backend/
# .parent.parent.parent -> root/
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

def get_data_dir():
    """
    Returns the data directory. 
    Priority:
    1. /data (Render persistent disk)
    2. PROJECT_ROOT/data (Local/Dev)
    """
    render_disk = Path("/data")
    if render_disk.exists() and (render_disk / "taxi_clean.parquet").exists():
        return render_disk
    
    return PROJECT_ROOT / "data"

def get_model_dir():
    """
    Returns the models directory.
    Priority:
    1. /data/models_saved (Render persistent disk)
    2. PROJECT_ROOT/models_saved (Local/Dev)
    """
    render_disk_models = Path("/data/models_saved")
    if render_disk_models.exists():
        return render_disk_models
    
    # Check if models are in /data directly
    render_disk = Path("/data")
    if render_disk.exists() and (render_disk / "RandomForest.pkl").exists():
        return render_disk

    return PROJECT_ROOT / "models_saved"
