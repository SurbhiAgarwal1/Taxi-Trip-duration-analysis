import json
import os

def create_notebook(py_file, ipynb_file):
    with open(py_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    cells = []
    current_cell_source = []
    
    # Simple heuristic to split cells by comments that look like section headers
    for line in lines:
        if line.startswith("# ") and line.strip().isupper() and len(line) > 5:
            if current_cell_source:
                cells.append({
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": current_cell_source
                })
                current_cell_source = []
            current_cell_source.append(line)
        else:
            current_cell_source.append(line)
            
    if current_cell_source:
        cells.append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": current_cell_source
        })

    notebook = {
        "cells": cells,
        "metadata": {
            "language_info": {
                "name": "python"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 5
    }

    with open(ipynb_file, 'w', encoding='utf-8') as f:
        json.dump(notebook, f, indent=2)

create_notebook("backend/full_pipeline.py", "backend/full_pipeline.ipynb")
create_notebook("backend/train_clustering.py", "backend/train_clustering.ipynb")
create_notebook("backend/retrain_pipeline.py", "backend/retrain_pipeline.ipynb")
print("Conversion complete.")
