"""
URL configuration for inventario project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin  # type: ignore
from django.urls import path, include  # type: ignore
from dispositivos import views
from rest_framework.routers import DefaultRouter # type: ignore
from dispositivos.views import RolUserViewSet, HistorialViewSet, MovimientoViewSet
from dispositivos.views import dashboard_data
from dispositivos.views import validate_token , obtener_datos_protegidos , importar_dispositivos, keepalive, refresh_token_view
from dispositivos.views import subir_excel, descargar_excel


# Configuración del router para las vistas de usuario con ViewSet
router = DefaultRouter()
router.register(r'usuarios', RolUserViewSet)
router.register(r'historial', HistorialViewSet, basename='historial')
router.register(r'movimientos', MovimientoViewSet, basename='movimiento')

# Definición de las rutas URL
urlpatterns = [
    # Admin panel
    
    path('admin/', admin.site.urls),
    
    path('api/dashboard/', dashboard_data, name='dashboard-data'),

    # Autenticación y gestión de usuarios
    path('api/login/', views.login_user, name='login'),
    path('api/register/', views.register_user_view, name='register_user_view'),
    path('api/editusuarios/<int:user_id>/', views.edit_user_view, name='edit_user_view'),
    path('api/dusuarios/<int:user_id>/', views.get_user_detail_view, name='get_user_detail_view'),

    # Activación y desactivación de usuarios
    path('api/activarusuarios/<int:user_id>/', views.activate_user_view, name='activate_user_view'),
    path('api/deusuarios/<int:user_id>/', views.deactivate_user_view, name='deactivate_user_view'),

    # Gestión de contraseñas
    path('api/reset-password-request/', views.reset_password_request, name='reset_password_request'),
    path('api/reset-password/', views.reset_password, name='reset_password'),

    # Rutas para sedes y dispositivos
    path('api/sede/', views.get_sedes_view, name='get_sedes_view'),
    path('api/sedes/', views.sede_view, name='sede_view'),
    path('api/sedes/<int:sede_id>/', views.sede_detail_view, name='sede_detail_view'),
    
    
    # Rutas para dispositivos
    path('api/dispositivos/', views.dispositivo_view, name='dispositivo_view'),
    path('api/dispositivos/<int:dispositivo_id>/', views.dispositivo_detail_view, name='dispositivo_view'),
    path('api/movimientos/crear/', MovimientoViewSet.as_view({'post': 'crear_movimiento_completo'}), name='movimiento-crear'),
    path('api/dispositivos-disponibles/<int:sede_id>/', views.dispositivos_disponibles_para_movimiento, name='dispositivos-disponibles'),
    
    
# Rutas para servicios
    path('api/servicios/', views.servicios_view, name='servicios_view'),
    path('api/servicios/<int:servicio_id>/', views.servicio_detail_view, name='servicio_detail_view'),

    
    
    # Rutas para usuarios (detalles y lista)
    path('api/usuarios/', views.get_users_view, name='get_users_view'),
    path('api/usuarios/<int:user_id>/', views.user_detail_view, name='user_detail'),

    # Incluir las rutas generadas por el router
    path('api/', include(router.urls)),

    
    

    path('api/importar-dispositivos/', importar_dispositivos, name='importar_dispositivos'),
    path("importar-excel/", subir_excel, name="importar-excel"),
    path("exportar-excel/", descargar_excel, name="exportar-excel"),
    
    
    # URLs para posiciones
    path('api/posiciones/', views.PosicionListCreateView.as_view(), name='posicion-list-create'),
    path('api/posiciones/<str:id>/', views.PosicionRetrieveUpdateDestroyView.as_view(), name='posicion-retrieve-update-destroy'),
    path('api/posiciones/colores-pisos/', views.get_colores_pisos, name='colores-pisos'),
    
    
    

    path('auth/refresh/', refresh_token_view, name='refresh_token'),
    path('api/validate/', validate_token, name='validate_token'),
    path('auth/protected/', obtener_datos_protegidos, name='protected'),
    path('auth/keepalive/', keepalive, name='keepalive'),
    
    
    path('api/dispositivos-por-sede/', views.dispositivos_por_sede, name='dispositivos-por-sede'),
    path('api/movimientos/<int:pk>/confirmar/', MovimientoViewSet.as_view({'post': 'confirmar_movimiento'}), name='movimiento-confirmar'),
    
    
    #rutas para entrada y salida de dispositivos
    path('api/movimientos-por-sede/', views.movimientos_por_sede, name='movimientos-por-sede'),
]


