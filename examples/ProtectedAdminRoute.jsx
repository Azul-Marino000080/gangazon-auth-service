import React from 'react';
import { Navigate } from 'react-router-dom';
import AuthService from '../services/AuthService';

/**
 * Componente para proteger rutas de administrador
 * Verifica autenticación y permisos
 */
const ProtectedAdminRoute = ({ children, requiredPermission = null }) => {
  const isAuthenticated = AuthService.isAuthenticated();
  
  if (!isAuthenticated) {
    // Si no está autenticado, redirigir a login
    return <Navigate to="/admin/login" replace />;
  }

  if (requiredPermission) {
    const hasPermission = AuthService.hasPermission(requiredPermission);
    
    if (!hasPermission) {
      // Si no tiene el permiso requerido, mostrar error 403
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <h1 style={{ fontSize: '48px', margin: '0 0 16px 0' }}>403</h1>
          <p style={{ fontSize: '18px', color: '#666' }}>
            No tienes permisos para acceder a esta sección
          </p>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedAdminRoute;
