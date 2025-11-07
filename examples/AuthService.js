// Servicio de autenticación para conectar con gangazon-auth-service
// Este servicio reemplaza Supabase Auth para administradores

const AUTH_SERVICE_URL = process.env.REACT_APP_AUTH_SERVICE_URL || 'http://localhost:4000/api';
const APPLICATION_CODE = 'SCANNER_ADMIN'; // o 'WEB_ADMIN' según la app

class AuthService {
  
  /**
   * Login de administrador
   */
  static async login(email, password) {
    try {
      const response = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          applicationCode: APPLICATION_CODE
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      // Guardar tokens y usuario
      localStorage.setItem('admin_access_token', data.data.accessToken);
      localStorage.setItem('admin_refresh_token', data.data.refreshToken);
      localStorage.setItem('admin_user', JSON.stringify(data.data.user));
      localStorage.setItem('admin_permissions', JSON.stringify(data.data.permissions));

      return data.data;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  /**
   * Logout
   */
  static async logout() {
    const accessToken = localStorage.getItem('admin_access_token');
    
    if (accessToken) {
      try {
        await fetch(`${AUTH_SERVICE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });
      } catch (error) {
        console.error('Error en logout:', error);
      }
    }

    // Limpiar localStorage
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_permissions');
  }

  /**
   * Obtener usuario actual
   */
  static getCurrentUser() {
    const userStr = localStorage.getItem('admin_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Obtener permisos del usuario
   */
  static getPermissions() {
    const permsStr = localStorage.getItem('admin_permissions');
    return permsStr ? JSON.parse(permsStr) : [];
  }

  /**
   * Verificar si el usuario tiene un permiso específico
   */
  static hasPermission(permission) {
    const permissions = this.getPermissions();
    
    // Si tiene super_admin, tiene todos los permisos
    if (permissions.includes('super_admin')) {
      return true;
    }
    
    return permissions.includes(permission);
  }

  /**
   * Verificar si está autenticado
   */
  static isAuthenticated() {
    const token = localStorage.getItem('admin_access_token');
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  /**
   * Obtener token de acceso
   */
  static getAccessToken() {
    return localStorage.getItem('admin_access_token');
  }

  /**
   * Refrescar token
   */
  static async refreshToken() {
    const refreshToken = localStorage.getItem('admin_refresh_token');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${AUTH_SERVICE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken,
          applicationCode: APPLICATION_CODE
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error('Token refresh failed');
      }

      // Actualizar tokens
      localStorage.setItem('admin_access_token', data.data.accessToken);
      localStorage.setItem('admin_refresh_token', data.data.refreshToken);

      return data.data.accessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Si falla el refresh, hacer logout
      this.logout();
      throw error;
    }
  }

  /**
   * Hacer petición autenticada
   */
  static async authenticatedFetch(url, options = {}) {
    const token = this.getAccessToken();
    
    if (!token) {
      throw new Error('No access token');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    // Si es 401, intentar refrescar el token
    if (response.status === 401) {
      try {
        const newToken = await this.refreshToken();
        
        // Reintentar la petición con el nuevo token
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
          }
        });
      } catch (error) {
        // Si falla el refresh, redirigir a login
        window.location.href = '/admin/login';
        throw error;
      }
    }

    return response;
  }
}

export default AuthService;
