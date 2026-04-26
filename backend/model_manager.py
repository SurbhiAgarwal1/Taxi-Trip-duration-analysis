class ModelManager:
    def __init__(self):
        from config import MODEL_DIR
        self.models_loaded = (MODEL_DIR / "RandomForest.pkl").exists()
        self.current_version = "v1"

    def reload_models(self):
        from config import MODEL_DIR
        self.models_loaded = (MODEL_DIR / "RandomForest.pkl").exists()

model_manager = ModelManager()
