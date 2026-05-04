import sqlite3

def check_feedback():
    conn = sqlite3.connect('taxi_iq.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, actual_price, pickup_location, drop_location, rating FROM trip_feedback ORDER BY id DESC LIMIT 5")
    rows = cursor.fetchall()
    for row in rows:
        print(f"ID={row[0]}: Price={row[1]}, Pickup={row[2]}, Dropoff={row[3]}, Rating={row[4]}")
    conn.close()

if __name__ == "__main__":
    check_feedback()
