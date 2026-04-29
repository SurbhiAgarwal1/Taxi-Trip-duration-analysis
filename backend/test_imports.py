import sys
import os

# Add current dir to path
sys.path.append(os.getcwd())

try:
    from routers import predict, analytics, nearby, admin_ops, feedback, auth, traffic
    print("All routers imported successfully")
except Exception as e:
    print(f"Import failed: {e}")
    import traceback
    traceback.print_exc()
