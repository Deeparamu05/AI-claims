import requests

url = "http://127.0.0.1:8000/token"
headers = {
    "Origin": "http://localhost:5173",
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type"
}

try:
    response = requests.options(url, headers=headers)
    print(f"Status: {response.status_code}")
    print("Headers:")
    for k, v in response.headers.items():
        print(f"  {k}: {v}")
except Exception as e:
    print(f"Error: {e}")
