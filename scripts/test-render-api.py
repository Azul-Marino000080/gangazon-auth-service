# Test de conexión a la API desplegada en Render

import requests
import json

# URL base de tu API en Render (cambiar por la tuya)
BASE_URL = "https://gangazon-auth-service.onrender.com"

def test_health():
    """Test del endpoint de health check"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_register():
    """Test de registro de usuario"""
    print("\n🔍 Testing user registration...")
    
    user_data = {
        "email": "test@example.com",
        "password": "Test123!@#",
        "firstName": "Test",
        "lastName": "User"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/register", 
            json=user_data,
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code in [201, 409]  # 201 = created, 409 = already exists
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_login():
    """Test de login"""
    print("\n🔍 Testing login...")
    
    login_data = {
        "email": "test@example.com",
        "password": "Test123!@#"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login", 
            json=login_data,
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            return response.json().get('tokens', {}).get('accessToken')
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_protected_endpoint(token):
    """Test de endpoint protegido"""
    print("\n🔍 Testing protected endpoint...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/users/me", 
            headers=headers,
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("🚀 Testing Gangazon Auth Service on Render\n")
    print(f"Base URL: {BASE_URL}")
    print("=" * 50)
    
    # Test health
    if not test_health():
        print("❌ Health check failed. Service may not be running.")
        return
    
    print("✅ Health check passed!")
    
    # Test register
    if not test_register():
        print("❌ Registration test failed.")
        return
    
    print("✅ Registration test passed!")
    
    # Test login
    token = test_login()
    if not token:
        print("❌ Login test failed.")
        return
    
    print("✅ Login test passed!")
    
    # Test protected endpoint
    if not test_protected_endpoint(token):
        print("❌ Protected endpoint test failed.")
        return
    
    print("✅ Protected endpoint test passed!")
    
    print("\n🎉 All tests passed! Your API is working correctly on Render.")

if __name__ == "__main__":
    main()